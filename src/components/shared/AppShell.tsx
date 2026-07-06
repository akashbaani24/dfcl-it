'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Sidebar } from '@/components/shared/Sidebar'
import { NewsTicker } from '@/components/shared/NewsTicker'
import { LoginPage } from '@/components/shared/LoginPage'
import { Button } from '@/components/ui/button'
import { Menu, X, LogOut, User as UserIcon, Loader2 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dashboard } from '@/components/modules/Dashboard'
import { EntitiesPage } from '@/components/modules/EntitiesPage'
import { DepartmentsPage } from '@/components/modules/DepartmentsPage'
import { EmployeesPage } from '@/components/modules/EmployeesPage'
import { UomsPage } from '@/components/modules/UomsPage'
import { SuppliersPage } from '@/components/modules/SuppliersPage'
import { CategoriesPage } from '@/components/modules/CategoriesPage'
import { ItemsPage } from '@/components/modules/ItemsPage'
import { ItemSerialsPage } from '@/components/modules/ItemSerialsPage'
import { NewsTickerPage } from '@/components/modules/NewsTickerPage'
import { PurchaseRequisitionsPage } from '@/components/modules/PurchaseRequisitionsPage'
import { PurchasesPage } from '@/components/modules/PurchasesPage'
import { PurchaseReturnsPage } from '@/components/modules/PurchaseReturnsPage'
import { StockAllPage } from '@/components/modules/StockAllPage'
import { StockMinePage } from '@/components/modules/StockMinePage'
import { InternalTransfersPage } from '@/components/modules/InternalTransfersPage'
import { AdjustmentsPage } from '@/components/modules/AdjustmentsPage'
import { SalesPage } from '@/components/modules/SalesPage'
import { SalesDeliveryPage } from '@/components/modules/SalesDeliveryPage'
import { SalesReturnsPage } from '@/components/modules/SalesReturnsPage'
import { SalesRefundsPage } from '@/components/modules/SalesRefundsPage'
import { AccountsExpensesPage } from '@/components/modules/AccountsExpensesPage'
import { AccountsReceivePage } from '@/components/modules/AccountsReceivePage'
import { ReportsStockPage } from '@/components/modules/ReportsStockPage'
import { ReportsPurchasePage } from '@/components/modules/ReportsPurchasePage'
import { ReportsSalesPage } from '@/components/modules/ReportsSalesPage'
import { ReportsAccountsPage } from '@/components/modules/ReportsAccountsPage'
import { ReportsSerialPage } from '@/components/modules/ReportsSerialPage'
import { ManagePermissionsPage } from '@/components/modules/ManagePermissionsPage'
import { EmployeeEditPage } from '@/components/modules/EmployeeEditPage'
import { LoginSettingsPage } from '@/components/modules/LoginSettingsPage'

