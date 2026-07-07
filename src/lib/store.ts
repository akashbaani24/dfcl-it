'use client'
import { create } from 'zustand'

export type ModuleKey =
  | 'dashboard'
  | 'entities' | 'departments' | 'employees' | 'uoms' | 'suppliers' | 'categories' | 'items' | 'item-serials' | 'news-ticker'
  | 'purchase-requisitions' | 'purchases' | 'purchase-approvals' | 'purchase-returns' | 'purchase-receive'
  | 'stock-all' | 'stock-mine' | 'internal-transfers' | 'internal-receive' | 'adjustments'
  | 'sales' | 'sales-delivery' | 'sales-returns' | 'sales-refunds'
  | 'accounts-expenses' | 'accounts-receive'
  | 'reports-stock' | 'reports-purchase' | 'reports-sales' | 'reports-accounts' | 'reports-serial'
  | 'manage-permissions' | 'employee-edit' | 'login-settings' | 'item-edit' | 'account-types'
  | 'generic-add-edit' | 'bank-infos' | 'purchase-entry' | 'entity-selection'
  | 'sales-entry' | 'internal-transfer-entry' | 'internal-receive-entry' | 'barcode-print' | 'qr-code-print'

interface AppState {
  active: ModuleKey
  currentEntityId: string | null
  selectedEntityId: string | null
  selectedEntityName: string | null
  sidebarOpen: boolean
  sidebarCollapsed: boolean  // desktop sidebar hide/show toggle
  permissionUserId: string | null
  setActive: (m: ModuleKey) => void
  setCurrentEntity: (id: string | null) => void
  setSelectedEntity: (id: string, name: string) => void
  clearSelectedEntity: () => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
  toggleSidebarCollapsed: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setPermissionUserId: (id: string | null) => void
  openPermissions: (userId: string) => void
}

export const useApp = create<AppState>((set) => ({
  active: 'dashboard',
  currentEntityId: null,
  selectedEntityId: null,
  selectedEntityName: null,
  sidebarOpen: true,
  sidebarCollapsed: false,
  permissionUserId: null,
  setActive: (m) => set({ active: m }),
  setCurrentEntity: (id) => set({ currentEntityId: id }),
  setSelectedEntity: (id, name) => set({ selectedEntityId: id, selectedEntityName: name }),
  clearSelectedEntity: () => set({ selectedEntityId: null, selectedEntityName: null }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setPermissionUserId: (id) => set({ permissionUserId: id }),
  openPermissions: (userId) => set({ permissionUserId: userId, active: 'manage-permissions' }),
}))
