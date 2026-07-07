// Barcode search endpoint — find item serials by various criteria.
//
// Usage:
//   GET /api/barcode-search?searchType=purchase&purchaseNo=PUR-...
//   GET /api/barcode-search?searchType=item&itemId=xxx
//   GET /api/barcode-search?searchType=barcode&barcode=260707...
//   GET /api/barcode-search?searchType=serial&serial=SN001
//
// Returns an array of:
//   { id, itemName, itemCode, barcode, serialNumber, qty, uom, entity, status,
//     purchaseNo, receiveNo }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const searchType = searchParams.get('searchType') || 'all'

  try {
    let where: any = {}

    if (searchType === 'purchase') {
      // Search by purchase number — find all serials for that purchase
      const purchaseNo = searchParams.get('purchaseNo')?.trim()
      if (!purchaseNo) {
        return NextResponse.json({ error: 'purchaseNo is required for searchType=purchase' }, { status: 400 })
      }
      const purchase = await db.purchase.findFirst({
        where: { purchaseNo: { contains: purchaseNo } },
        select: { id: true },
      })
      if (!purchase) {
        return NextResponse.json([])
      }
      where.purchaseId = purchase.id
    } else if (searchType === 'item') {
      // Search by item ID
      const itemId = searchParams.get('itemId')?.trim()
      if (!itemId) {
        return NextResponse.json({ error: 'itemId is required for searchType=item' }, { status: 400 })
      }
      where.itemId = itemId
    } else if (searchType === 'barcode') {
      // Search by barcode number
      const barcode = searchParams.get('barcode')?.trim()
      if (!barcode) {
        return NextResponse.json({ error: 'barcode is required for searchType=barcode' }, { status: 400 })
      }
      where.OR = [
        { barcode: { contains: barcode } },
        { serialNumber: { contains: barcode } }, // also search serials in case user typed serial
      ]
    } else if (searchType === 'serial') {
      // Search by serial number
      const serial = searchParams.get('serial')?.trim()
      if (!serial) {
        return NextResponse.json({ error: 'serial is required for searchType=serial' }, { status: 400 })
      }
      where.serialNumber = { contains: serial }
    } else if (searchType === 'all' && searchParams.get('q')) {
      // General search
      const q = searchParams.get('q')!.trim()
      where.OR = [
        { serialNumber: { contains: q } },
        { barcode: { contains: q } },
      ]
    }

    const serials = await db.itemSerial.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            itemCode: true,
            uom: { select: { shortCode: true } },
          },
        },
        entity: { select: { id: true, name: true } },
        // NOTE: ItemSerial does NOT have a 'purchase' relation — only a
        // purchaseId field. We fetch the purchase number separately below.
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // limit to prevent huge responses
    })

    // Fetch purchase numbers and receive numbers separately (ItemSerial
    // has purchaseId as a plain field, NOT a relation).
    const purchaseIds = [...new Set(serials.map(s => s.purchaseId).filter(Boolean))]
    let purchaseNoMap: Record<string, string> = {}
    let receiveNoMap: Record<string, string> = {}
    if (purchaseIds.length > 0) {
      // Fetch purchase numbers
      const purchases = await db.purchase.findMany({
        where: { id: { in: purchaseIds } },
        select: { id: true, purchaseNo: true },
      })
      for (const p of purchases) {
        purchaseNoMap[p.id] = p.purchaseNo
      }
      // Fetch receive numbers
      const receives = await db.purchaseReceive.findMany({
        where: { purchaseId: { in: purchaseIds } },
        select: { id: true, receiveNo: true, purchaseId: true },
      })
      for (const r of receives) {
        receiveNoMap[r.purchaseId] = r.receiveNo
      }
    }

    // Fetch expiry dates from PurchaseItem for these items+purchases
    const itemPurchasePairs = serials
      .filter(s => s.itemId && s.purchaseId)
      .map(s => ({ itemId: s.itemId, purchaseId: s.purchaseId! }))
    let expiryMap: Record<string, string | null> = {}
    if (itemPurchasePairs.length > 0) {
      // Fetch all relevant PurchaseItems and build a lookup by itemId+purchaseId
      const itemIds = [...new Set(itemPurchasePairs.map(p => p.itemId))]
      const purchaseIdsForExpiry = [...new Set(itemPurchasePairs.map(p => p.purchaseId))]
      const purchaseItemsForExpiry = await db.purchaseItem.findMany({
        where: {
          itemId: { in: itemIds },
          purchaseId: { in: purchaseIdsForExpiry },
          expiryDate: { not: null },
        },
        select: { itemId: true, purchaseId: true, expiryDate: true },
        orderBy: { expiryDate: 'desc' },
      })
      for (const pi of purchaseItemsForExpiry) {
        const key = `${pi.itemId}|${pi.purchaseId}`
        if (!expiryMap[key] && pi.expiryDate) {
          expiryMap[key] = pi.expiryDate.toISOString()
        }
      }
    }

    const rows = serials.map((s) => {
      const expiryKey = s.itemId && s.purchaseId ? `${s.itemId}|${s.purchaseId}` : ''
      return {
        id: s.id,
        itemName: s.item?.name || '—',
        itemCode: s.item?.itemCode || '—',
        barcode: s.barcode || '',
        serialNumber: s.serialNumber || '',
        qty: 1, // each ItemSerial = 1 unit
        uom: s.item?.uom?.shortCode || '—',
        entity: s.entity?.name || '—',
        status: s.status,
        purchaseNo: s.purchaseId ? (purchaseNoMap[s.purchaseId] || '') : '',
        receiveNo: s.purchaseId ? (receiveNoMap[s.purchaseId] || '') : '',
        expiryDate: expiryMap[expiryKey] || null,
        createdAt: s.createdAt,
      }
    })

    return NextResponse.json(rows)
  } catch (e: any) {
    console.error('[barcode-search] error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
