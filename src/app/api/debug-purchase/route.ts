// Debug endpoint — shows the actual state of the database to help diagnose
// purchase creation failures.
//
// Visit: /api/debug-purchase
// Returns: entities, suppliers, items, recent purchases, and the Purchase
// table schema — so we can see exactly what's in the DB.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get the Purchase table schema
    const purchaseColumns: any[] = await db.$queryRawUnsafe(
      'PRAGMA table_info(Purchase)'
    )

    // Get all entities
    const entities = await db.entity.findMany({
      select: { id: true, name: true, shortCode: true },
      take: 50,
    })

    // Get all suppliers
    const suppliers = await db.supplier.findMany({
      select: { id: true, name: true, shortCode: true },
      take: 50,
    })

    // Get items count + first 20
    const itemCount = await db.item.count()
    const items = await db.item.findMany({
      select: { id: true, name: true, itemCode: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    // Get recent purchases
    const purchases = await db.purchase.findMany({
      select: {
        id: true,
        purchaseNo: true,
        entityId: true,
        shippingEntityId: true,
        supplierId: true,
        status: true,
        createdAt: true,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    // Check FK constraints on Purchase table
    const purchaseFks: any[] = await db.$queryRawUnsafe(
      'PRAGMA foreign_key_list(Purchase)'
    )

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      purchaseSchema: {
        columns: purchaseColumns.map((c: any) => ({
          name: c.name,
          type: c.type,
          notnull: c.notnull,
          // Check if shippingEntityId exists
        })),
        hasShippingEntityId: purchaseColumns.some((c: any) => c.name === 'shippingEntityId'),
        foreignKeys: purchaseFks.map((fk: any) => ({
          from: fk.from,
          table: fk.table,
          to: fk.to,
        })),
      },
      data: {
        entities: entities.map((e) => ({ id: e.id, name: e.name, shortCode: e.shortCode })),
        suppliers: suppliers.map((s) => ({ id: s.id, name: s.name, shortCode: s.shortCode })),
        items: {
          count: itemCount,
          sample: items.map((i) => ({ id: i.id, name: i.name, itemCode: i.itemCode })),
        },
        recentPurchases: purchases,
      },
    })
  } catch (e: any) {
    console.error('[debug-purchase] error:', e.message)
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}
