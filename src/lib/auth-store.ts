'use client'
import { create } from 'zustand'
import { PermissionAction } from '@/lib/auth'

export type CurrentUser = {
  id: string
  userId: string
  role: string  // ADMIN | USER
  employee: any
  permissions: any[]
}

interface AuthState {
  user: CurrentUser | null
  loading: boolean   // true while we are fetching /me
  setAuth: (u: CurrentUser | null) => void
  setLoading: (v: boolean) => void
  hasPerm: (module: string, action: PermissionAction) => boolean
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
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null })
  },
}))
