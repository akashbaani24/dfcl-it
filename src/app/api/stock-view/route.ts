// Stock view API — OPTIMIZED (single batch queries, no N+1)
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

  // Single query: get all items with category & uom in one go
  const items = await db.item.findMany({
    include: { category: { include: { parent: true } }, uom: true },
  })

  // Single groupBy query for ALL stock transactions (much faster than per-item queries)
  const txWhere: any = {}
  if (!all) txWhere.entityId = entityId
  const balancesRaw = await db.stockTransaction.groupBy({
    by: ['itemId'],
    where: txWhere,
    _sum: { quantity: true },
  })
  // Build a fast lookup map
  const balanceMap: Record<string, number> = {}
  for (const b of balancesRaw) {
    balanceMap[b.itemId] = b._sum.quantity || 0
  }

  // Single query for all serials in stock (only if needed)
  let serialsMap: Record<string, any[]> = {}
  if (includeSerials) {
    const sWhere: any = { status: 'IN_STOCK' }
    if (!all) sWhere.entityId = entityId
    const allSerials = await db.itemSerial.findMany({
      where: sWhere,
      include: { entity: true },
    })
    for (const s of allSerials) {
      if (!serialsMap[s.itemId]) serialsMap[s.itemId] = []
      serialsMap[s.itemId].push(s)
    }
  }

  // Assemble result in memory (no DB calls)
  const result = items.map((item) => ({
    item,
    balance: balanceMap[item.id] || 0,
    serials: includeSerials && item.hasSerial ? (serialsMap[item.id] || []) : [],
  }))

  return NextResponse.json(result)
}
