'use client'
import { useApp } from '@/lib/store'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SECTIONS } from './SidebarData'

// Map module keys to URL hash for new tab
const MODULE_TO_HASH: Record<string, string> = {
  dashboard: 'dashboard',
  entities: 'entities',
  departments: 'departments',
  employees: 'employees',
  uoms: 'uoms',
  suppliers: 'suppliers',
  categories: 'categories',
  items: 'items',
  'item-serials': 'item-serials',
  'news-ticker': 'news-ticker',
  'login-settings': 'login-settings',
  'account-types': 'account-types',
  'bank-infos': 'bank-infos',
  'purchase-requisitions': 'purchase-requisitions',
  purchases: 'purchases',
  'purchase-returns': 'purchase-returns',
  'purchase-receive': 'purchase-receive',
  'stock-all': 'stock-all',
  'stock-mine': 'stock-mine',
  'internal-transfers': 'internal-transfers',
  'internal-receive': 'internal-receive',
  adjustments: 'adjustments',
  sales: 'sales',
  'sales-delivery': 'sales-delivery',
  'sales-returns': 'sales-returns',
  'sales-refunds': 'sales-refunds',
  'accounts-expenses': 'accounts-expenses',
  'accounts-receive': 'accounts-receive',
  'reports-stock': 'reports-stock',
  'reports-purchase': 'reports-purchase',
  'reports-sales': 'reports-sales',
  'reports-accounts': 'reports-accounts',
  'reports-serial': 'reports-serial',
  'manage-permissions': 'manage-permissions',
}

export function Sidebar() {
  const { active, setActive, sidebarOpen } = useApp()
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s.title, true]))
  )

  if (!sidebarOpen) return null

  const openInNewTab = (moduleKey: string) => {
    const hash = MODULE_TO_HASH[moduleKey] || moduleKey
    window.open(`${window.location.origin}${window.location.pathname}#${hash}`, '_blank')
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 border-r bg-card/40 backdrop-blur-sm flex-col">
      <div className="h-14 flex items-center px-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center font-bold text-xs">DF</div>
          <div>
            <div className="text-sm font-bold leading-tight">DFCL-IT</div>
            <div className="text-[10px] text-muted-foreground">(Test System)</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 max-h-[calc(100vh-3.5rem)]">
        {SECTIONS.map((sec) => {
          const isOpen = open[sec.title]
          const Icon = sec.icon
          const anyActive = sec.items.some((i) => i.key === active)
          return (
            <div key={sec.title} className="mb-1">
              <button
                onClick={() => setOpen((o) => ({ ...o, [sec.title]: !o[sec.title] }))}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors',
                  anyActive && 'bg-accent/60 font-medium'
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-left">{sec.title}</span>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {isOpen && (
                <div className="ml-3 border-l pl-2 mt-0.5 space-y-0.5">
                  {sec.items.map((item) => {
                    const ItemIcon = item.icon
                    const isActive = active === item.key
                    return (
                      <div
                        key={item.key}
                        className={cn(
                          'group w-full flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] hover:bg-accent transition-colors',
                          isActive && 'bg-primary text-primary-foreground hover:bg-primary'
                        )}
                      >
                        <button
                          onClick={() => setActive(item.key)}
                          className="flex items-center gap-2 flex-1 text-left min-w-0"
                        >
                          <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 text-left truncate">{item.label}</span>
                        </button>
                        {/* Open in new tab icon — shows on hover */}
                        <button
                          onClick={(e) => { e.stopPropagation(); openInNewTab(item.key as string) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 hover:text-blue-500"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
