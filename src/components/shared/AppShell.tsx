'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Sidebar } from '@/components/shared/Sidebar'
import { NewsTicker } from '@/components/shared/NewsTicker'
import { LoginPage } from '@/components/shared/LoginPage'
import { Button } from '@/components/ui/button'
import { Menu, X, LogOut, User as UserIcon, Loader2, Building2, Bell, MessageCircle, X as XIcon, Send, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
// ---------------------------------------------------------------------------
// Lazy-loaded module pages.
//
// Every module page is now a SEPARATE JavaScript chunk loaded on demand via
// next/dynamic. Previously ALL ~45 modules were statically imported at the
// top of this file, which meant the initial page-load bundle included the
// code for every single screen (purchases, sales, reports, barcode printing,
// permission manager, etc.) even though the user only sees one at a time.
//
// These modules are only ever rendered AFTER client-side auth + entity
// resolution (see the early returns below for `loading` / `!user` /
// `!selectedEntityId`), so they are never part of the server-rendered HTML.
// That makes `ssr: false` safe here and avoids any hydration-mismatch risk
// while giving us maximum code-splitting benefit: the first paint only needs
// the Dashboard chunk.
// ---------------------------------------------------------------------------
function ModuleLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}
const dyn = (loader: () => Promise<any>) =>
  dynamic(loader, { ssr: false, loading: ModuleLoader })