export function AppShell() {
  const { active, sidebarOpen, toggleSidebar, setActive } = useApp()
  const { user, loading, setAuth, setLoading, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Fetch current user on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.id) setAuth(d)
        else setAuth(null)
      })
      .catch(() => setAuth(null))
      .finally(() => setLoading(false))
  }, [setAuth, setLoading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  const handleLogout = async () => {
    await logout()
    setActive('dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="h-14 border-b flex items-center gap-2 px-3 sm:px-4 bg-card">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center text-xs font-bold">DF</div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold leading-tight">DFCL-IT</div>
            <div className="text-[10px] text-muted-foreground">(Test System)</div>
          </div>
        </div>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {user.employee?.name?.[0]?.toUpperCase() || user.userId[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium leading-tight">{user.employee?.name || user.userId}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  {user.role === 'ADMIN' ? '👑 Administrator' : 'User'} · {user.userId}
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user.employee?.name || user.userId}</div>
              <div className="text-xs text-muted-foreground font-normal">{user.employee?.designation || '—'}</div>
              <div className="text-xs text-muted-foreground font-normal">{user.employee?.email || user.userId}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <NewsTicker />

      <div className="flex flex-1">
        <Sidebar />
        {/* Mobile drawer */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="w-64 bg-card border-r shadow-lg">
              <div className="h-14 border-b flex items-center justify-between px-4">
                <span className="text-sm font-bold">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <MobileNav onClose={() => setMobileNavOpen(false)} />
            </div>
            <div className="flex-1 bg-black/30" onClick={() => setMobileNavOpen(false)} />
          </div>
        )}
        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">
          <ModuleRouter active={active} />
        </main>
      </div>

      <footer className="border-t py-3 px-4 text-xs text-muted-foreground text-center">
        DFCL-IT (Test System) © 2026 — Idea & Developed by Abdur Rahman Akash · WhatsApp: 01534955065
      </footer>
    </div>
  )
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const { setActive } = useApp()
  const { hasPerm } = useAuth()
  return (
    <div className="p-2 overflow-y-auto h-[calc(100vh-3.5rem)]">
      <SidebarCompact onPick={() => onClose()} setActive={setActive} hasPerm={hasPerm} />
    </div>
  )
}

import { SECTIONS } from '@/components/shared/SidebarData'
import { PermissionAction } from '@/lib/auth'

function SidebarCompact({ onPick, setActive, hasPerm }: { onPick: () => void; setActive: (m: any) => void; hasPerm: (m: string, a: PermissionAction) => boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s.title, true]))
  )
  const visibleSections = SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => hasPerm(item.key as string, 'canView' as PermissionAction)),
  })).filter((sec) => sec.items.length > 0)
  return (
    <div>
      {visibleSections.map((sec) => {
        const Icon = sec.icon
        const isOpen = open[sec.title]
        return (
          <div key={sec.title} className="mb-1">
            <button
              onClick={() => setOpen((o) => ({ ...o, [sec.title]: !o[sec.title] }))}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent"
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{sec.title}</span>
            </button>
            {isOpen && (
              <div className="ml-3 border-l pl-2 mt-0.5 space-y-0.5">
                {sec.items.map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActive(item.key); onPick() }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] hover:bg-accent"
                    >
                      <ItemIcon className="h-3.5 w-3.5" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ModuleRouter({ active }: { active: any }) {
  switch (active) {
    case 'dashboard': return <Dashboard />
    case 'entities': return <EntitiesPage />
    case 'departments': return <DepartmentsPage />
    case 'employees': return <EmployeesPage />
    case 'uoms': return <UomsPage />
    case 'suppliers': return <SuppliersPage />
    case 'categories': return <CategoriesPage />
    case 'items': return <ItemsPage />
    case 'item-serials': return <ItemSerialsPage />
    case 'news-ticker': return <NewsTickerPage />
    case 'purchase-requisitions': return <PurchaseRequisitionsPage />
    case 'purchases': return <PurchasesPage />
    case 'purchase-returns': return <PurchaseReturnsPage />
    case 'stock-all': return <StockAllPage />
    case 'stock-mine': return <StockMinePage />
    case 'internal-transfers': return <InternalTransfersPage />
    case 'adjustments': return <AdjustmentsPage />
    case 'sales': return <SalesPage />
    case 'sales-delivery': return <SalesDeliveryPage />
    case 'sales-returns': return <SalesReturnsPage />
    case 'sales-refunds': return <SalesRefundsPage />
    case 'accounts-expenses': return <AccountsExpensesPage />
    case 'accounts-receive': return <AccountsReceivePage />
    case 'reports-stock': return <ReportsStockPage />
    case 'reports-purchase': return <ReportsPurchasePage />
    case 'reports-sales': return <ReportsSalesPage />
    case 'reports-accounts': return <ReportsAccountsPage />
    case 'reports-serial': return <ReportsSerialPage />
    case 'manage-permissions': return <ManagePermissionsPage />
    case 'employee-edit': return <EmployeeEditPage />
    case 'login-settings': return <LoginSettingsPage />
    default: return <Dashboard />
  }
}
