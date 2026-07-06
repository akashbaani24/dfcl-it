'use client'
import { create } from 'zustand'

export type ModuleKey =
  | 'dashboard'
  | 'entities' | 'departments' | 'employees' | 'uoms' | 'suppliers' | 'categories' | 'items' | 'item-serials' | 'news-ticker'
  | 'purchase-requisitions' | 'purchases' | 'purchase-returns'
  | 'stock-all' | 'stock-mine' | 'internal-transfers' | 'adjustments'
  | 'sales' | 'sales-delivery' | 'sales-returns' | 'sales-refunds'
  | 'accounts-expenses' | 'accounts-receive'
  | 'reports-stock' | 'reports-purchase' | 'reports-sales' | 'reports-accounts' | 'reports-serial'

interface AppState {
  active: ModuleKey
  currentEntityId: string | null   // "My Entity" filter for stock
  sidebarOpen: boolean
  setActive: (m: ModuleKey) => void
  setCurrentEntity: (id: string | null) => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
}

export const useApp = create<AppState>((set) => ({
  active: 'dashboard',
  currentEntityId: null,
  sidebarOpen: true,
  setActive: (m) => set({ active: m }),
  setCurrentEntity: (id) => set({ currentEntityId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
}))
