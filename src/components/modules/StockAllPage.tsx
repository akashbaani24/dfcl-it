'use client'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ComboBox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { stockView, list } from '@/lib/api'
import { Barcode, RefreshCw, ScanLine } from 'lucide-react'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

// A flattened display row — one row per (item, entity) for non-serial items,
// or one row per IN_STOCK serial for serial-tracked items.
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

// Build display rows from the stockView API response.
// - When entityId is provided (single entity filter), non-serial items show one row
//   with that entity and the per-entity balance.
// - When all=1 (no entity filter), non-serial items show one row per perEntity entry.
function buildRows(
  data: any[],
  entityId: string,
  selectedEntity?: { name: string; shortCode: string } | null,
): StockRow[] {
  const rows: StockRow[] = []
  for (const r of data) {
    const item = r.item
    if (!item) continue
    const uomShort = item.uom?.shortCode || '—'
    const itemBarcode = item.barcode || '—'

    // Serial-tracked items: one row per IN_STOCK serial
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
          entityName: s.entity?.name || '—',
          entityShortCode: s.entity?.shortCode || '—',
          qty: 1,
          uom: uomShort,
          isSerial: true,
          expiryDate: r.expiryDate || "",
        })
      }
      continue
    }

    // Non-serial items: per-entity breakdown (all mode) or single row (entity filter)
    if (entityId) {
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
          expiryDate: r.expiryDate || "",
      })
    } else {
      const perEntity: any[] = r.perEntity || []
      if (perEntity.length > 0) {
        for (const pe of perEntity) {
          rows.push({
            key: `bulk-${item.id}-${pe.entity?.id || 'x'}`,
            itemId: item.id,
            itemName: item.name,
            itemCode: item.itemCode || '',
            barcode: itemBarcode,
            serialNumber: '—',
            entityName: pe.entity?.name || '—',
            entityShortCode: pe.entity?.shortCode || '—',
            qty: pe.quantity || 0,
            uom: uomShort,
            isSerial: false,
          expiryDate: r.expiryDate || "",
          expiryDate: r.expiryDate || "",
          })
        }
      } else if ((r.balance || 0) > 0) {
        // Fallback (e.g. legacy cached response without perEntity)
        rows.push({
          key: `bulk-${item.id}-total`,
          itemId: item.id,
          itemName: item.name,
          itemCode: item.itemCode || '',
          barcode: itemBarcode,
          serialNumber: '—',
          entityName: '—',
          entityShortCode: '—',
          qty: r.balance,
          uom: uomShort,
          isSerial: false,
          expiryDate: r.expiryDate || "",
          expiryDate: r.expiryDate || "",
        })
      }
    }
  }
  return rows
}

export function StockAllPage() {
  const perm = usePerm('stock-all')
  const [data, setData] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [entities, setEntities] = useState<any[]>([])
  const [entityId, setEntityId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      // When no entity is selected → fetch all entities aggregated (with perEntity breakdown)
      // When an entity is selected → fetch stock filtered to that entity
      const r = await stockView(entityId || undefined, !entityId, true)
      setData(r)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
  }, [])
  useEffect(() => {
    load()
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
        title="All Entity Stock"
        description="Stock across all entities — each serial on its own row, bulk items grouped per entity"
      />

      {/* Top row: Search (left) + Entity filter & exports (right) */}
      <div className="flex items-end gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search item / barcode / serial / entity..." />
        <div className="ml-auto flex items-end gap-2">
          <div>
            <Label className="text-xs">Entity</Label>
            <div className="mt-1 w-64">
              <ComboBox
                value={entityId || '__ALL__'}
                onChange={(v) => setEntityId(v === '__ALL__' ? '' : v)}
                options={[
                  { value: '__ALL__', label: 'All Entities' },
                  ...entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode })),
                ]}
                placeholder="All entities"
              />
            </div>
          </div>
          <Button onClick={load} variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <ExportButtons
        module="stock-all"
        title="All Entity Stock"
        rows={exportRows}
        columns={exportColumns}
      />

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No stock" hint="No items in stock for the current filter" />
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
                  {filtered.map((r, idx) => {
                    const expiryColor = (() => {
                      if (!r.expiryDate) return 'text-muted-foreground'
                      const d = new Date(r.expiryDate)
                      const now = new Date()
                      const daysLeft = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      if (daysLeft < 0) return 'text-red-600 font-medium'
                      if (daysLeft <= 30) return 'text-amber-600 font-medium'
                      return 'text-green-600'
                    })()
                    const fmtExpiry = (dateStr: string) => {
                      if (!dateStr) return '—'
                      try { return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
                      catch { return '—' }
                    }
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
