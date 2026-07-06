'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { list, create, update, remove } from '@/lib/api'
import { toast } from 'sonner'
import { useApp } from '@/lib/store'

export type Col = {
  key: string
  label: string
  render?: (row: any) => React.ReactNode
  className?: string
}

export function ResourcePage({
  slug,
  title,
  description,
  fields,
  columns,
  addLabel = 'Add New',
  searchField = 'search',
  extraControls,
  onRowClick,
  filter,         // server-side filter params to apply on every list call
  defaultValues,  // values to inject on create (e.g. type=EXPENSE)
}: {
  slug: any
  title: string
  description?: string
  fields: FieldDef[]
  columns: Col[]
  addLabel?: string
  searchField?: string
  extraControls?: React.ReactNode
  onRowClick?: (row: any) => void
  filter?: Record<string, string>
  defaultValues?: Record<string, any>
}) {
  const [rows, setRows] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { ...(filter || {}) }
      if (q) params.search = q
      const r = await list(slug, params)
      setRows(r as any[])
      setFiltered(r as any[])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [slug, q, JSON.stringify(filter)])

  useEffect(() => {
    load()
  }, [load])

  const onAdd = () => {
    setEditing(null)
    setOpen(true)
  }
  const onEdit = (row: any) => {
    setEditing(row)
    setOpen(true)
  }
  const onDelete = async (row: any) => {
    if (!confirm('Are you sure to delete this record?')) return
    try {
      await remove(slug, row.id)
      toast.success('Deleted')
      load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete')
    }
  }
  const onSubmit = async (data: any) => {
    const payload = { ...defaultValues, ...data }
    if (editing) {
      await update(slug, editing.id, payload)
      toast.success('Updated')
    } else {
      await create(slug, payload)
      toast.success('Created')
    }
    load()
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        onAdd={onAdd}
        addLabel={addLabel}
        onSearch={(v) => setQ(v)}
      />
      {extraControls}
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No records found" hint="Add a new record to get started" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c.key} className={c.className}>{c.label}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, i) => (
                    <TableRow key={row.id || i} className={onRowClick ? 'cursor-pointer' : ''} onClick={() => onRowClick?.(row)}>
                      {columns.map((c) => (
                        <TableCell key={c.key} className={c.className}>
                          {c.render ? c.render(row) : (row[c.key] ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(row)} className="h-7 w-7">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(row)} className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit: ${title}` : `Add: ${title}`}
        fields={fields}
        initial={editing || {}}
        onSubmit={onSubmit}
      />
    </div>
  )
}
