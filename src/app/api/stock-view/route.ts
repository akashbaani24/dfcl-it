// Stock view API — OPTIMIZED (single batch queries, no N+1)
// GET /api/stock-view?entityId=xxx  -> aggregated stock per item for that entity
// GET /api/stock-view?all=1         -> aggregated stock across all entities
// GET /api/stock-view?entityId=xxx&serials=1 -> include list of serials in stock
// GET /api/stock-view?all=1&serials=1 -> also include perEntity breakdown for non-serial items
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

  // Single query for ALL serials in stock (includes BC- prefixed barcodes from receive)
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

  // Per-entity balances for non-serial items (only in "all" mode with serials requested).
  // Used by Stock All page to show one row per (item, entity) for bulk-tracked items.
  let perEntityMap: Record<string, { entity: any; quantity: number }[]> = {}
  if (all && includeSerials) {
    const perEntityRaw = await db.stockTransaction.groupBy({
      by: ['itemId', 'entityId'],
      where: { item: { hasSerial: false } },
      _sum: { quantity: true },
    })
    if (perEntityRaw.length > 0) {
      const uniqueEntityIds = Array.from(new Set(perEntityRaw.map((r) => r.entityId)))
      const entityRecords = await db.entity.findMany({ where: { id: { in: uniqueEntityIds } } })
      const entityMap: Record<string, any> = {}
      for (const e of entityRecords) entityMap[e.id] = e
      for (const r of perEntityRaw) {
        const qty = r._sum.quantity || 0
        if (qty === 0) continue
        if (!perEntityMap[r.itemId]) perEntityMap[r.itemId] = []
        perEntityMap[r.itemId].push({ entity: entityMap[r.entityId], quantity: qty })
      }
    }
  }

  // Fetch expiry dates from PurchaseItem for items that have stock.
  // We get the most recent (latest) expiry date per item — if an item was
  // purchased multiple times with different expiry dates, we show the latest.
  const stockItemIds = Object.keys(balanceMap).filter(id => balanceMap[id] !== 0)
  let expiryMap: Record<string, string | null> = {}
  if (stockItemIds.length > 0) {
    const purchaseItems = await db.purchaseItem.findMany({
      where: { itemId: { in: stockItemIds }, expiryDate: { not: null } },
      select: { itemId: true, expiryDate: true },
      orderBy: { expiryDate: 'desc' },
    })
    for (const pi of purchaseItems) {
      // Keep only the first (latest) expiry date per item
      if (!expiryMap[pi.itemId] && pi.expiryDate) {
        expiryMap[pi.itemId] = pi.expiryDate.toISOString()
      }
    }
  }

  // Assemble result in memory (no DB calls)
  // Show ALL serials (including BC- barcodes from receive) regardless of hasSerial flag
  const result = items.map((item) => {
    const itemSerials = includeSerials ? (serialsMap[item.id] || []) : []
    const hasBarcodeSerials = itemSerials.length > 0
    return {
      item,
      balance: balanceMap[item.id] || 0,
      // Always include serials if they exist — even for non-serial items (BC- barcodes)
      serials: includeSerials ? itemSerials : [],
      // perEntity only for items that have NO serials at all
      perEntity: all && includeSerials && !hasBarcodeSerials ? (perEntityMap[item.id] || []) : [],
      // Expiry/warranty expiry date from the most recent PurchaseItem
      expiryDate: expiryMap[item.id] || null,
    }
  })

  return NextResponse.json(result)
}
