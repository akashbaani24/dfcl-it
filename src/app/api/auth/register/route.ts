// Create or update a user login account + manage permissions
// POST /api/auth/register { employeeId, userId, password, role }
// PATCH /api/auth/permissions { userId, permissions: [{module, canView, canCreate, ...}] }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth-server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { employeeId, userId, password, role = 'USER' } = body
  if (!employeeId || !userId || !password) {
    return NextResponse.json({ error: 'employeeId, userId, password required' }, { status: 400 })
  }
  // Check employee exists
  const emp = await db.employee.findUnique({ where: { id: employeeId } })
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  // Check userId uniqueness
  const existing = await db.user.findUnique({ where: { userId } })
  if (existing) return NextResponse.json({ error: 'User ID already taken' }, { status: 400 })
  // Check if employee already has a user
  const empExisting = await db.user.findUnique({ where: { employeeId } })
  if (empExisting) return NextResponse.json({ error: 'Employee already has a login' }, { status: 400 })

  const user = await db.user.create({
    data: {
      userId,
      password: hashPassword(password),
      employeeId,
      role,
      isActive: true,
    },
  })
  return NextResponse.json({ id: user.id, userId: user.userId, role: user.role })
}

// Update password / role / userId / isActive
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, userId, password, role, isActive } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data: any = {}
  // Support updating userId (username) — check uniqueness first
  if (userId) {
    const existing = await db.user.findUnique({ where: { userId } })
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'User ID already taken by another user' }, { status: 400 })
    }
    data.userId = userId
  }
  if (password) data.password = hashPassword(password)
  if (role) data.role = role
  if (typeof isActive === 'boolean') data.isActive = isActive
  const user = await db.user.update({ where: { id }, data })
  return NextResponse.json({ id: user.id, userId: user.userId, role: user.role })
}
