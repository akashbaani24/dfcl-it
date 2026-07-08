'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { list, action, getOne } from '@/lib/api'
import { toast } from 'sonner'
import { Eye, CheckCircle2, XCircle } from 'lucide-react'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function AdjustmentApprovalPage() {
  const perm = usePerm('adjustments')
  const { setActive } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)
  const [processing, setProcessing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const all = await list('adjustments') as any[]
      // Show only PENDING adjustments for approval
      setRows(all.filter((r: any) => r.status === 'PENDING'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!q) { setFiltered(rows); return }
    const ql = q.toLowerCase()
    setFiltered(rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, rows])

  const approve = async (id: string) => {
    setProcessing(true)
    try {
      await action('approve-adjustment', id, { approver: 'admin' })
      toast.success('Adjustment approved — stock updated')
      setViewing(null)
      load()
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  const reject = async (id: string) => {
    setProcessing(true)
    try {
      await action('reject-adjustment', id, { approver: 'admin' })
      toast.success('Adjustment rejected')
      setViewing(null)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Adjustment Approval"
        description="Review and approve/reject pending stock adjustments"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search adjustments..." />
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No pending adjustments" hint="All adjustments have been processed" />
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
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${r.type === 'INCREASE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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

      {/* View + Approve/Reject dialog */}
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
          </div>
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Serials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.items?.map((it: any, i: number) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{it.item?.name || '—'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                    </TableCell>
                    <TableCell className="font-medium">{it.quantity}</TableCell>
                    <TableCell className="font-mono text-xs">{it.serials || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            <Button variant="destructive" onClick={() => reject(viewing.id)} disabled={processing} className="gap-1">
              <XCircle className="h-4 w-4" /> Reject
            </Button>
            <Button onClick={() => approve(viewing.id)} disabled={processing} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
