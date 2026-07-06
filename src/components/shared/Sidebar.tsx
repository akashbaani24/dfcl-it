'use client'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SECTIONS } from './SidebarData'
import { PermissionAction } from '@/lib/auth'

export function Sidebar() {
  const { active, setActive, sidebarOpen } = useApp()
  const { hasPerm } = useAuth()
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s.title, true])) // all sections open by default
  )

  if (!sidebarOpen) return null

  // Filter sections & items by canView permission
  const visibleSections = SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => hasPerm(item.key as string, 'canView' as PermissionAction)),
  })).filter((sec) => sec.items.length > 0)

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
        {visibleSections.map((sec) => {
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
                      <button
                        key={item.key}
                        onClick={() => setActive(item.key)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] hover:bg-accent transition-colors',
                          isActive && 'bg-primary text-primary-foreground hover:bg-primary'
                        )}
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
      </nav>
    </aside>
  )
}
