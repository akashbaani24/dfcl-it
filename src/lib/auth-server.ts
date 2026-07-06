// Server-only auth utilities — password hashing + session helpers
// DO NOT import this from client components
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'invpro_session'
const SALT = 'invpro_2026_salt'

export function hashPassword(p: string): string {
  return crypto.createHash('sha256').update(p + SALT).digest('hex')
}

export function verifyPassword(p: string, hash: string): boolean {
  return hashPassword(p) === hash
}

function encodeSession(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64')
}

function decodeSession(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const userId = decoded.split(':')[0]
    return userId || null
  } catch {
    return null
  }
}

export async function setSession(userId: string) {
  const token = encodeSession(userId)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getCurrentUser() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const userId = decodeSession(token)
  if (!userId) return null
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { employee: true, permissions: true, userEntities: { include: { entity: true } } },
  })
  if (!user || !user.isActive) return null
  return user
}

// Get the entity IDs a user is assigned to. Admin = all entities (empty array means "all" for admin)
export async function getUserEntityIds(userId: string): Promise<string[] | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { userEntities: true },
  })
  if (!user) return null
  if (user.role === 'ADMIN') return null // null = no restriction
  return user.userEntities.map((ue) => ue.entityId)
}
