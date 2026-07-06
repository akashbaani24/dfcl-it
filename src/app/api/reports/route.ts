// Reports API
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
        const entities = await db.entity.findMany()
        const items = await db.item.findMany({ include: { category: { include: { parent: true } }, uom: true } })
        const rows = []
        for (const e of entities) {
          for (const item of items) {
            const txs = await db.stockTransaction.findMany({ where: { itemId: item.id, entityId: e.id } })
            const balance = txs.reduce((s, t) => s + t.quantity, 0)
            if (balance !== 0) {
              rows.push({
                entity: e,
                item,
                balance,
              })
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
        // Compute running balance
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
