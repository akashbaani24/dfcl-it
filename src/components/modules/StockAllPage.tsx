'use client'
import { useEffect, useState } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { stockView, list } from '@/lib/api'
import { ScanLine, Barcode } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/shared/PageHeader'

export function StockAllPage() {
  const [data, setData] = useState<any[]>([])
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

  return (
    <div>
      <PageHeader
        title="All Entity Stock"
        description="Aggregated stock view across all entities or filter by entity"
      />
      <div className="mb-3 flex items-end gap-3">
        <div>
          <Label className="text-xs">Entity</Label>
          <Select value={entityId || '__ALL__'} onValueChange={(v) => setEntityId(v === '__ALL__' ? '' : v)}>
            <SelectTrigger className="w-64 mt-1"><SelectValue placeholder="All entities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">All Entities</SelectItem>
              {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load} variant="outline" size="sm">Refresh</Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : data.length === 0 ? (
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
                  {data.filter((r) => r.balance > 0).map((r) => (
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
