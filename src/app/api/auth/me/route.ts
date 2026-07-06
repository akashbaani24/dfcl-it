import { NextResponse } from 'next/server'
import { getCurrentUserFull } from '@/lib/auth-server'

export async function GET() {
  const user = await getCurrentUserFull()
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({
    id: user.id,
    userId: user.userId,
    role: user.role,
    employee: user.employee,
    permissions: user.permissions,
    userEntities: user.userEntities,
  })
}
