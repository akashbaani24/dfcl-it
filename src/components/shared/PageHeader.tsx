'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'

export function PageHeader({
  title,
  description,
  onAdd,
  addLabel = 'Add New',
  onSearch,
}: {
  title: string
  description?: string
  onAdd?: () => void
  addLabel?: string
  onSearch?: (q: string) => void
}) {
  const [q, setQ] = useState('')
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {onSearch && (
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); onSearch(e.target.value) }}
              placeholder="Search..."
              className="pl-8 h-9 w-44 sm:w-64"
            />
          </div>
        )}
        {onAdd && (
          <Button onClick={onAdd} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

export function StatCard({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    SUBMITTED: 'bg-yellow-100 text-yellow-800',
    SENT_BACK: 'bg-orange-100 text-orange-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-rose-100 text-rose-800',
    RECEIVED: 'bg-emerald-100 text-emerald-800',
    PARTIAL_RECEIVED: 'bg-sky-100 text-sky-800',
    DELIVERED: 'bg-emerald-100 text-emerald-800',
    RETURNED: 'bg-amber-100 text-amber-800',
    REFUNDED: 'bg-rose-100 text-rose-800',
    IN_STOCK: 'bg-emerald-100 text-emerald-800',
    SOLD: 'bg-rose-100 text-rose-800',
    DAMAGED: 'bg-rose-100 text-rose-800',
    CANCELLED: 'bg-slate-100 text-slate-800',
    CONVERTED: 'bg-sky-100 text-sky-800',
  }
  const cls = map[status] || 'bg-slate-100 text-slate-800'
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>
}
