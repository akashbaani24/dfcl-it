'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Building2, Search, ArrowRight, LogOut } from 'lucide-react'
import { list } from '@/lib/api'
import { toast } from 'sonner'

export function EntitySelectionPage() {
  const { setActive, setCurrentEntity, setSelectedEntity } = useApp()
  const { user, logout } = useAuth()
  const [entities, setEntities] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadEntities = async () => {
      const userEntities = user?.userEntities || []
      if (user?.role === 'ADMIN') {
        try {
          const r = await list('entities')
          if (!cancelled) {
            const ents = r as any[]
            setEntities(ents)
          }
        } catch {}
      } else if (userEntities.length > 0) {
        const ents = userEntities.map((ue: any) => ue.entity).filter(Boolean)
        if (!cancelled) {
          setEntities(ents)
        }
      } else {
        if (!cancelled) {
          setEntities([])
        }
      }
      if (!cancelled) setLoading(false)
    }
    loadEntities()
    return () => { cancelled = true }
  }, [user])

  // Filter entities based on search
  const searchFiltered = q
    ? entities.filter((e) =>
        e.name?.toLowerCase().includes(q.toLowerCase()) ||
        e.shortCode?.toLowerCase().includes(q.toLowerCase()) ||
        e.address?.toLowerCase().includes(q.toLowerCase())
      )
    : entities

  const selectEntity = (entity: any) => {
    setCurrentEntity(entity.id)
    setSelectedEntity(entity.id, entity.name)
    sessionStorage.setItem('selectedEntityId', entity.id)
    sessionStorage.setItem('selectedEntityName', entity.name)
    sessionStorage.setItem('selectedEntityCode', entity.shortCode)
    toast.success(`Entered: ${entity.name}`)
    setActive('dashboard')
  }

  const handleLogout = async () => {
    await logout()
    sessionStorage.removeItem('selectedEntityId')
    sessionStorage.removeItem('selectedEntityName')
    sessionStorage.removeItem('selectedEntityCode')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading entities...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center font-bold text-xs">DF</div>
          <div>
            <div className="text-sm font-bold leading-tight">DFCL-IT</div>
            <div className="text-[10px] text-muted-foreground">{user?.employee?.name || user?.userId}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 text-destructive">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Select Your Entity</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose the entity you want to work with</p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search entity by name, code, or address..."
              className="pl-10 h-11 bg-white"
              autoFocus
            />
          </div>

          {/* Entity list */}
          {searchFiltered.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">No entities found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {entities.length === 0
                  ? 'You do not have access to any entity. Contact admin.'
                  : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchFiltered.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => selectEntity(entity)}
                  className="group bg-white rounded-lg border p-4 text-left hover:border-blue-500 hover:shadow-md transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{entity.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">{entity.shortCode}</span>
                        {entity.address && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:block">{entity.address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
