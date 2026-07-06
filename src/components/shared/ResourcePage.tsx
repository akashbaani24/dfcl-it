'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil, Trash2, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
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

// Debounce hook — delays calling a function until user stops typing
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
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
  onDataChange,
  deleteWarning,
  enablePagination = true,    // enable server-side pagination
  pageSize = 20,               // records per page
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
  deleteWarning?: string
  enablePagination?: boolean
  pageSize?: number
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
  const debouncedQ = useDebounce(q, 400) // 400ms debounce

  // Pagination state
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { ...(filter || {}) }
      if (debouncedQ) params.search = debouncedQ

      if (enablePagination) {
        params.paginate = '1'
        params.page = String(page)
        params.limit = String(pageSize)
        const r: any = await list(slug, params)
        if (r && Array.isArray(r)) {
          // Backward compat: some endpoints return array directly
          setRows(r)
          setFiltered(r)
          setTotal(r.length)
          setTotalPages(1)
        } else if (r && r.data) {
          setRows(r.data)
          setFiltered(r.data)
          setTotal(r.total || 0)
          setTotalPages(r.totalPages || 0)
        }
      } else {
        const r = await list(slug, params)
        setRows(r as any[])
        setFiltered(r as any[])
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [slug, debouncedQ, JSON.stringify(filter), enablePagination, page, pageSize])

  useEffect(() => {
    load()
  }, [load])

  // Reset to page 1 when search changes
  useEffect(() => {
    if (page !== 1) setPage(1)
  }, [debouncedQ])

  const onAdd = () => {
    setEditing(null)
    setOpen(true)
  }
  const onEdit = (row: any) => {
    setEditing(row)
    setOpen(true)
  }
  const onDelete = async (row: any) => {
    const confirmMsg = deleteWarning
      ? `${deleteWarning}\n\nAre you sure to delete "${row.name || row.itemCode || row.shortCode || row.employeeCode || 'this record'}"?`
      : 'Are you sure to delete this record?'
    if (!confirm(confirmMsg)) return
    try {
      await remove(slug, row.id)
      toast.success('Deleted successfully')
      load()
      onDataChange?.()
    } catch (e: any) {
      let msg = e.message || 'Failed to delete'
      try {
        const parsed = JSON.parse(msg)
        if (parsed.error) msg = parsed.error
      } catch {}
      toast.error(msg, { duration: 6000 })
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

  const exportColumns = columns.map((c) => ({ key: c.key, label: c.label }))

  const onExcel = () => {
    exportToCSV(title.replace(/\s+/g, '_'), filtered, exportColumns)
  }
  const onPDF = () => {
    exportToPDF(title, filtered, exportColumns)
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
      <div className="flex items-center gap-2 mb-3 flex-wrap">
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
        {loading && <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>}
        {enablePagination && total > 0 && !loading && (
          <span className="text-xs text-muted-foreground ml-auto">
            {total} records {totalPages > 1 && `· Page ${page} of ${totalPages}`}
          </span>
        )}
      </div>

      {loading ? (
        // Skeleton loader
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {columns.slice(0, 5).map((_, j) => (
                    <Skeleton key={j} className="h-4 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

            {/* Pagination controls */}
            {enablePagination && totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
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
