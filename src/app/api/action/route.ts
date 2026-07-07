// Special actions that involve multi-table side effects:
//   - approve-purchase-requisition
//   - approve-purchase  (marks purchase APPROVED — stock hits happen at PurchaseReceive approval)
//   - approve-purchase-receive  (creates ItemSerials + StockTransactions + updates purchase status)
//   - create-purchase-receive   (auto-number generation wrapper)
//   - receive-transfer  (creates StockTransactions for receiving entity)
//   - receive-internal-transfer (creates InternalReceive + moves ItemSerials + StockTransactions)
//   - approve-adjustment (creates StockTransactions)
//   - deliver-sales      (creates SalesItem serials + StockTransactions + marks ItemSerials SOLD)
//   - sales-return       (returns serials back to IN_STOCK)
//   - sales-refund
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Generate per-unit barcode: yymmdd + 7-digit sequential (random suffix)
function generateBarcode(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
  return `${yy}${mm}${dd}${random}`
}

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
        // Mark purchase as APPROVED. Stock will be hit when a PurchaseReceive
        // is approved (separate action). This action no longer creates ItemSerials
        // or StockTransactions — it just flips the purchase status to APPROVED so
        // the receiving team can begin partial receives.
        const purchase = await db.purchase.findUnique({
          where: { id },
          include: { items: true },
        })
        if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const updated = await db.purchase.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
          include: { entity: true, supplier: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'send-back-purchase': {
        // Mark purchase as SENT_BACK so the buyer can edit & re-submit it from
        // the Purchase page. Re-submitting (editing in PurchaseEntryPage) flips
        // the status back to SUBMITTED and the purchase re-enters the approval queue.
        const purchase = await db.purchase.findUnique({ where: { id } })
        if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const updated = await db.purchase.update({
          where: { id },
          data: {
            status: 'SENT_BACK',
            approvedBy: null,
            approvedAt: null,
          },
          include: { entity: true, supplier: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'create-purchase-receive': {
        // Frontend sends: extra.items = [{ purchaseItemId, itemId, quantity, serials }]
        // 1 barcode per receive batch (not per unit)
        // Serials: from product body, optional, no qty connection
        const purchase = await db.purchase.findUnique({
          where: { id },
          include: { entity: true, items: { include: { item: true } } },
        })
        if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
        if (purchase.status !== 'APPROVED') {
          return NextResponse.json({ error: 'Purchase must be APPROVED before receiving' }, { status: 400 })
        }

        const itemsPayload = Array.isArray(extra?.items) ? extra.items : []
        if (itemsPayload.length === 0) {
          return NextResponse.json({ error: 'No items to receive' }, { status: 400 })
        }

        // Check for duplicate serials (within this receive + against DB)
        for (const it of itemsPayload) {
          if (it.serials && it.serials.trim()) {
            const sns = it.serials.split(',').map((s: string) => s.trim()).filter(Boolean)
            // Check duplicates within this item's serials
            const unique = new Set(sns)
            if (unique.size !== sns.length) {
              return NextResponse.json({ error: `Duplicate serial numbers detected for an item. Each serial must be unique.` }, { status: 400 })
            }
            // Check against existing DB
            for (const sn of sns) {
              const existing = await db.itemSerial.findUnique({
                where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
              })
              if (existing) {
                return NextResponse.json({ error: `Serial number "${sn}" already exists in the system.` }, { status: 400 })
              }
            }
          }
        }

        // Generate receiveNo: PRC-yymmdd-timestamp
        const now = new Date()
        const yy = String(now.getFullYear()).slice(-2)
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const ts = Date.now().toString().slice(-6)
        const receiveNo = `PRC-${yy}${mm}${dd}-${ts}`

        // Build line items: 1 barcode per batch + optional serials
        const lineItems = itemsPayload
          .filter((it: any) => it.quantity > 0)
          .map((it: any) => ({
            purchaseItemId: it.purchaseItemId,
            itemId: it.itemId,
            quantity: it.quantity,
            barcodes: generateBarcode(),  // 1 barcode per receive batch
            serials: it.serials || null,
          }))

        if (lineItems.length === 0) {
          return NextResponse.json({ error: 'No items to receive' }, { status: 400 })
        }

        const receive = await db.purchaseReceive.create({
          data: {
            receiveNo,
            purchaseId: purchase.id,
            entityId: purchase.entityId,
            receiveDate: new Date(),
            status: 'PENDING',
            notes: extra?.notes || null,
            items: { create: lineItems },
          },
          include: {
            purchase: { select: { id: true, purchaseNo: true } },
            entity: { select: { id: true, name: true } },
            items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
          },
        })
        return NextResponse.json(receive)
      }

      case 'approve-purchase-receive': {
        // 1. Mark PurchaseReceive as APPROVED
        // 2. For each line item: create ItemSerial records (one per barcode / serial)
        // 3. Create a positive StockTransaction (PURCHASE) for the entity
        // 4. Re-evaluate purchase status: if all purchase items are fully received,
        //    mark as RECEIVED; otherwise mark as PARTIAL_RECEIVED.
        const receive = await db.purchaseReceive.findUnique({
          where: { id },
          include: { purchase: { include: { items: true } }, items: true },
        })
        if (!receive) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (receive.status === 'APPROVED') {
          return NextResponse.json({ error: 'Already approved' }, { status: 400 })
        }

        for (const it of receive.items) {
          // 1 barcode per batch
          const barcode = it.barcodes || generateBarcode()
          // Serials from product body (optional, may be 0, 1, or many — no qty connection)
          const serials: string[] = it.serials ? it.serials.split(',').map((s) => s.trim()).filter(Boolean) : []

          if (serials.length > 0) {
            // Create ItemSerial for each user-provided serial
            for (const sn of serials) {
              const existing = await db.itemSerial.findUnique({
                where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
              })
              if (!existing) {
                await db.itemSerial.create({
                  data: {
                    itemId: it.itemId,
                    serialNumber: sn,
                    barcode,
                    entityId: receive.entityId,
                    status: 'IN_STOCK',
                    purchaseId: receive.purchaseId,
                  },
                })
              }
            }
          } else {
            // No serials — create 1 ItemSerial with barcode as identifier
            const serialNumber = `BC-${barcode}`
            const existing = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber } },
            })
            if (!existing) {
              await db.itemSerial.create({
                data: {
                  itemId: it.itemId,
                  serialNumber,
                  barcode,
                  entityId: receive.entityId,
                  status: 'IN_STOCK',
                  purchaseId: receive.purchaseId,
                },
              })
            }
          }

          // Stock transaction (positive qty)
          await db.stockTransaction.create({
            data: {
              itemId: it.itemId,
              entityId: receive.entityId,
              type: 'PURCHASE',
              quantity: it.quantity,
              refType: 'PURCHASE',
              refId: receive.purchaseId,
              serials: it.serials,
            },
          })
        }

        // Update receive status
        await db.purchaseReceive.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
        })

        // Re-evaluate purchase status
        const allReceives = await db.purchaseReceive.findMany({
          where: { purchaseId: receive.purchaseId, status: 'APPROVED' },
          include: { items: true },
        })
        const receivedByItemId = new Map<string, number>()
        for (const r of allReceives) {
          for (const it of r.items) {
            receivedByItemId.set(it.itemId, (receivedByItemId.get(it.itemId) || 0) + it.quantity)
          }
        }
        const fullyReceived = receive.purchase.items.every(
          (pi) => (receivedByItemId.get(pi.itemId) || 0) >= pi.quantity,
        )
        await db.purchase.update({
          where: { id: receive.purchaseId },
          data: { status: fullyReceived ? 'RECEIVED' : 'PARTIAL_RECEIVED' },
        })

        const result = await db.purchaseReceive.findUnique({
          where: { id },
          include: {
            purchase: { select: { id: true, purchaseNo: true, status: true } },
            entity: { select: { id: true, name: true } },
            items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
          },
        })
        return NextResponse.json(result)
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

      case 'receive-internal-transfer': {
        // 1. Create InternalReceive record with items (barcodes + serials from transfer)
        // 2. Mark InternalTransfer as RECEIVED
        // 3. Move ItemSerials to receiving entity
        // 4. Create StockTransactions (TRANSFER_OUT from source, TRANSFER_IN to destination)
        const t = await db.internalTransfer.findUnique({
          where: { id },
          include: { items: { include: { item: true } } },
        })
        if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (t.status === 'RECEIVED') {
          return NextResponse.json({ error: 'Already received' }, { status: 400 })
        }

        // Build the receive line items + lookup barcodes from ItemSerial records
        const receiveItems: any[] = []
        for (const it of t.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((s: string) => s.trim()).filter(Boolean) : []
          // For serial-tracked items, look up barcodes from existing ItemSerials
          const barcodes: string[] = []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is?.barcode) barcodes.push(is.barcode)
          }
          receiveItems.push({
            itemId: it.itemId,
            quantity: it.quantity,
            barcodes: barcodes.length > 0 ? barcodes.join(',') : null,
            serials: it.serials || null,
          })
        }

        // Generate receiveNo: IR-yymmdd-timestamp
        const now = new Date()
        const yy = String(now.getFullYear()).slice(-2)
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const ts = Date.now().toString().slice(-6)
        const receiveNo = `IR-${yy}${mm}${dd}-${ts}`

        // Create the InternalReceive record
        const receive = await db.internalReceive.create({
          data: {
            receiveNo,
            transferId: t.id,
            entityId: t.toEntityId,
            receiveDate: new Date(),
            status: 'RECEIVED',
            notes: extra?.notes || null,
            items: { create: receiveItems },
          },
          include: {
            transfer: { select: { id: true, transferNo: true } },
            entity: { select: { id: true, name: true } },
            items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
          },
        })

        // Move ItemSerials + create stock transactions
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
            data: {
              itemId: it.itemId,
              entityId: t.fromEntityId,
              type: 'TRANSFER_OUT',
              quantity: -Math.abs(it.quantity),
              refType: 'TRANSFER',
              refId: t.id,
              serials: it.serials,
            },
          })
          // IN at destination
          await db.stockTransaction.create({
            data: {
              itemId: it.itemId,
              entityId: t.toEntityId,
              type: 'TRANSFER_IN',
              quantity: Math.abs(it.quantity),
              refType: 'TRANSFER',
              refId: t.id,
              serials: it.serials,
            },
          })
        }

        // Mark transfer as RECEIVED
        await db.internalTransfer.update({
          where: { id: t.id },
          data: { status: 'RECEIVED', receivedAt: new Date() },
        })

        return NextResponse.json(receive)
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
