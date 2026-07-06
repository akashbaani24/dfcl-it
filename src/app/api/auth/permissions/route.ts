// Save the full permission matrix for a user
// POST /api/auth/permissions { userId, permissions: [{module, canView, canCreate, canEdit, canDelete, canUpdate, canExcel, canPdf}] }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId, permissions } = await req.json()
  if (!userId || !Array.isArray(permissions)) {
    return NextResponse.json({ error: 'userId and permissions[] required' }, { status: 400 })
  }
  // Delete existing permissions for this user
  await db.permission.deleteMany({ where: { userId } })
  // Insert new ones
  for (const p of permissions) {
    await db.permission.create({
      data: {
        userId,
        module: p.module,
        canView: !!p.canView,
        canCreate: !!p.canCreate,
        canEdit: !!p.canEdit,
        canDelete: !!p.canDelete,
        canUpdate: !!p.canUpdate,
        canExcel: !!p.canExcel,
        canPdf: !!p.canPdf,
      },
    })
  }
  return NextResponse.json({ ok: true, count: permissions.length })
}

// GET permissions for a user
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const perms = await db.permission.findMany({ where: { userId } })
  return NextResponse.json(perms)
}
