// Special actions that involve multi-table side effects:
//   - approve-purchase-requisition
//   - approve-purchase  (creates ItemSerials + StockTransactions for each serial)
//   - receive-transfer  (creates StockTransactions for receiving entity)
//   - approve-adjustment (creates StockTransactions)
//   - deliver-sales      (creates SalesItem serials + StockTransactions + marks ItemSerials SOLD)
//   - sales-return       (returns serials back to IN_STOCK)
//   - sales-refund
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, id, extra } = body
  try {
    switch (action) {
      case 'approve-purchase-requisition': {
        const req = await db.purchaseRequisition.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
          include: { entity: true, items: { include: { item: true } } },
        })
        return NextResponse.json(req)
      }
      case 'reject-purchase-requisition': {
        const req = await db.purchaseRequisition.update({
          where: { id },
          data: { status: 'REJECTED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
        })
        return NextResponse.json(req)
      }
      case 'approve-purchase': {
        // Mark purchase as APPROVED/RECEIVED, generate ItemSerials for each serial on items,
        // increment StockTransaction for the entity.
        const purchase = await db.purchase.findUnique({
          where: { id },
          include: { items: true },
        })
        if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        for (const it of purchase.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((s: string) => s.trim()).filter(Boolean) : []
          // If item has serials, create ItemSerial entries
          if (serials.length > 0) {
            for (const sn of serials) {
              const existing = await db.itemSerial.findUnique({
                where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
              })
              if (!existing) {
                await db.itemSerial.create({
                  data: {
                    itemId: it.itemId,
                    serialNumber: sn,
                    entityId: purchase.entityId,
                    status: 'IN_STOCK',
                    purchaseId: purchase.id,
                  },
                })
              } else {
                await db.itemSerial.update({
                  where: { id: existing.id },
                  data: { entityId: purchase.entityId, status: 'IN_STOCK', purchaseId: purchase.id },
                })
              }
            }
          }
          // Stock transaction (positive)
          await db.stockTransaction.create({
            data: {
              itemId: it.itemId,
              entityId: purchase.entityId,
              type: 'PURCHASE',
              quantity: it.quantity,
              refType: 'PURCHASE',
              refId: purchase.id,
              serials: it.serials,
            },
          })
        }
        const updated = await db.purchase.update({
          where: { id },
          data: { status: 'RECEIVED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
          include: { entity: true, supplier: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'receive-transfer': {
        // Mark InternalTransfer as RECEIVED, move ItemSerials to toEntityId, create STOCK TX
        const t = await db.internalTransfer.findUnique({
          where: { id },
          include: { items: true },
        })
        if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        for (const it of t.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((s: string) => s.trim()).filter(Boolean) : []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is) {
              await db.itemSerial.update({ where: { id: is.id }, data: { entityId: t.toEntityId } })
            }
          }
          // OUT from source
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: t.fromEntityId, type: 'TRANSFER_OUT', quantity: -Math.abs(it.quantity), refType: 'TRANSFER', refId: t.id, serials: it.serials },
          })
          // IN at destination
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: t.toEntityId, type: 'TRANSFER_IN', quantity: Math.abs(it.quantity), refType: 'TRANSFER', refId: t.id, serials: it.serials },
          })
        }
        const updated = await db.internalTransfer.update({
          where: { id },
          data: { status: 'RECEIVED', receivedAt: new Date() },
          include: { fromEntity: true, toEntity: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'approve-adjustment': {
        const adj = await db.adjustment.findUnique({
          where: { id },
          include: { items: true },
        })
        if (!adj) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        const sign = adj.type === 'INCREASE' ? 1 : -1
        for (const it of adj.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((s: string) => s.trim()).filter(Boolean) : []
          if (adj.type === 'DECREASE') {
            for (const sn of serials) {
              const is = await db.itemSerial.findUnique({
                where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
              })
              if (is) {
                await db.itemSerial.update({ where: { id: is.id }, data: { status: 'DAMAGED' } })
              }
            }
          }
          await db.stockTransaction.create({
            data: {
              itemId: it.itemId,
              entityId: adj.entityId,
              type: adj.type === 'INCREASE' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
              quantity: sign * Math.abs(it.quantity),
              refType: 'ADJUSTMENT',
              refId: adj.id,
              serials: it.serials,
            },
          })
        }
        const updated = await db.adjustment.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
          include: { entity: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'reject-adjustment': {
        const adj = await db.adjustment.update({ where: { id }, data: { status: 'REJECTED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() } })
        return NextResponse.json(adj)
      }

      case 'deliver-sales': {
        // Mark sales as DELIVERED, mark ItemSerials as SOLD, create negative StockTransactions
        const s = await db.sales.findUnique({ where: { id }, include: { items: true } })
        if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        for (const it of s.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((x: string) => x.trim()).filter(Boolean) : []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is) {
              await db.itemSerial.update({ where: { id: is.id }, data: { status: 'SOLD', saleId: s.id } })
            }
          }
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: s.entityId, type: 'SALE', quantity: -Math.abs(it.quantity), refType: 'SALES', refId: s.id, serials: it.serials },
          })
        }
        const updated = await db.sales.update({
          where: { id },
          data: { deliveryStatus: 'DELIVERED', status: 'DELIVERED' },
          include: { entity: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'sales-return': {
        // For each return item, mark serials IN_STOCK again
        const r = await db.salesReturn.findUnique({ where: { id }, include: { items: true } })
        if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        const sale = await db.sales.findUnique({ where: { id: r.salesId } })
        for (const it of r.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((x: string) => x.trim()).filter(Boolean) : []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is) {
              await db.itemSerial.update({ where: { id: is.id }, data: { status: 'IN_STOCK', saleId: null, entityId: sale?.entityId || is.entityId } })
            }
          }
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: sale?.entityId || '', type: 'RETURN_IN', quantity: Math.abs(it.quantity), refType: 'SALES_RETURN', refId: r.id, serials: it.serials },
          })
        }
        const updated = await db.salesReturn.update({
          where: { id },
          data: {},
          include: { sales: true, items: { include: { item: true } }, refunds: true },
        })
        return NextResponse.json(updated)
      }

      case 'purchase-return': {
        // For each return item, mark serials DAMAGED or move them; reduce stock
        const r = await db.purchaseReturn.findUnique({ where: { id }, include: { items: true, purchase: true } })
        if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        for (const it of r.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((x: string) => x.trim()).filter(Boolean) : []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is) {
              await db.itemSerial.update({ where: { id: is.id }, data: { status: 'RETURNED' } })
            }
          }
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: r.purchase.entityId, type: 'RETURN_OUT', quantity: -Math.abs(it.quantity), refType: 'PURCHASE_RETURN', refId: r.id, serials: it.serials },
          })
        }
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: any) {
    console.error('action error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
