'use client'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ComboBox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { stockView, list } from '@/lib/api'
import { Barcode, MapPin, RefreshCw, ScanLine } from 'lucide-react'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

// A flattened display row — one row per IN_STOCK serial for serial-tracked items,
// or one row per item (using the selected entity) for bulk items.
type StockRow = {
  key: string
  itemId: string
  itemName: string
  itemCode: string
  barcode: string
  serialNumber: string
  entityName: string
  entityShortCode: string
  qty: number
  uom: string
  isSerial: boolean
  expiryDate: string
}

function fmtExpiry(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    // Red if expired, amber if within 30 days, green otherwise
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

function buildRows(
  data: any[],
  entityId: string,
  selectedEntity?: { name: string; shortCode: string } | null,
): StockRow[] {
  const rows: StockRow[] = []
  if (!entityId) return rows
  for (const r of data) {
    const item = r.item
    if (!item) continue
    const uomShort = item.uom?.shortCode || '—'
    const itemBarcode = item.barcode || '—'
    const expiry = r.expiryDate || ''

    // Serial-tracked items: one row per IN_STOCK serial (API already filters by entity)
    const inStockSerials = (r.serials || []).filter((s: any) => s.status === "IN_STOCK")
    if (inStockSerials.length > 0) {
      for (const s of inStockSerials) {
        if (s.status && s.status !== 'IN_STOCK') continue
        rows.push({
          key: `serial-${s.id}`,
          itemId: item.id,
          itemName: item.name,
          itemCode: item.itemCode || '',
          barcode: s.barcode || (s.serialNumber?.startsWith('BC-') ? s.serialNumber.replace('BC-', '') : itemBarcode),
          serialNumber: s.serialNumber?.startsWith('BC-') ? '—' : (s.serialNumber || '—'),
          entityName: s.entity?.name || selectedEntity?.name || '—',
          entityShortCode: s.entity?.shortCode || selectedEntity?.shortCode || '—',
          qty: 1,
          uom: uomShort,
          isSerial: true,
          expiryDate: expiry,
        })
      }
      continue
    }

    // Non-serial items: one row with the selected entity and per-entity balance
    const balance = r.balance || 0
    if (balance <= 0) continue
    rows.push({
      key: `bulk-${item.id}-${entityId}`,
      itemId: item.id,
      itemName: item.name,
      itemCode: item.itemCode || '',
      barcode: itemBarcode,
      serialNumber: '—',
      entityName: selectedEntity?.name || '—',
      entityShortCode: selectedEntity?.shortCode || '—',
      qty: balance,
      uom: uomShort,
      isSerial: false,
      expiryDate: expiry,
    })
  }
  return rows
}

export function StockMinePage() {
  const perm = usePerm('stock-mine')
  const [data, setData] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [entities, setEntities] = useState<any[]>([])
  // Pre-select entity from localStorage 'selectedEntityId' (set by AppShell on entity selection)
  const [entityId, setEntityId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Load entity options
  useEffect(() => {
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
  }, [])

  // Pre-select entity from localStorage on mount (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('selectedEntityId')
    if (stored && !entityId) setEntityId(stored)
  }, [])

  const load = async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const r = await stockView(entityId, false, true)
      setData(r)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (entityId) load()
  }, [entityId])

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === entityId) || null,
    [entities, entityId],
  )

  const allRows = useMemo(
    () => buildRows(data, entityId, selectedEntity),
    [data, entityId, selectedEntity],
  )

  const filtered = useMemo(() => {
    if (!q) return allRows
    const ql = q.toLowerCase()
    return allRows.filter(
      (r) =>
        r.itemName.toLowerCase().includes(ql) ||
        r.itemCode.toLowerCase().includes(ql) ||
        r.barcode.toLowerCase().includes(ql) ||
        r.serialNumber.toLowerCase().includes(ql) ||
        r.entityName.toLowerCase().includes(ql) ||
        r.entityShortCode.toLowerCase().includes(ql),
    )
  }, [q, allRows])

  // Pagination
  useEffect(() => { setPage(1) }, [filtered, pageSize])
  const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize)
  const pagedRows = pageSize === 0 ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  const exportRows = filtered.map((r, i) => ({
    sl: i + 1,
    entity: r.entityShortCode,
    itemName: r.itemName,
    barcode: r.barcode,
    serialNumber: r.serialNumber,
    qty: r.qty,
    uom: r.uom,
  }))
  const exportColumns = [
    { key: 'sl', label: 'Sl No' },
    { key: 'entity', label: 'Entity' },
    { key: 'itemName', label: 'Item Name' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'serialNumber', label: 'Serial Number' },
    { key: 'qty', label: 'Qty' },
    { key: 'uom', label: 'UoM' },
  ]

  if (!perm.canView) {
    return <EmptyState title="Access denied" hint="You don't have permission to view this page" />
  }

  return (
    <div>
      <PageHeader
        title="My Entity Stock"
        description="Stock currently held by a specific entity — each serial on its own row"
      />

      {/* Top row: Search (left) + Entity picker & exports (right) */}
      <div className="flex items-end gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search item / barcode / serial..." />
        {!loading && filtered.length > 0 && (
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="h-8 text-xs border rounded-md px-2 bg-card"
          >
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={0}>All</option>
          </select>
        )}
        {filtered.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {filtered.length} records{pageSize > 0 && totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
          </span>
        )}
        <div className="ml-auto flex items-end gap-2">
          <div>
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Select Your Entity
            </Label>
            <div className="mt-1 w-64">
              <ComboBox
                value={entityId || ''}
                onChange={setEntityId}
                options={entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode }))}
                placeholder="Select entity"
              />
            </div>
          </div>
          {entityId && (
            <Button onClick={load} variant="outline" size="sm" className="gap-1">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          )}
        </div>
      </div>

      <ExportButtons
        module="stock-mine"
        title="My Entity Stock"
        rows={exportRows}
        columns={exportColumns}
      />

      {!entityId ? (
        <EmptyState title="Select an entity" hint="Choose your entity to see its stock" />
      ) : loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No stock at this entity" hint="Try a different entity or refresh" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-16">Sl No</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead>Expiry / Warranty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.map((r, idx) => {
                    const expiryColor = (() => {
                      if (!r.expiryDate) return 'text-muted-foreground'
                      const d = new Date(r.expiryDate)
                      const now = new Date()
                      const daysLeft = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      if (daysLeft < 0) return 'text-red-600 font-medium'
                      if (daysLeft <= 30) return 'text-amber-600 font-medium'
                      return 'text-green-600'
                    })()
                    return (
                    <TableRow key={r.key}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-medium font-mono">{r.entityShortCode}</span>
                          <span className="text-[10px] text-muted-foreground">{r.entityName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="flex items-center gap-1.5">
                        {r.isSerial && <ScanLine className="h-3 w-3 text-emerald-600 shrink-0" />}
                        <span>{r.itemName}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        <Barcode className="h-3 w-3 inline mr-1" />{r.barcode}
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{r.serialNumber}</TableCell>
                      <TableCell className="text-right font-bold">{r.qty}</TableCell>
                      <TableCell>{r.uom}</TableCell>
                      <TableCell className={`text-xs whitespace-nowrap ${expiryColor}`}>
                        {fmtExpiry(r.expiryDate)}
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="gap-1">
                  ← Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="gap-1">
                  Next →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
