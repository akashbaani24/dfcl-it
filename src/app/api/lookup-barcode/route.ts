// Barcode lookup endpoint — used by Internal Transfer entry page to
// quickly find an item by scanning its barcode.
//
// Usage:
//   GET /api/lookup-barcode?barcode=2607070123456&entityId=xxx
//
// Returns:
//   {
//     item: { id, name, itemCode, hasSerial },
//     serial: { id, serialNumber, barcode, status },
//     stockBalance: 5  // current stock of this item in the given entity
//   }
//
// If the barcode is not found, returns 404.
// If the item exists but is not in stock at the entity, returns the item
// with stockBalance: 0 so the UI can show "out of stock".
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const barcode = searchParams.get('barcode')?.trim()
  const entityId = searchParams.get('entityId')

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode is required' }, { status: 400 })
  }
  if (!entityId) {
    return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 })
  }

  try {
    // 1. Find the ItemSerial by barcode OR serialNumber
    //    (barcodes can be stored in either field depending on how they were received)
    let serial = await db.itemSerial.findFirst({
      where: {
        OR: [
          { barcode: barcode },
          { serialNumber: barcode },
        ],
        entityId: entityId,
      },
      include: {
        item: { select: { id: true, name: true, itemCode: true, hasSerial: true, uom: { select: { shortCode: true } } } },
      },
    })

    // If not found in this entity, try finding it in ANY entity (so we can
    // tell the user "this item exists but is not in your entity")
    let foundInOtherEntity = false
    if (!serial) {
      const anySerial = await db.itemSerial.findFirst({
        where: {
          OR: [
            { barcode: barcode },
            { serialNumber: barcode },
          ],
        },
        include: {
          item: { select: { id: true, name: true, itemCode: true, hasSerial: true, uom: { select: { shortCode: true } } } },
        },
      })
      if (anySerial) {
        foundInOtherEntity = true
        serial = anySerial as any
      }
    }

    if (!serial) {
      return NextResponse.json({
        error: `No item found with barcode "${barcode}"`,
        barcode,
      }, { status: 404 })
    }

    // 2. Get the stock balance for this item at the given entity
    //    (sum of all StockTransactions for this item + entity)
    const balanceAgg = await db.stockTransaction.aggregate({
      where: { itemId: serial.item.id, entityId: entityId },
      _sum: { quantity: true },
    })
    const stockBalance = balanceAgg._sum.quantity || 0

    // 3. Count how many of this item's serials are IN_STOCK at this entity
    const inStockCount = await db.itemSerial.count({
      where: {
        itemId: serial.item.id,
        entityId: entityId,
        status: 'IN_STOCK',
      },
    })

    return NextResponse.json({
      item: serial.item,
      serial: {
        id: serial.id,
        serialNumber: serial.serialNumber,
        barcode: serial.barcode,
        status: serial.status,
      },
      stockBalance,
      inStockCount,
      foundInOtherEntity,
    })
  } catch (e: any) {
    console.error('[lookup-barcode] error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
