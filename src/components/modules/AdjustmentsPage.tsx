'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye } from 'lucide-react'
import { list, getOne } from '@/lib/api'
import { toast } from 'sonner'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function AdjustmentsPage() {
  const perm = usePerm('adjustments')
  const { setActive } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)

  // Date panel
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await list('adjustments') as any[]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let result = rows
    // Date filter
    if (fromDate) {
      result = result.filter(r => new Date(r.adjustDate) >= new Date(fromDate + 'T00:00:00.000Z'))
    }
    if (toDate) {
      result = result.filter(r => new Date(r.adjustDate) <= new Date(toDate + 'T23:59:59.999Z'))
    }
    // Search filter
    if (q) {
      const ql = q.toLowerCase()
      result = result.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql))
    }
    setFiltered(result)
  }, [q, rows, fromDate, toDate])

  const startNew = () => { setActive('adjustment-entry') }

  // Parse serials for view dialog
  const parseItem = (it: any, adjType?: string) => {
    let adjustType = '—'
    let barcode = '—'
    let serial = '—'
    if (it.serials && it.serials.includes('ADJTYPE:')) {
      const parts = it.serials.split('|')
      const typePart = parts.find(p => p.startsWith('ADJTYPE:'))
      if (typePart) adjustType = typePart.split(':')[1]
      const dataParts = parts.filter(p => !p.startsWith('ADJTYPE:') && !p.startsWith('EFFECT:'))
      if (dataParts.length > 0) {
        const data = dataParts.join('').split(',')
        barcode = data[0] || '—'
        serial = data[1] || '—'
      }
    } else if (it.serials) {
      barcode = it.serials.split(',')[0] || '—'
      serial = it.serials.split(',')[1] || '—'
      if (adjType === 'INCREASE') adjustType = 'EXCESS'
      else if (adjType === 'DECREASE') adjustType = 'SHORTAGE'
    }
    return { adjustType, barcode, serial }
  }

  return (
    <div>
      <PageHeader
        title="Adjustments"
        description="Stock adjustments — excess, shortage, reject, wastage. Requires approval."
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Adjustment"
      />

      {/* Date Panel */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div>
          <Label className="text-xs font-semibold">From</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-36 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-xs font-semibold">To</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-36 text-xs mt-0.5" />
        </div>
        {(fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate('') }} className="mt-4">
            Clear
          </Button>
        )}
        <SearchInput value={q} onChange={setQ} placeholder="Search adjustments..." />
        <ExportButtons
          module="adjustments"
          title="Adjustments"
          rows={filtered.map((r) => ({
            adjustNo: r.adjustNo,
            date: new Date(r.adjustDate).toLocaleDateString(),
            entity: r.entity?.name,
            type: r.type,
            reason: r.reason,
            status: r.status,
            items: r.items?.length || 0,
          }))}
          columns={[
            { key: 'adjustNo', label: 'Adjust No' },
            { key: 'date', label: 'Date' },
            { key: 'entity', label: 'Entity' },
            { key: 'type', label: 'Type' },
            { key: 'reason', label: 'Reason' },
            { key: 'status', label: 'Status' },
            { key: 'items', label: 'Items' },
          ]}
        />
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No adjustments" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjust No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.adjustNo}</TableCell>
                    <TableCell>{new Date(r.adjustDate).toLocaleDateString()}</TableCell>
                    <TableCell>{r.entity?.name}</TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${r.type === 'INCREASE' ? 'bg-green-100 text-green-700' : r.type === 'DECREASE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.reason || '—'}</TableCell>
                    <TableCell>{r.items?.length || 0}</TableCell>
                    <TableCell><Badge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjustment {viewing?.adjustNo}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Entity:</span> {viewing?.entity?.name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.adjustDate && new Date(viewing.adjustDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Type:</span> {viewing?.type}</div>
            <div><span className="text-muted-foreground">Reason:</span> {viewing?.reason || '—'}</div>
            <div><span className="text-muted-foreground">Status:</span> {viewing?.status}</div>
          </div>
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Adjust Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.items?.map((it: any, i: number) => {
                  const parsed = parseItem(it, viewing?.type)
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{it.item?.name || '—'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{parsed.barcode}</TableCell>
                      <TableCell className="font-mono text-xs">{parsed.serial}</TableCell>
                      <TableCell className="font-medium">{it.quantity}</TableCell>
                      <TableCell className="text-xs">{it.item?.uom?.shortCode || '—'}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${parsed.adjustType === 'EXCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {parsed.adjustType}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