const Dashboard = dyn(() => import('@/components/modules/Dashboard').then(m => ({ default: m.Dashboard })))
const EntitiesPage = dyn(() => import('@/components/modules/EntitiesPage').then(m => ({ default: m.EntitiesPage })))
const DepartmentsPage = dyn(() => import('@/components/modules/DepartmentsPage').then(m => ({ default: m.DepartmentsPage })))
const EmployeesPage = dyn(() => import('@/components/modules/EmployeesPage').then(m => ({ default: m.EmployeesPage })))
const UomsPage = dyn(() => import('@/components/modules/UomsPage').then(m => ({ default: m.UomsPage })))
const SuppliersPage = dyn(() => import('@/components/modules/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const CategoriesPage = dyn(() => import('@/components/modules/CategoriesPage').then(m => ({ default: m.CategoriesPage })))
const ItemsPage = dyn(() => import('@/components/modules/ItemsPage').then(m => ({ default: m.ItemsPage })))
const ItemSerialsPage = dyn(() => import('@/components/modules/ItemSerialsPage').then(m => ({ default: m.ItemSerialsPage })))
const NewsTickerPage = dyn(() => import('@/components/modules/NewsTickerPage').then(m => ({ default: m.NewsTickerPage })))
const PurchaseRequisitionsPage = dyn(() => import('@/components/modules/PurchaseRequisitionsPage').then(m => ({ default: m.PurchaseRequisitionsPage })))
const PurchasesPage = dyn(() => import('@/components/modules/PurchasesPage').then(m => ({ default: m.PurchasesPage })))
const PurchaseApprovalPage = dyn(() => import('@/components/modules/PurchaseApprovalPage').then(m => ({ default: m.PurchaseApprovalPage })))
const PurchaseReturnsPage = dyn(() => import('@/components/modules/PurchaseReturnsPage').then(m => ({ default: m.PurchaseReturnsPage })))
const PurchaseReceivePage = dyn(() => import('@/components/modules/PurchaseReceivePage').then(m => ({ default: m.PurchaseReceivePage })))
const StockAllPage = dyn(() => import('@/components/modules/StockAllPage').then(m => ({ default: m.StockAllPage })))
const StockMinePage = dyn(() => import('@/components/modules/StockMinePage').then(m => ({ default: m.StockMinePage })))
const InternalTransfersPage = dyn(() => import('@/components/modules/InternalTransfersPage').then(m => ({ default: m.InternalTransfersPage })))
const InternalReceivePage = dyn(() => import('@/components/modules/InternalReceivePage').then(m => ({ default: m.InternalReceivePage })))
const AdjustmentsPage = dyn(() => import('@/components/modules/AdjustmentsPage').then(m => ({ default: m.AdjustmentsPage })))
const SalesPage = dyn(() => import('@/components/modules/SalesPage').then(m => ({ default: m.SalesPage })))
const SalesDeliveryPage = dyn(() => import('@/components/modules/SalesDeliveryPage').then(m => ({ default: m.SalesDeliveryPage })))
const SalesReturnsPage = dyn(() => import('@/components/modules/SalesReturnsPage').then(m => ({ default: m.SalesReturnsPage })))
const SalesRefundsPage = dyn(() => import('@/components/modules/SalesRefundsPage').then(m => ({ default: m.SalesRefundsPage })))
const AccountsExpensesPage = dyn(() => import('@/components/modules/AccountsExpensesPage').then(m => ({ default: m.AccountsExpensesPage })))
const AccountsReceivePage = dyn(() => import('@/components/modules/AccountsReceivePage').then(m => ({ default: m.AccountsReceivePage })))
const ReportsStockPage = dyn(() => import('@/components/modules/ReportsStockPage').then(m => ({ default: m.ReportsStockPage })))
const ReportsPurchasePage = dyn(() => import('@/components/modules/ReportsPurchasePage').then(m => ({ default: m.ReportsPurchasePage })))
const ReportsSalesPage = dyn(() => import('@/components/modules/ReportsSalesPage').then(m => ({ default: m.ReportsSalesPage })))
const ReportsAccountsPage = dyn(() => import('@/components/modules/ReportsAccountsPage').then(m => ({ default: m.ReportsAccountsPage })))
const ReportsSerialPage = dyn(() => import('@/components/modules/ReportsSerialPage').then(m => ({ default: m.ReportsSerialPage })))
const ManagePermissionsPage = dyn(() => import('@/components/modules/ManagePermissionsPage').then(m => ({ default: m.ManagePermissionsPage })))
const EmployeeEditPage = dyn(() => import('@/components/modules/EmployeeEditPage').then(m => ({ default: m.EmployeeEditPage })))
const LoginSettingsPage = dyn(() => import('@/components/modules/LoginSettingsPage').then(m => ({ default: m.LoginSettingsPage })))
const ItemEditPage = dyn(() => import('@/components/modules/ItemEditPage').then(m => ({ default: m.ItemEditPage })))
const AccountTypesPage = dyn(() => import('@/components/modules/AccountTypesPage').then(m => ({ default: m.AccountTypesPage })))
const BankInfosPage = dyn(() => import('@/components/modules/BankInfosPage').then(m => ({ default: m.BankInfosPage })))
const PurchaseEntryPage = dyn(() => import('@/components/modules/PurchaseEntryPage').then(m => ({ default: m.PurchaseEntryPage })))
const SalesEntryPage = dyn(() => import('@/components/modules/SalesEntryPage').then(m => ({ default: m.SalesEntryPage })))
const InternalTransferEntryPage = dyn(() => import('@/components/modules/InternalTransferEntryPage').then(m => ({ default: m.InternalTransferEntryPage })))
const InternalReceiveEntryPage = dyn(() => import('@/components/modules/InternalReceiveEntryPage').then(m => ({ default: m.InternalReceiveEntryPage })))
const BarcodePrintPage = dyn(() => import('@/components/modules/BarcodePrintPage').then(m => ({ default: m.BarcodePrintPage })))
const QRCodePrintPage = dyn(() => import('@/components/modules/QRCodePrintPage').then(m => ({ default: m.QRCodePrintPage })))
const AdjustmentEntryPage = dyn(() => import('@/components/modules/AdjustmentEntryPage').then(m => ({ default: m.AdjustmentEntryPage })))
const AdjustmentApprovalPage = dyn(() => import('@/components/modules/AdjustmentApprovalPage').then(m => ({ default: m.AdjustmentApprovalPage })))
const AdjustmentApprovalViewPage = dyn(() => import('@/components/modules/AdjustmentApprovalPage').then(m => ({ default: m.AdjustmentApprovalViewPage })))
const ReportsAdjustmentPage = dyn(() => import('@/components/modules/ReportsAdjustmentPage').then(m => ({ default: m.ReportsAdjustmentPage })))
const ExpenseEntryPage = dyn(() => import('@/components/modules/ExpenseEntryPage').then(m => ({ default: m.ExpenseEntryPage })))
const PasswordResetRequestsPage = dyn(() => import('@/components/modules/PasswordResetRequestsPage').then(m => ({ default: m.PasswordResetRequestsPage })))
import { EntitySelectionPage } from '@/components/shared/EntitySelectionPage'
import { GenericAddEditPage } from '@/components/shared/GenericAddEditPage'
// (module page imports below are lazy — see ModuleLoader / dyn helper)

export function AppShell() {
  const { active, sidebarOpen, toggleSidebar, setActive, selectedEntityId, selectedEntityName, clearSelectedEntity, sidebarCollapsed, toggleSidebarCollapsed } = useApp()
  const { user, loading, setAuth, setLoading, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([])
  const [chatInput, setChatInput] = useState('')

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

  // On mount: restore entity from sessionStorage (if present) and process hash routing.
  // Both steps run in the SAME effect so the entity restore settles BEFORE the hash module
  // is activated — this is what makes "Open in new tab" from the sidebar land on the target
  // page instead of the entity selection page.
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1) Restore entity from localStorage if present (localStorage is shared across tabs)
    const stored = localStorage.getItem('selectedEntityId')
    const storedName = localStorage.getItem('selectedEntityName')
    if (stored && storedName) {
      useApp.getState().setSelectedEntity(stored, storedName)
    }

    // 2) Hash-based routing — if URL has #module, open that module (for new tab)
    if (window.location.hash) {
      const hash = window.location.hash.substring(1)
      const validModules = [
        'dashboard', 'entities', 'departments', 'employees', 'uoms', 'suppliers',
        'categories', 'items', 'item-serials', 'news-ticker', 'login-settings',
        'account-types', 'bank-infos', 'purchase-requisitions', 'purchases',
        'purchase-approvals', 'purchase-returns', 'purchase-receive', 'stock-all', 'stock-mine',
        'internal-transfers', 'internal-receive', 'adjustments', 'sales',
        'sales-delivery', 'sales-returns', 'sales-refunds', 'accounts-expenses',
        'accounts-receive', 'reports-stock', 'reports-purchase', 'reports-sales',
        'reports-accounts', 'reports-serial', 'manage-permissions',
        'purchase-entry',
        'sales-entry',
        'internal-transfer-entry',
        'internal-receive-entry',
        'barcode-print',
        'qr-code-print',
        'adjustment-entry',
        'adjustment-approval',
        'adjustment-approval-view',
        'reports-adjustment',
        'expense-entry',
        'expense-receive-entry',
        'password-reset-requests',
      ]
      if (validModules.includes(hash)) {
        setTimeout(() => useApp.getState().setActive(hash as any), 0)
      }
    }
  }, [])

  // Fetch notifications (pending approvals, low stock, etc.)
  useEffect(() => {
    if (!user || !selectedEntityId) return
    const fetchNotifs = async () => {
      try {
        const [purchases, sales, reqs] = await Promise.all([
          fetch('/api/resource?slug=purchases&status=SUBMITTED').then(r => r.json()).catch(() => []),
          fetch('/api/resource?slug=sales&status=PENDING').then(r => r.json()).catch(() => []),
          fetch('/api/resource?slug=purchase-requisitions&status=PENDING').then(r => r.json()).catch(() => []),
        ])
        const notifs: any[] = []
        if (Array.isArray(purchases)) {
          purchases.forEach((p: any) => {
            notifs.push({ type: 'purchase', text: `Purchase ${p.purchaseNo} awaiting approval`, id: p.id, module: 'purchase-approvals' })
          })
        }
        if (Array.isArray(sales)) {
          sales.forEach((s: any) => {
            notifs.push({ type: 'sales', text: `Sales ${s.salesNo} pending delivery`, id: s.id, module: 'sales-delivery' })
          })
        }
        if (Array.isArray(reqs)) {
          reqs.forEach((r: any) => {
            notifs.push({ type: 'req', text: `Requisition ${r.reqNo} awaiting approval`, id: r.id, module: 'purchase-requisitions' })
          })
        }
        setNotifications(notifs)
      } catch {}
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [user, selectedEntityId])

  // Chat send
  const sendChat = () => {
    if (!chatInput.trim()) return
    const msg = chatInput.trim()
    setChatMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatInput('')
    // Simulated response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Thank you for your message. Our support team will get back to you soon. For urgent issues, call 01534955065.' }])
    }, 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  // After login, check if entity is selected (in store) or available in localStorage
  // localStorage is shared across tabs — so new tab can restore entity from it
  const hasStoredEntity =
    typeof window !== 'undefined' && !!localStorage.getItem('selectedEntityId')
  if (!selectedEntityId && !hasStoredEntity) {
    return <EntitySelectionPage />
  }

  const handleLogout = async () => {
    await logout()
    clearSelectedEntity()
    localStorage.removeItem('selectedEntityId')
    localStorage.removeItem('selectedEntityName')
    localStorage.removeItem('selectedEntityCode')
    setActive('dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky top section — header + news ticker stay fixed when scrolling */}
      <div className="sticky top-0 z-40">
        {/* Top bar */}
        <header className="h-14 border-b flex items-center gap-2 px-3 sm:px-4 bg-card">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        {/* Desktop sidebar toggle — hides/shows the sidebar */}
        <Button variant="ghost" size="icon" className="hidden md:flex" onClick={toggleSidebarCollapsed} title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}>
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center text-xs font-bold">DF</div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold leading-tight">DFCL-IT</div>
            <div className="text-[10px] text-muted-foreground">(Test System)</div>
          </div>
        </div>
        <div className="flex-1" />
        {/* Notification bell */}
        <div className="relative">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={() => setNotifOpen(!notifOpen)}>
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </Button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-card border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
              <div className="px-3 py-2 border-b font-semibold text-sm flex items-center justify-between">
                <span>Notifications</span>
                <span className="text-xs text-muted-foreground">{notifications.length} new</span>
              </div>
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">No new notifications</div>
              ) : (
                notifications.map((n, i) => (
                  <button
                    key={i}
                    onClick={() => { setActive(n.module as any); setNotifOpen(false) }}
                    className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-accent transition-colors flex items-start gap-2"
                  >
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.type === 'purchase' ? 'bg-amber-500' : n.type === 'sales' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                    <span className="text-xs">{n.text}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {/* Selected entity badge */}
        <button
          onClick={() => setActive('entity-selection')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors text-xs"
          title="Change entity"
        >
          <Building2 className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-medium text-blue-700">{selectedEntityName || 'Select Entity'}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              {user.employee?.photo ? (
                <img
                  src={user.employee.photo}
                  alt={user.employee?.name || user.userId}
                  className="h-7 w-7 rounded-full object-cover border"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {user.employee?.name?.[0]?.toUpperCase() || user.userId[0].toUpperCase()}
                </div>
              )}
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
              <div className="flex items-center gap-2 mb-1">
                {user.employee?.photo ? (
                  <img
                    src={user.employee.photo}
                    alt={user.employee?.name || user.userId}
                    className="h-10 w-10 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {user.employee?.name?.[0]?.toUpperCase() || user.userId[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium">{user.employee?.name || user.userId}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user.employee?.designation || '—'}</div>
                </div>
              </div>
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
      </div>{/* end sticky top section */}

      <div className="flex flex-1">
        {/* Desktop sidebar — hidden when sidebarCollapsed is true */}
        {!sidebarCollapsed && (
          <div className="hidden md:block">
            <Sidebar />
          </div>
        )}
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

      {/* Floating Chat Widget — bottom right */}
      {chatOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-card rounded-lg shadow-2xl border z-50 flex flex-col">
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Support Chat</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 rounded p-1">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Hi! How can we help you?</p>
                <p className="mt-1">Type your message below.</p>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-xs ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-muted text-foreground'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          {/* Chat input */}
          <div className="p-2 border-t flex gap-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }}
              placeholder="Type a message..."
              className="flex-1 h-9 px-3 border rounded-lg bg-background text-xs focus:outline-none focus:border-blue-500"
            />
            <button onClick={sendChat} className="h-9 w-9 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Chat toggle button — floating bottom right */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center z-50"
        title="Chat with support"
      >
        {chatOpen ? <XIcon className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
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
    case 'purchase-approvals': return <PurchaseApprovalPage />
    case 'purchase-returns': return <PurchaseReturnsPage />
    case 'purchase-receive': return <PurchaseReceivePage />
    case 'stock-all': return <StockAllPage />
    case 'stock-mine': return <StockMinePage />
    case 'internal-transfers': return <InternalTransfersPage />
    case 'internal-receive': return <InternalReceivePage />
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
    case 'item-edit': return <ItemEditPage />
    case 'account-types': return <AccountTypesPage />
    case 'bank-infos': return <BankInfosPage />
    case 'purchase-entry': return <PurchaseEntryPage />
    case 'sales-entry': return <SalesEntryPage />
    case 'internal-transfer-entry': return <InternalTransferEntryPage />
    case 'internal-receive-entry': return <InternalReceiveEntryPage />
    case 'barcode-print': return <BarcodePrintPage />
    case 'qr-code-print': return <QRCodePrintPage />
    case 'adjustment-entry': return <AdjustmentEntryPage />
    case 'adjustment-approval': return <AdjustmentApprovalPage />
    case 'adjustment-approval-view': return <AdjustmentApprovalViewPage />
    case 'reports-adjustment': return <ReportsAdjustmentPage />
    case 'expense-entry': return <ExpenseEntryPage />
    case 'expense-receive-entry': return <ExpenseEntryPage entryType="RECEIVE" backTo="accounts-receive" />
    case 'password-reset-requests': return <PasswordResetRequestsPage />
    case 'entity-selection': return <EntitySelectionPage />
    case 'generic-add-edit': return <GenericAddEditPageWrapper />
    default: return <Dashboard />
  }
}

// Wrapper that reads config from sessionStorage and renders GenericAddEditPage
function GenericAddEditPageWrapper() {
  const config = typeof window !== 'undefined' ? sessionStorage.getItem('genericAddEditConfig') : null
  if (!config) return <div className="p-6 text-sm text-muted-foreground">No config found. Go back.</div>
  // Parse config outside of any JSX construction so render-time errors are not
  // swallowed by a try/catch (which would violate react-hooks/error-boundaries).
  let parsed: { slug: string; title: string; fields: any[]; defaultValues?: Record<string, any>; backTo: any } | null = null
  try {
    parsed = JSON.parse(config)
  } catch {
    return <div className="p-6 text-sm text-muted-foreground">Invalid config.</div>
  }
  if (!parsed) return <div className="p-6 text-sm text-muted-foreground">Invalid config.</div>
  const { slug, title, fields, defaultValues, backTo } = parsed
  return (
    <GenericAddEditPage
      slug={slug}
      title={title}
      fields={fields}
      defaultValues={defaultValues}
      backTo={backTo}
    />
  )
}
