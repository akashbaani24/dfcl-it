'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, FileSpreadsheet, FileText } from 'lucide-react'
import { list, create, update, remove } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import { PermissionAction } from '@/lib/auth'
import { exportToCSV, exportToPDF } from '@/lib/export'

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
  filter,
  defaultValues,
  moduleKey,
  onDataChange,  // called after create/update/delete so parent can refresh
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
  moduleKey?: string
  onDataChange?: () => void
}) {
  const { hasPerm } = useAuth()
  const permModule = moduleKey || (slug as string)
  const canCreate = hasPerm(permModule, 'canCreate' as PermissionAction)
  const canEdit = hasPerm(permModule, 'canEdit' as PermissionAction)
  const canDelete = hasPerm(permModule, 'canDelete' as PermissionAction)
  const canExcel = hasPerm(permModule, 'canExcel' as PermissionAction)
  const canPdf = hasPerm(permModule, 'canPdf' as PermissionAction)

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
      onDataChange?.()
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
    onDataChange?.()
  }

  // Build export columns from `columns` (skip render-only fields — use raw row value)
  const exportColumns = columns.map((c) => ({ key: c.key, label: c.label }))

  const onExcel = () => {
    const exportRows = filtered.map((r) => {
      const flat: any = {}
      for (const c of columns) {
        flat[c.key] = r[c.key]
      }
      return flat
    })
    exportToCSV(title.replace(/\s+/g, '_'), exportRows, exportColumns)
  }
  const onPDF = () => {
    const exportRows = filtered.map((r) => {
      const flat: any = {}
      for (const c of columns) {
        flat[c.key] = r[c.key]
      }
      return flat
    })
    exportToPDF(title, exportRows, exportColumns)
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        onAdd={canCreate ? onAdd : undefined}
        addLabel={addLabel}
        onSearch={(v) => setQ(v)}
      />
      <div className="flex items-center gap-2 mb-3">
        {canExcel && (
          <Button variant="outline" size="sm" onClick={onExcel} className="gap-1">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        )}
        {canPdf && (
          <Button variant="outline" size="sm" onClick={onPDF} className="gap-1">
            <FileText className="h-4 w-4" /> PDF
          </Button>
        )}
        {extraControls}
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No records found" hint={canCreate ? 'Add a new record to get started' : undefined} />
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
                    {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
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
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => onEdit(row)} className="h-7 w-7">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => onDelete(row)} className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      )}
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
