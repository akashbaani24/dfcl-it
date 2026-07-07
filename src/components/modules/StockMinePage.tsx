'use client'
import { useEffect, useState } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ComboBox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { stockView, list } from '@/lib/api'
import { ScanLine, Barcode, MapPin } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

export function StockMinePage() {
  const perm = usePerm('stock-mine')
  const [data, setData] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [entityId, setEntityId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)

  useEffect(() => { list('entities').then((r) => setEntities(r as any[])).catch(() => {}) }, [])

  const load = async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const r = await stockView(entityId, false, true)
      setData(r)
    } finally { setLoading(false) }
  }
  useEffect(() => { if (entityId) load() }, [entityId])

  useEffect(() => {
    if (!q) { setFiltered(data); return }
    const ql = q.toLowerCase()
    setFiltered(data.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, data])

  return (
    <div>
      <PageHeader
        title="My Entity Stock"
        description="Stock currently held by a specific entity (branch/showroom/warehouse)"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search stock..." />
        <ExportButtons
          module="stock-mine"
          title="My Entity Stock"
          rows={data.filter((r) => r.balance > 0).map((r) => ({
            itemCode: r.item?.itemCode,
            barcode: r.item?.barcode,
            name: r.item?.name,
            category: r.item?.category?.name,
            balance: r.balance,
            serials: r.item?.hasSerial ? (r.serials?.length || 0) : '—',
          }))}
          columns={[
            { key: 'itemCode', label: 'Item Code' },
            { key: 'barcode', label: 'Barcode' },
            { key: 'name', label: 'Item Name' },
            { key: 'category', label: 'Category' },
            { key: 'balance', label: 'Balance' },
            { key: 'serials', label: 'Serials In Stock' },
          ]}
        />
      </div>
      <div className="mb-3 flex items-end gap-3">
        <div>
          <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Select Your Entity</Label>
          <div className="mt-1 w-64">
            <ComboBox
              value={entityId || ''}
              onChange={setEntityId}
              options={entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode }))}
              placeholder="Select entity"
            />
          </div>
        </div>
        {entityId && <Button onClick={load} variant="outline" size="sm">Refresh</Button>}
      </div>

      {!entityId ? (
        <EmptyState title="Select an entity" hint="Choose your entity to see its stock" />
      ) : loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.filter((r) => r.balance > 0).length === 0 ? (
        <EmptyState title="No stock at this entity" />
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
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Serials In Stock</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.filter((r) => r.balance > 0).map((r) => (
                    <TableRow key={r.item.id}>
                      <TableCell className="font-mono text-xs">{r.item.itemCode}</TableCell>
                      <TableCell className="font-mono text-xs"><Barcode className="h-3 w-3 inline mr-1" />{r.item.barcode}</TableCell>
                      <TableCell>{r.item.name}</TableCell>
                      <TableCell>{r.item.category?.name}</TableCell>
                      <TableCell className="text-right font-bold">{r.balance}</TableCell>
                      <TableCell>
                        {r.item.hasSerial ? (
                          <span className="text-xs inline-flex items-center gap-1 text-emerald-700">
                            <ScanLine className="h-3 w-3" /> {r.serials?.length || 0} serial(s)
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.item.hasSerial && r.serials?.length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => setViewing(r)}>View</Button>
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
            <DialogTitle>Serials — {viewing?.item?.name}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.serials?.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">{s.serialNumber}</TableCell>
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
