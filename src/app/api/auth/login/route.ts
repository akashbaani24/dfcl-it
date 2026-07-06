import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, setSession } from '@/lib/auth-server'

export async function POST(req: NextRequest) {
  const { userId, password } = await req.json()
  if (!userId || !password) {
    return NextResponse.json({ error: 'User ID and password required' }, { status: 400 })
  }
  const user = await db.user.findUnique({
    where: { userId },
    include: { employee: true, permissions: true },
  })
  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  if (!verifyPassword(password, user.password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })
  await setSession(user.id)
  return NextResponse.json({
    id: user.id,
    userId: user.userId,
    role: user.role,
    employee: user.employee,
    permissions: user.permissions,
  })
}
