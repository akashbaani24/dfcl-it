'use client'
import { create } from 'zustand'
import { PermissionAction } from '@/lib/auth'

export type CurrentUser = {
  id: string
  userId: string
  role: string  // ADMIN | USER
  employee: any
  permissions: any[]
  userEntities: any[]  // [{ id, entityId, entity: { id, name, shortCode } }]
}

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  setAuth: (u: CurrentUser | null) => void
  setLoading: (v: boolean) => void
  hasPerm: (module: string, action: PermissionAction) => boolean
  // Returns the entity IDs the user can access. Admin = null (all). Non-admin = array of IDs.
  getEntityIds: () => string[] | null
  // Returns true if user can access a specific entity
  canAccessEntity: (entityId: string) => boolean
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  setAuth: (u) => set({ user: u }),
  setLoading: (v) => set({ loading: v }),
  hasPerm: (module, action) => {
    const u = get().user
    if (!u) return false
    if (u.role === 'ADMIN') return true
    const p = u.permissions.find((perm) => perm.module === module)
    if (!p) return false
    return !!p[action]
  },
  getEntityIds: () => {
    const u = get().user
    if (!u) return []
    if (u.role === 'ADMIN') return null  // null = no restriction
    return (u.userEntities || []).map((ue) => ue.entityId)
  },
  canAccessEntity: (entityId) => {
    const u = get().user
    if (!u) return false
    if (u.role === 'ADMIN') return true
    return (u.userEntities || []).some((ue) => ue.entityId === entityId)
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null })
  },
}))
