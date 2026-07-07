// Reports API — OPTIMIZED (batch queries, no N+1)
// GET /api/reports?type=stock-summary        -> per item/entity stock summary
// GET /api/reports?type=stock-ledger&itemId=  -> stock ledger for item
// GET /api/reports?type=purchase-summary     -> purchase totals per supplier/date
// GET /api/reports?type=sales-summary        -> sales totals per date/entity
// GET /api/reports?type=accounts-summary     -> expense vs receive summary
// GET /api/reports?type=serial-status        -> all item serials and their statuses
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  try {
    switch (type) {
      case 'stock-summary': {
        // Single batch queries instead of nested loops
        const [entities, items] = await Promise.all([
          db.entity.findMany(),
          db.item.findMany({ include: { category: { include: { parent: true } }, uom: true } }),
        ])
        // Single groupBy for ALL transactions grouped by (entityId, itemId)
        const balancesRaw = await db.stockTransaction.groupBy({
          by: ['entityId', 'itemId'],
          _sum: { quantity: true },
        })
        const balanceMap: Record<string, number> = {}
        for (const b of balancesRaw) {
          balanceMap[`${b.entityId}|${b.itemId}`] = b._sum.quantity || 0
        }
        const rows = []
        for (const e of entities) {
          for (const item of items) {
            const balance = balanceMap[`${e.id}|${item.id}`] || 0
            if (balance !== 0) {
              rows.push({ entity: e, item, balance })
            }
          }
        }
        return NextResponse.json(rows)
      }

      case 'stock-ledger': {
        const itemId = searchParams.get('itemId')!
        const entityId = searchParams.get('entityId') || undefined
        const where: any = { itemId }
        if (entityId) where.entityId = entityId
        const txs = await db.stockTransaction.findMany({
          where,
          include: { item: true, entity: true },
          orderBy: { createdAt: 'asc' },
        })
        let running = 0
        const rows = txs.map((t) => {
          running += t.quantity
          return { ...t, running }
        })
        return NextResponse.json(rows)
      }

      case 'purchase-summary': {
        const purchases = await db.purchase.findMany({
          include: { supplier: true, entity: true, items: true },
        })
        const rows = purchases.map((p) => ({
          purchaseNo: p.purchaseNo,
          date: p.purchaseDate,
          entity: p.entity,
          supplier: p.supplier,
          total: p.totalAmount,
          status: p.status,
          itemCount: p.items.length,
        }))
        return NextResponse.json(rows)
      }

      // ===== PURCHASE REPORTS (enhanced with date filter + report types) =====

      case 'purchase-report': {
        // Query params:
        //   reportType: details | summary | supplier-wise | purchase-for |
        //               item-wise | category-wise | sub-category-wise
        //   range: daily | monthly | yearly | custom
        //   from: ISO date string (for custom range)
        //   to: ISO date string (for custom range)
        const reportType = searchParams.get('reportType') || 'details'
        const range = searchParams.get('range') || 'monthly'
        const from = searchParams.get('from')
        const to = searchParams.get('to')

        // Build date filter based on range
        const dateWhere: any = {}
        const now = new Date()
        if (range === 'daily') {
          // Today only
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          dateWhere.gte = start
        } else if (range === 'monthly') {
          // Current month
          const start = new Date(now.getFullYear(), now.getMonth(), 1)
          dateWhere.gte = start
        } else if (range === 'yearly') {
          // Current year
          const start = new Date(now.getFullYear(), 0, 1)
          dateWhere.gte = start
        } else if (range === 'custom' && from && to) {
          dateWhere.gte = new Date(from)
          dateWhere.lte = new Date(to + 'T23:59:59.999Z')
        }

        const purchases = await db.purchase.findMany({
          where: Object.keys(dateWhere).length > 0 ? { purchaseDate: dateWhere } : {},
          include: {
            supplier: true,
            entity: true,
            items: {
              include: {
                item: {
                  include: {
                    category: { include: { parent: true } },
                    uom: true,
                  },
                },
              },
            },
          },
          orderBy: { purchaseDate: 'desc' },
        })

        if (reportType === 'details') {
          // Flat list: one row per item per purchase
          // Columns: Sl, Purchase Date, Purchase For, Supplier, Item Name,
          //          Model No, Size, Barcode, Serial Number, Qty, UoM,
          //          Unit Price, Total
          const detailRows: any[] = []
          let sl = 1
          for (const p of purchases) {
            for (const it of p.items) {
              const item = it.item
              // Parse barcodes/serials from the PurchaseItem (if stored)
              // For purchases, serials may not be set at creation time —
              // they come from PurchaseReceive. So we show what's available.
              detailRows.push({
                sl: sl++,
                purchaseNo: p.purchaseNo,
                purchaseDate: p.purchaseDate,
                purchaseFor: p.entity?.name || '—',
                supplier: p.supplier?.name || '—',
                itemName: item?.name || '—',
                modelNo: item?.itemCode || '—',
                size: item?.description || '—',
                barcode: '', // barcode comes at receive time
                serialNumber: it.serials || '—',
                qty: it.quantity,
                uom: item?.uom?.shortCode || '—',
                unitPrice: it.unitPrice,
                total: it.totalPrice,
              })
            }
          }
          return NextResponse.json({
            reportType: 'details',
            range,
            from: dateWhere.gte,
            to: dateWhere.lte,
            rows: detailRows,
            totalQty: detailRows.reduce((s, r) => s + r.qty, 0),
            totalAmount: detailRows.reduce((s, r) => s + r.total, 0),
          })
        }

        if (reportType === 'summary') {
          // One row per purchase
          const summaryRows = purchases.map((p, i) => ({
            sl: i + 1,
            purchaseNo: p.purchaseNo,
            purchaseDate: p.purchaseDate,
            purchaseFor: p.entity?.name || '—',
            supplier: p.supplier?.name || '—',
            itemCount: p.items.length,
            totalQty: p.items.reduce((s: number, it: any) => s + it.quantity, 0),
            totalAmount: p.totalAmount,
            status: p.status,
          }))
          return NextResponse.json({
            reportType: 'summary',
            range,
            from: dateWhere.gte,
            to: dateWhere.lte,
            rows: summaryRows,
            totalAmount: summaryRows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        if (reportType === 'supplier-wise') {
          // Group by supplier
          const bySupplier: Record<string, any> = {}
          for (const p of purchases) {
            const key = p.supplier?.name || 'Unknown'
            if (!bySupplier[key]) {
              bySupplier[key] = {
                supplier: key,
                purchaseCount: 0,
                totalQty: 0,
                totalAmount: 0,
              }
            }
            bySupplier[key].purchaseCount++
            bySupplier[key].totalQty += p.items.reduce((s: number, it: any) => s + it.quantity, 0)
            bySupplier[key].totalAmount += p.totalAmount
          }
          const supplierRows = Object.values(bySupplier).map((r: any, i: number) => ({
            sl: i + 1,
            ...r,
          }))
          return NextResponse.json({
            reportType: 'supplier-wise',
            range,
            from: dateWhere.gte,
            to: dateWhere.lte,
            rows: supplierRows,
            totalAmount: supplierRows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        if (reportType === 'purchase-for') {
          // Group by entity (Purchase For)
          const byEntity: Record<string, any> = {}
          for (const p of purchases) {
            const key = p.entity?.name || 'Unknown'
            if (!byEntity[key]) {
              byEntity[key] = {
                purchaseFor: key,
                purchaseCount: 0,
                totalQty: 0,
                totalAmount: 0,
              }
            }
            byEntity[key].purchaseCount++
            byEntity[key].totalQty += p.items.reduce((s: number, it: any) => s + it.quantity, 0)
            byEntity[key].totalAmount += p.totalAmount
          }
          const entityRows = Object.values(byEntity).map((r: any, i: number) => ({
            sl: i + 1,
            ...r,
          }))
          return NextResponse.json({
            reportType: 'purchase-for',
            range,
            from: dateWhere.gte,
            to: dateWhere.lte,
            rows: entityRows,
            totalAmount: entityRows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        if (reportType === 'item-wise') {
          // Group by item
          const byItem: Record<string, any> = {}
          for (const p of purchases) {
            for (const it of p.items) {
              const key = it.item?.name || 'Unknown'
              if (!byItem[key]) {
                byItem[key] = {
                  itemName: key,
                  modelNo: it.item?.itemCode || '—',
                  uom: it.item?.uom?.shortCode || '—',
                  qty: 0,
                  totalAmount: 0,
                  purchaseCount: 0,
                }
              }
              byItem[key].qty += it.quantity
              byItem[key].totalAmount += it.totalPrice
              byItem[key].purchaseCount++
            }
          }
          const itemRows = Object.values(byItem).map((r: any, i: number) => ({
            sl: i + 1,
            ...r,
          }))
          return NextResponse.json({
            reportType: 'item-wise',
            range,
            from: dateWhere.gte,
            to: dateWhere.lte,
            rows: itemRows,
            totalQty: itemRows.reduce((s, r) => s + r.qty, 0),
            totalAmount: itemRows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        if (reportType === 'category-wise') {
          // Group by category (top-level)
          const byCategory: Record<string, any> = {}
          for (const p of purchases) {
            for (const it of p.items) {
              const cat = it.item?.category
              // Top-level category = category's parent or itself if no parent
              const topCat = cat?.parent?.name || cat?.name || 'Uncategorized'
              if (!byCategory[topCat]) {
                byCategory[topCat] = {
                  category: topCat,
                  qty: 0,
                  totalAmount: 0,
                  itemCount: 0,
                }
              }
              byCategory[topCat].qty += it.quantity
              byCategory[topCat].totalAmount += it.totalPrice
              byCategory[topCat].itemCount++
            }
          }
          const catRows = Object.values(byCategory).map((r: any, i: number) => ({
            sl: i + 1,
            ...r,
          }))
          return NextResponse.json({
            reportType: 'category-wise',
            range,
            from: dateWhere.gte,
            to: dateWhere.lte,
            rows: catRows,
            totalAmount: catRows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        if (reportType === 'sub-category-wise') {
          // Group by sub-category (the category itself, including its parent)
          const bySubCat: Record<string, any> = {}
          for (const p of purchases) {
            for (const it of p.items) {
              const cat = it.item?.category
              const subCatName = cat?.name || 'Uncategorized'
              const parentName = cat?.parent?.name || '—'
              const key = `${parentName} > ${subCatName}`
              if (!bySubCat[key]) {
                bySubCat[key] = {
                  category: parentName,
                  subCategory: subCatName,
                  qty: 0,
                  totalAmount: 0,
                  itemCount: 0,
                }
              }
              bySubCat[key].qty += it.quantity
              bySubCat[key].totalAmount += it.totalPrice
              bySubCat[key].itemCount++
            }
          }
          const subCatRows = Object.values(bySubCat).map((r: any, i: number) => ({
            sl: i + 1,
            ...r,
          }))
          return NextResponse.json({
            reportType: 'sub-category-wise',
            range,
            from: dateWhere.gte,
            to: dateWhere.lte,
            rows: subCatRows,
            totalAmount: subCatRows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        return NextResponse.json({ error: 'Unknown reportType' }, { status: 400 })
      }

      case 'sales-summary': {
        const sales = await db.sales.findMany({
          include: { entity: true, items: true },
        })
        const rows = sales.map((s) => ({
          salesNo: s.salesNo,
          date: s.salesDate,
          entity: s.entity,
          customer: s.customerName,
          total: s.totalAmount,
          paid: s.paidAmount,
          status: s.status,
          deliveryStatus: s.deliveryStatus,
          itemCount: s.items.length,
        }))
        return NextResponse.json(rows)
      }

      case 'accounts-summary': {
        const entries = await db.accountEntry.findMany({ include: { entity: true } })
        const totalExpense = entries.filter((e) => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0)
        const totalReceive = entries.filter((e) => e.type === 'RECEIVE').reduce((s, e) => s + e.amount, 0)
        const byCategory: Record<string, { expense: number; receive: number }> = {}
        for (const e of entries) {
          if (!byCategory[e.category]) byCategory[e.category] = { expense: 0, receive: 0 }
          if (e.type === 'EXPENSE') byCategory[e.category].expense += e.amount
          else byCategory[e.category].receive += e.amount
        }
        return NextResponse.json({
          totalExpense, totalReceive, net: totalReceive - totalExpense,
          byCategory, entries,
        })
      }

      case 'serial-status': {
        const serials = await db.itemSerial.findMany({
          include: { item: { include: { category: true } }, entity: true },
          orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(serials)
      }

      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
