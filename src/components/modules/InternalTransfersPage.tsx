'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { list, action } from '@/lib/api'
import { toast } from 'sonner'
import { Eye, CheckCircle2 } from 'lucide-react'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

export function InternalTransfersPage() {
  const perm = usePerm('internal-transfers')
  const { setActive } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await list('internal-transfers') as any[]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!q) { setFiltered(rows); return }
    const ql = q.toLowerCase()
    setFiltered(rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, rows])

  const startNew = () => {
    setActive('internal-transfer-entry')
  }

  const receive = async (id: string) => {
    if (!confirm('Mark this transfer as received? Stock will be moved to destination entity.')) return
    try {
      await action('receive-transfer', id)
      toast.success('Transfer received. Stock moved.')
      load()
      setViewing(null)
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Internal Transfers"
        description="Move stock between entities. Source entity releases, destination receives."
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Transfer"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search transfers..." />
        <ExportButtons
          module="internal-transfers"
          title="Internal Transfers"
          rows={rows.map((r) => ({
            transferNo: r.transferNo,
            date: new Date(r.transferDate).toLocaleDateString(),
            from: r.fromEntity?.name,
            to: r.toEntity?.name,
            status: r.status,
          }))}
          columns={[
            { key: 'transferNo', label: 'Transfer No' },
            { key: 'date', label: 'Date' },
            { key: 'from', label: 'From' },
            { key: 'to', label: 'To' },
            { key: 'status', label: 'Status' },
          ]}
        />
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No transfers" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer No</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.transferNo}</TableCell>
                    <TableCell>{r.fromEntity?.name}</TableCell>
                    <TableCell>{r.toEntity?.name}</TableCell>
                    <TableCell>{new Date(r.transferDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      {r.status === 'PENDING' && perm.canUpdate && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => receive(r.id)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer {viewing?.transferNo}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">From:</span> {viewing?.fromEntity?.name}</div>
            <div><span className="text-muted-foreground">To:</span> {viewing?.toEntity?.name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.transferDate && new Date(viewing.transferDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Status:</span> {viewing?.status}</div>
          </div>
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Barcodes / Serials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.items?.length > 0 ? (
                  viewing.items.map((it: any, idx: number) => (
                    <TableRow key={it.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{it.item?.name || '—'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                      </TableCell>
                      <TableCell className="font-medium">{it.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{it.item?.uom?.shortCode || '—'}</TableCell>
                      <TableCell>
                        {it.serials ? (
                          <div className="flex flex-wrap gap-1">
                            {it.serials.split(',').map((s: string, i: number) => (
                              <span key={i} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      No items in this transfer
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {viewing?.status === 'PENDING' && perm.canUpdate && (
            <DialogFooter>
              <Button onClick={() => receive(viewing.id)}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Received</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
