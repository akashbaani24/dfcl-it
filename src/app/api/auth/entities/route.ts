// Manage user-entity assignments
// GET /api/auth/entities?userId=xxx  -> get assigned entity IDs
// POST /api/auth/entities { userId, entityIds: [...] }  -> replace all assignments
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const assignments = await db.userEntity.findMany({
    where: { userId },
    include: { entity: true },
  })
  return NextResponse.json(assignments)
}

export async function POST(req: NextRequest) {
  const { userId, entityIds } = await req.json()
  if (!userId || !Array.isArray(entityIds)) {
    return NextResponse.json({ error: 'userId and entityIds[] required' }, { status: 400 })
  }
  // Delete existing
  await db.userEntity.deleteMany({ where: { userId } })
  // Insert new
  for (const entityId of entityIds) {
    await db.userEntity.create({ data: { userId, entityId } })
  }
  return NextResponse.json({ ok: true, count: entityIds.length })
}
