'use client'
import { useEffect, useState } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ComboBox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { stockView, list } from '@/lib/api'
import { ScanLine, Barcode } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/shared/PageHeader'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

export function StockAllPage() {
  const perm = usePerm('stock-all')
  const [data, setData] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [entityId, setEntityId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await stockView(entityId || undefined, !entityId, true)
      setData(r)
    } finally { setLoading(false) }
  }
  useEffect(() => { list('entities').then((r) => setEntities(r as any[])).catch(() => {}) }, [])
  useEffect(() => { load() }, [entityId])

  useEffect(() => {
    if (!q) { setFiltered(data); return }
    const ql = q.toLowerCase()
    setFiltered(data.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, data])

  return (
    <div>
      <PageHeader
        title="All Entity Stock"
        description="Aggregated stock view across all entities or filter by entity"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search stock..." />
        <ExportButtons
          module="stock-all"
          title="Stock Summary"
          rows={data.filter((r) => r.balance > 0).map((r) => ({
            itemCode: r.item?.itemCode,
            barcode: r.item?.barcode,
            name: r.item?.name,
            category: r.item?.category?.parent?.name ? r.item.category.parent.name + ' → ' + r.item.category.name : r.item?.category?.name,
            uom: r.item?.uom?.shortCode,
            balance: r.balance,
            serialTracking: r.item?.hasSerial ? 'Yes' : 'No',
          }))}
          columns={[
            { key: 'itemCode', label: 'Item Code' },
            { key: 'barcode', label: 'Barcode' },
            { key: 'name', label: 'Item Name' },
            { key: 'category', label: 'Category' },
            { key: 'uom', label: 'UoM' },
            { key: 'balance', label: 'Balance' },
            { key: 'serialTracking', label: 'Serial Tracking' },
          ]}
        />
      </div>
      <div className="mb-3 flex items-end gap-3">
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
        <Button onClick={load} variant="outline" size="sm">Refresh</Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.filter((r) => r.balance > 0).length === 0 ? (
        <EmptyState title="No stock" hint="No items in stock" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead className="text-right">Balance Qty</TableHead>
                    <TableHead>Serial Tracking</TableHead>
                    <TableHead className="text-right">View Serials</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.filter((r) => r.balance > 0).map((r) => (
                    <TableRow key={r.item.id}>
                      <TableCell className="font-mono text-xs">{r.item.itemCode}</TableCell>
                      <TableCell className="font-mono text-xs"><Barcode className="h-3 w-3 inline mr-1" />{r.item.barcode}</TableCell>
                      <TableCell>{r.item.name}</TableCell>
                      <TableCell>{r.item.category?.parent?.name ? r.item.category.parent.name + ' → ' : ''}{r.item.category?.name}</TableCell>
                      <TableCell>{r.item.uom?.shortCode}</TableCell>
                      <TableCell className="text-right font-bold">{r.balance}</TableCell>
                      <TableCell>
                        {r.item.hasSerial ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                            <ScanLine className="h-3 w-3" /> Yes ({r.serials?.length || 0} in stock)
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Bulk</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.item.hasSerial && r.serials?.length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => setViewing(r)}>View Serials</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Serial Numbers — {viewing?.item?.name}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Currently At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.serials?.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">{s.serialNumber}</TableCell>
                    <TableCell>{s.entity?.name}</TableCell>
                    <TableCell><Badge status={s.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
