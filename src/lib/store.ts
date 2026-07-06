'use client'
import { create } from 'zustand'

export type ModuleKey =
  | 'dashboard'
  | 'entities' | 'departments' | 'employees' | 'uoms' | 'suppliers' | 'categories' | 'items' | 'item-serials' | 'news-ticker'
  | 'purchase-requisitions' | 'purchases' | 'purchase-returns' | 'purchase-receive'
  | 'stock-all' | 'stock-mine' | 'internal-transfers' | 'internal-receive' | 'adjustments'
  | 'sales' | 'sales-delivery' | 'sales-returns' | 'sales-refunds'
  | 'accounts-expenses' | 'accounts-receive'
  | 'reports-stock' | 'reports-purchase' | 'reports-sales' | 'reports-accounts' | 'reports-serial'
  | 'manage-permissions' | 'employee-edit' | 'login-settings' | 'item-edit' | 'account-types'
  | 'generic-add-edit' | 'bank-infos'

interface AppState {
  active: ModuleKey
  currentEntityId: string | null
  sidebarOpen: boolean
  permissionUserId: string | null  // user being managed in Manage Permissions page
  setActive: (m: ModuleKey) => void
  setCurrentEntity: (id: string | null) => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
  setPermissionUserId: (id: string | null) => void
  openPermissions: (userId: string) => void
}

export const useApp = create<AppState>((set) => ({
  active: 'dashboard',
  currentEntityId: null,
  sidebarOpen: true,
  permissionUserId: null,
  setActive: (m) => set({ active: m }),
  setCurrentEntity: (id) => set({ currentEntityId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
  setPermissionUserId: (id) => set({ permissionUserId: id }),
  openPermissions: (userId) => set({ permissionUserId: userId, active: 'manage-permissions' }),
}))
