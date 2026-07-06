// Stock view API
// GET /api/stock-view?entityId=xxx  -> aggregated stock per item for that entity
// GET /api/stock-view?all=1         -> aggregated stock across all entities
// GET /api/stock-view?entityId=xxx&serials=1 -> include list of serials in stock
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId') || undefined
  const all = searchParams.get('all') === '1'
  const includeSerials = searchParams.get('serials') === '1'

  // Get all items
  const items = await db.item.findMany({
    include: { category: { include: { parent: true } }, uom: true },
  })

  // Aggregate stock transactions
  const result = []
  for (const item of items) {
    const txWhere: any = { itemId: item.id }
    if (!all) txWhere.entityId = entityId
    const txs = await db.stockTransaction.findMany({ where: txWhere })
    const balance = txs.reduce((sum, t) => sum + t.quantity, 0)

    // Serial list (if hasSerial)
    let serials: any[] = []
    if (includeSerials && item.hasSerial) {
      const sWhere: any = { itemId: item.id, status: 'IN_STOCK' }
      if (!all) sWhere.entityId = entityId
      serials = await db.itemSerial.findMany({
        where: sWhere,
        include: { entity: true },
      })
    }

    result.push({
      item,
      balance,
      serials,
    })
  }
  return NextResponse.json(result)
}
