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
          // Flat list: one row per item per purchase.
          // Columns: Sl, Purchase Date, Purchase ID, Purchase Receive ID,
          //          Purchase For, Supplier, Item Name, Model No, Size,
          //          Barcode, Serial Number, Qty, UoM, Unit Price, Total
          //
          // BARCODE + SERIAL CROSS-REFERENCE:
          //   The barcode and serial are NOT stored on PurchaseItem (they
          //   don't exist at purchase creation time). They are generated
          //   and stored on PurchaseReceiveItem when the purchase is
          //   received. So we look up all PurchaseReceiveItems that
          //   reference this PurchaseItem (via purchaseItemId) and collect
          //   their barcodes + serials.
          //
          //   If a purchase has NOT been received yet, the barcode and
          //   serial columns will show '—' (not received).

          // Step 1: Collect all purchaseItem IDs from these purchases
          const allPurchaseItemIds: string[] = []
          for (const p of purchases) {
            for (const it of p.items) {
              allPurchaseItemIds.push(it.id)
            }
          }

          // Step 2: Fetch all PurchaseReceiveItems that reference these
          // PurchaseItems. Also include the parent PurchaseReceive to get
          // the receiveNo.
          const receiveItems = allPurchaseItemIds.length > 0
            ? await db.purchaseReceiveItem.findMany({
                where: { purchaseItemId: { in: allPurchaseItemIds } },
                include: {
                  receive: { select: { id: true, receiveNo: true, status: true } },
                },
              })
            : []

          // Step 3: Build a map: purchaseItemId → { receiveNos, barcodes, serials }
          const receiveMap: Record<string, { receiveNos: string[]; barcodes: string[]; serials: string[] }> = {}
          for (const ri of receiveItems) {
            const pid = ri.purchaseItemId
            if (!receiveMap[pid]) {
              receiveMap[pid] = { receiveNos: [], barcodes: [], serials: [] }
            }
            // Collect the receive number(s) for this purchase item
            if (ri.receive?.receiveNo && !receiveMap[pid].receiveNos.includes(ri.receive.receiveNo)) {
              receiveMap[pid].receiveNos.push(ri.receive.receiveNo)
            }
            // Collect barcodes (comma-separated → split into individual)
            if (ri.barcodes) {
              const bcs = ri.barcodes.split(',').map((b: string) => b.trim()).filter(Boolean)
              receiveMap[pid].barcodes.push(...bcs)
            }
            // Collect serials (comma-separated → split into individual)
            if (ri.serials) {
              const sns = ri.serials.split(',').map((s: string) => s.trim()).filter(Boolean)
              receiveMap[pid].serials.push(...sns)
            }
          }

          // Step 4: Build the detail rows — ONE ROW PER UNIT (barcode/serial)
          // If a purchase item has 10 units received with 10 barcodes,
          // we create 10 rows (each with its own barcode + serial).
          // If not received yet, we create 1 row with qty=ordered and
          // barcode/serial = '— (not received)'.
          const detailRows: any[] = []
          let sl = 1
          for (const p of purchases) {
            for (const it of p.items) {
              const item = it.item
              const recvData = receiveMap[it.id] || { receiveNos: [], barcodes: [], serials: [] }
              const hasReceived = recvData.receiveNos.length > 0

              if (hasReceived && recvData.barcodes.length > 0) {
                // Received with barcodes — create 1 row per barcode
                const numUnits = recvData.barcodes.length
                const unitPrice = it.unitPrice
                const unitTotal = it.unitPrice  // each unit's total = unit price
                for (let i = 0; i < numUnits; i++) {
                  detailRows.push({
                    sl: sl++,
                    purchaseNo: p.purchaseNo,
                    purchaseDate: p.purchaseDate,
                    purchaseId: p.purchaseNo,
                    receiveNo: recvData.receiveNos.join(', '),
                    purchaseFor: p.entity?.name || '—',
                    supplier: p.supplier?.name || '—',
                    itemName: item?.name || '—',
                    modelNo: item?.itemCode || '—',
                    size: item?.description || '—',
                    barcode: recvData.barcodes[i] || '—',
                    serialNumber: recvData.serials[i] || '—',
                    qty: 1,                          // 1 per row (per unit)
                    uom: item?.uom?.shortCode || '—',
                    unitPrice: unitPrice,
                    total: unitTotal,
                  })
                }
              } else if (hasReceived && recvData.serials.length > 0) {
                // Received with serials but no barcodes — 1 row per serial
                const numUnits = recvData.serials.length
                const unitPrice = it.unitPrice
                for (let i = 0; i < numUnits; i++) {
                  detailRows.push({
                    sl: sl++,
                    purchaseNo: p.purchaseNo,
                    purchaseDate: p.purchaseDate,
                    purchaseId: p.purchaseNo,
                    receiveNo: recvData.receiveNos.join(', '),
                    purchaseFor: p.entity?.name || '—',
                    supplier: p.supplier?.name || '—',
                    itemName: item?.name || '—',
                    modelNo: item?.itemCode || '—',
                    size: item?.description || '—',
                    barcode: '—',
                    serialNumber: recvData.serials[i] || '—',
                    qty: 1,
                    uom: item?.uom?.shortCode || '—',
                    unitPrice: unitPrice,
                    total: unitPrice,
                  })
                }
              } else {
                // Not received yet — 1 row with full qty
                detailRows.push({
                  sl: sl++,
                  purchaseNo: p.purchaseNo,
                  purchaseDate: p.purchaseDate,
                  purchaseId: p.purchaseNo,
                  receiveNo: '— (not received)',
                  purchaseFor: p.entity?.name || '—',
                  supplier: p.supplier?.name || '—',
                  itemName: item?.name || '—',
                  modelNo: item?.itemCode || '—',
                  size: item?.description || '—',
                  barcode: '— (not received)',
                  serialNumber: '— (not received)',
                  qty: it.quantity,
                  uom: item?.uom?.shortCode || '—',
                  unitPrice: it.unitPrice,
                  total: it.totalPrice,
                })
              }
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

      // ===== SALES REPORT (enhanced with date filter + report types) =====
      case 'sales-report': {
        const reportType = searchParams.get('reportType') || 'summary'
        const range = searchParams.get('range') || 'monthly'
        const from = searchParams.get('from')
        const to = searchParams.get('to')

        const dateWhere: any = {}
        const now = new Date()
        if (range === 'daily') {
          dateWhere.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (range === 'monthly') {
          dateWhere.gte = new Date(now.getFullYear(), now.getMonth(), 1)
        } else if (range === 'yearly') {
          dateWhere.gte = new Date(now.getFullYear(), 0, 1)
        } else if (range === 'custom' && from && to) {
          dateWhere.gte = new Date(from)
          dateWhere.lte = new Date(to + 'T23:59:59.999Z')
        }

        const sales = await db.sales.findMany({
          where: Object.keys(dateWhere).length > 0 ? { salesDate: dateWhere } : {},
          include: {
            entity: true,
            items: {
              include: {
                item: { include: { category: { include: { parent: true } }, uom: true } },
              },
            },
          },
          orderBy: { salesDate: 'desc' },
        })

        if (reportType === 'summary') {
          const summaryRows = sales.map((s, i) => ({
            sl: i + 1,
            salesNo: s.salesNo,
            salesDate: s.salesDate,
            entity: s.entity?.name || '—',
            customer: s.customerName,
            customerPhone: s.customerPhone || '—',
            itemCount: s.items.length,
            totalQty: s.items.reduce((s2: number, it: any) => s2 + it.quantity, 0),
            totalAmount: s.totalAmount,
            paidAmount: s.paidAmount,
            due: s.totalAmount - s.paidAmount,
            status: s.status,
            deliveryStatus: s.deliveryStatus,
          }))
          return NextResponse.json({
            reportType: 'summary', range, from: dateWhere.gte, to: dateWhere.lte,
            rows: summaryRows,
            totalAmount: summaryRows.reduce((s, r) => s + r.totalAmount, 0),
            totalPaid: summaryRows.reduce((s, r) => s + r.paidAmount, 0),
          })
        }

        if (reportType === 'customer-wise') {
          const byCustomer: Record<string, any> = {}
          for (const s of sales) {
            const key = s.customerName || 'Unknown'
            if (!byCustomer[key]) byCustomer[key] = { customer: key, phone: s.customerPhone, salesCount: 0, totalAmount: 0, totalPaid: 0 }
            byCustomer[key].salesCount++
            byCustomer[key].totalAmount += s.totalAmount
            byCustomer[key].totalPaid += s.paidAmount
          }
          const rows = Object.values(byCustomer).map((r: any, i: number) => ({ sl: i + 1, ...r }))
          return NextResponse.json({
            reportType: 'customer-wise', range, from: dateWhere.gte, to: dateWhere.lte,
            rows,
            totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        if (reportType === 'entity-wise') {
          const byEntity: Record<string, any> = {}
          for (const s of sales) {
            const key = s.entity?.name || 'Unknown'
            if (!byEntity[key]) byEntity[key] = { entity: key, salesCount: 0, totalAmount: 0, totalPaid: 0 }
            byEntity[key].salesCount++
            byEntity[key].totalAmount += s.totalAmount
            byEntity[key].totalPaid += s.paidAmount
          }
          const rows = Object.values(byEntity).map((r: any, i: number) => ({ sl: i + 1, ...r }))
          return NextResponse.json({
            reportType: 'entity-wise', range, from: dateWhere.gte, to: dateWhere.lte,
            rows,
            totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        if (reportType === 'item-wise') {
          const byItem: Record<string, any> = {}
          for (const s of sales) {
            for (const it of s.items) {
              const key = it.item?.name || 'Unknown'
              if (!byItem[key]) byItem[key] = { itemName: key, modelNo: it.item?.itemCode, uom: it.item?.uom?.shortCode, qty: 0, totalAmount: 0, salesCount: 0 }
              byItem[key].qty += it.quantity
              byItem[key].totalAmount += it.totalPrice
              byItem[key].salesCount++
            }
          }
          const rows = Object.values(byItem).map((r: any, i: number) => ({ sl: i + 1, ...r }))
          return NextResponse.json({
            reportType: 'item-wise', range, from: dateWhere.gte, to: dateWhere.lte,
            rows,
            totalQty: rows.reduce((s, r) => s + r.qty, 0),
            totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        if (reportType === 'category-wise') {
          const byCat: Record<string, any> = {}
          for (const s of sales) {
            for (const it of s.items) {
              const cat = it.item?.category
              const topCat = cat?.parent?.name || cat?.name || 'Uncategorized'
              if (!byCat[topCat]) byCat[topCat] = { category: topCat, qty: 0, totalAmount: 0, itemCount: 0 }
              byCat[topCat].qty += it.quantity
              byCat[topCat].totalAmount += it.totalPrice
              byCat[topCat].itemCount++
            }
          }
          const rows = Object.values(byCat).map((r: any, i: number) => ({ sl: i + 1, ...r }))
          return NextResponse.json({
            reportType: 'category-wise', range, from: dateWhere.gte, to: dateWhere.lte,
            rows,
            totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
          })
        }

        return NextResponse.json({ error: 'Unknown reportType for sales-report. Available: summary, customer-wise, entity-wise, item-wise, category-wise' }, { status: 400 })
      }

      // ===== STOCK REPORT =====
      case 'stock-report': {
        const reportType = searchParams.get('reportType') || 'summary'

        const [entities, items] = await Promise.all([
          db.entity.findMany(),
          db.item.findMany({ include: { category: { include: { parent: true } }, uom: true } }),
        ])
        const balancesRaw = await db.stockTransaction.groupBy({
          by: ['entityId', 'itemId'],
          _sum: { quantity: true },
        })
        const balanceMap: Record<string, number> = {}
        for (const b of balancesRaw) {
          balanceMap[`${b.entityId}|${b.itemId}`] = b._sum.quantity || 0
        }

        if (reportType === 'summary') {
          // One row per item with total stock across all entities
          const rows = items.map((item, i) => {
            let totalBalance = 0
            for (const e of entities) {
              totalBalance += balanceMap[`${e.id}|${item.id}`] || 0
            }
            return {
              sl: i + 1,
              itemName: item.name,
              itemCode: item.itemCode,
              category: item.category?.parent?.name || item.category?.name || '—',
              uom: item.uom?.shortCode || '—',
              totalStock: totalBalance,
            }
          }).filter(r => r.totalStock !== 0)
          return NextResponse.json({
            reportType: 'summary', range: 'all',
            rows,
            totalStock: rows.reduce((s, r) => s + r.totalStock, 0),
          })
        }

        if (reportType === 'entity-wise') {
          // One row per entity + item
          const rows: any[] = []
          let sl = 1
          for (const e of entities) {
            for (const item of items) {
              const balance = balanceMap[`${e.id}|${item.id}`] || 0
              if (balance !== 0) {
                rows.push({
                  sl: sl++,
                  entity: e.name,
                  itemName: item.name,
                  itemCode: item.itemCode,
                  category: item.category?.parent?.name || item.category?.name || '—',
                  uom: item.uom?.shortCode || '—',
                  stock: balance,
                })
              }
            }
          }
          return NextResponse.json({
            reportType: 'entity-wise', range: 'all',
            rows,
            totalStock: rows.reduce((s, r) => s + r.stock, 0),
          })
        }

        if (reportType === 'category-wise') {
          const byCat: Record<string, any> = {}
          for (const item of items) {
            const cat = item.category
            const topCat = cat?.parent?.name || cat?.name || 'Uncategorized'
            let totalBalance = 0
            for (const e of entities) {
              totalBalance += balanceMap[`${e.id}|${item.id}`] || 0
            }
            if (totalBalance !== 0) {
              if (!byCat[topCat]) byCat[topCat] = { category: topCat, itemCount: 0, totalStock: 0 }
              byCat[topCat].itemCount++
              byCat[topCat].totalStock += totalBalance
            }
          }
          const rows = Object.values(byCat).map((r: any, i: number) => ({ sl: i + 1, ...r }))
          return NextResponse.json({
            reportType: 'category-wise', range: 'all',
            rows,
            totalStock: rows.reduce((s, r) => s + r.totalStock, 0),
          })
        }

        if (reportType === 'item-wise') {
          // Same as summary but grouped differently
          const rows = items.map((item, i) => {
            let totalBalance = 0
            const entityStocks: any[] = []
            for (const e of entities) {
              const bal = balanceMap[`${e.id}|${item.id}`] || 0
              if (bal !== 0) {
                totalBalance += bal
                entityStocks.push({ entity: e.name, stock: bal })
              }
            }
            return {
              sl: i + 1,
              itemName: item.name,
              itemCode: item.itemCode,
              uom: item.uom?.shortCode || '—',
              totalStock: totalBalance,
              entities: entityStocks,
            }
          }).filter(r => r.totalStock !== 0)
          return NextResponse.json({
            reportType: 'item-wise', range: 'all',
            rows,
            totalStock: rows.reduce((s, r) => s + r.totalStock, 0),
          })
        }

        return NextResponse.json({ error: 'Unknown reportType for stock-report. Available: summary, entity-wise, category-wise, item-wise' }, { status: 400 })
      }

      // ===== ACCOUNTS REPORT =====
      case 'accounts-report': {
        const reportType = searchParams.get('reportType') || 'summary'
        const range = searchParams.get('range') || 'monthly'
        const from = searchParams.get('from')
        const to = searchParams.get('to')

        const dateWhere: any = {}
        const now = new Date()
        if (range === 'daily') {
          dateWhere.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (range === 'monthly') {
          dateWhere.gte = new Date(now.getFullYear(), now.getMonth(), 1)
        } else if (range === 'yearly') {
          dateWhere.gte = new Date(now.getFullYear(), 0, 1)
        } else if (range === 'custom' && from && to) {
          dateWhere.gte = new Date(from)
          dateWhere.lte = new Date(to + 'T23:59:59.999Z')
        }

        const entries = await db.accountEntry.findMany({
          where: Object.keys(dateWhere).length > 0 ? { date: dateWhere } : {},
          include: { entity: true },
          orderBy: { date: 'desc' },
        })

        if (reportType === 'summary') {
          const rows = entries.map((e, i) => ({
            sl: i + 1,
            entryNo: e.entryNo,
            date: e.date,
            entity: e.entity?.name || '—',
            type: e.type,
            category: e.category,
            amount: e.amount,
            method: e.method,
            description: e.description || '—',
          }))
          return NextResponse.json({
            reportType: 'summary', range, from: dateWhere.gte, to: dateWhere.lte,
            rows,
            totalExpense: entries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0),
            totalReceive: entries.filter(e => e.type === 'RECEIVE').reduce((s, e) => s + e.amount, 0),
          })
        }

        if (reportType === 'category-wise') {
          const byCat: Record<string, any> = {}
          for (const e of entries) {
            const key = e.category
            if (!byCat[key]) byCat[key] = { category: key, expense: 0, receive: 0, count: 0 }
            if (e.type === 'EXPENSE') byCat[key].expense += e.amount
            else byCat[key].receive += e.amount
            byCat[key].count++
          }
          const rows = Object.values(byCat).map((r: any, i: number) => ({
            sl: i + 1, ...r,
            net: r.receive - r.expense,
          }))
          return NextResponse.json({
            reportType: 'category-wise', range, from: dateWhere.gte, to: dateWhere.lte,
            rows,
            totalExpense: rows.reduce((s, r) => s + r.expense, 0),
            totalReceive: rows.reduce((s, r) => s + r.receive, 0),
          })
        }

        if (reportType === 'entity-wise') {
          const byEntity: Record<string, any> = {}
          for (const e of entries) {
            const key = e.entity?.name || 'Unknown'
            if (!byEntity[key]) byEntity[key] = { entity: key, expense: 0, receive: 0, count: 0 }
            if (e.type === 'EXPENSE') byEntity[key].expense += e.amount
            else byEntity[key].receive += e.amount
            byEntity[key].count++
          }
          const rows = Object.values(byEntity).map((r: any, i: number) => ({
            sl: i + 1, ...r,
            net: r.receive - r.expense,
          }))
          return NextResponse.json({
            reportType: 'entity-wise', range, from: dateWhere.gte, to: dateWhere.lte,
            rows,
            totalExpense: rows.reduce((s, r) => s + r.expense, 0),
            totalReceive: rows.reduce((s, r) => s + r.receive, 0),
          })
        }

        if (reportType === 'type-wise') {
          const expense = entries.filter(e => e.type === 'EXPENSE')
          const receive = entries.filter(e => e.type === 'RECEIVE')
          const rows = [
            { sl: 1, type: 'EXPENSE', count: expense.length, total: expense.reduce((s, e) => s + e.amount, 0) },
            { sl: 2, type: 'RECEIVE', count: receive.length, total: receive.reduce((s, e) => s + e.amount, 0) },
          ]
          return NextResponse.json({
            reportType: 'type-wise', range, from: dateWhere.gte, to: dateWhere.lte,
            rows,
            totalExpense: rows[0].total,
            totalReceive: rows[1].total,
          })
        }

        return NextResponse.json({ error: 'Unknown reportType for accounts-report. Available: summary, category-wise, entity-wise, type-wise' }, { status: 400 })
      }

      // ===== SERIAL STATUS REPORT =====
      case 'serial-report': {
        const reportType = searchParams.get('reportType') || 'status-wise'

        const serials = await db.itemSerial.findMany({
          include: { item: { include: { category: { include: { parent: true } } } }, entity: true },
          orderBy: { createdAt: 'desc' },
        })

        if (reportType === 'status-wise') {
          const byStatus: Record<string, any> = {}
          for (const s of serials) {
            const key = s.status
            if (!byStatus[key]) byStatus[key] = { status: key, count: 0, items: new Set() }
            byStatus[key].count++
            byStatus[key].items.add(s.item?.name)
          }
          const rows = Object.values(byStatus).map((r: any, i: number) => ({
            sl: i + 1, status: r.status, count: r.count, uniqueItems: r.items.size,
          }))
          return NextResponse.json({
            reportType: 'status-wise', range: 'all',
            rows,
            totalSerials: serials.length,
          })
        }

        if (reportType === 'item-wise') {
          const byItem: Record<string, any> = {}
          for (const s of serials) {
            const key = s.item?.name || 'Unknown'
            if (!byItem[key]) byItem[key] = { itemName: key, itemCode: s.item?.itemCode, total: 0, inStock: 0, sold: 0, other: 0 }
            byItem[key].total++
            if (s.status === 'IN_STOCK') byItem[key].inStock++
            else if (s.status === 'SOLD') byItem[key].sold++
            else byItem[key].other++
          }
          const rows = Object.values(byItem).map((r: any, i: number) => ({ sl: i + 1, ...r }))
          return NextResponse.json({
            reportType: 'item-wise', range: 'all',
            rows,
            totalSerials: serials.length,
          })
        }

        if (reportType === 'entity-wise') {
          const byEntity: Record<string, any> = {}
          for (const s of serials) {
            const key = s.entity?.name || 'Unknown'
            if (!byEntity[key]) byEntity[key] = { entity: key, total: 0, inStock: 0, sold: 0, other: 0 }
            byEntity[key].total++
            if (s.status === 'IN_STOCK') byEntity[key].inStock++
            else if (s.status === 'SOLD') byEntity[key].sold++
            else byEntity[key].other++
          }
          const rows = Object.values(byEntity).map((r: any, i: number) => ({ sl: i + 1, ...r }))
          return NextResponse.json({
            reportType: 'entity-wise', range: 'all',
            rows,
            totalSerials: serials.length,
          })
        }

        if (reportType === 'details') {
          const rows = serials.map((s, i) => ({
            sl: i + 1,
            serialNumber: s.serialNumber,
            barcode: s.barcode || '—',
            itemName: s.item?.name || '—',
            itemCode: s.item?.itemCode || '—',
            category: s.item?.category?.parent?.name || s.item?.category?.name || '—',
            entity: s.entity?.name || '—',
            status: s.status,
            createdAt: s.createdAt,
          }))
          return NextResponse.json({
            reportType: 'details', range: 'all',
            rows,
            totalSerials: serials.length,
          })
        }

        return NextResponse.json({ error: 'Unknown reportType for serial-report. Available: status-wise, item-wise, entity-wise, details' }, { status: 400 })
      }

      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
