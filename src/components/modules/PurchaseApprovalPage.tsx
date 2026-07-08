'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { list, action, invalidateCache } from '@/lib/api'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { toast } from 'sonner'
import { Eye, CheckCircle2, Undo2 } from 'lucide-react'

export function PurchaseApprovalPage() {
  const perm = usePerm('purchase-approvals')
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Only purchases awaiting approval are shown here.
      const all = await list('purchases', { status: 'SUBMITTED' }) as any[]
      setRows(all)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!q) { setFiltered(rows); return }
    const ql = q.toLowerCase()
    setFiltered(rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, rows])

  const approve = async (id: string) => {
    if (!confirm('Approve this purchase? You can then receive stock via Purchase Receive.')) return
    setBusy(true)
    try {
      await action('approve-purchase', id)
      // Bust the cached list so a re-load reflects the new status
      invalidateCache('purchases')
      toast.success('Purchase approved. Use Purchase Receive to receive stock.')
      setViewing(null)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve')
    } finally {
      setBusy(false)
    }
  }

  const sendBack = async (id: string) => {
    if (!confirm('Send this purchase back for editing?')) return
    setBusy(true)
    try {
      await action('send-back-purchase', id)
      invalidateCache('purchases')
      toast.success('Purchase sent back for editing')
      setViewing(null)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to send back')
    } finally {
      setBusy(false)
    }
  }

  const canApprove = perm.canUpdate

  return (
    <div>
      <PageHeader
        title="Purchase Approval"
        description="Review submitted purchases. Approve to release for stock receipt, or send back for editing."
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search submitted purchases..." />
        <ExportButtons
          module="purchase-approvals"
          title="Purchase Approval Queue"
          rows={rows.map((r) => ({
            purchaseNo: r.purchaseNo,
            date: new Date(r.purchaseDate).toLocaleDateString(),
            entity: r.entity?.name,
            supplier: r.supplier?.name,
            total: r.totalAmount,
            status: r.status,
          }))}
          columns={[
            { key: 'purchaseNo', label: 'PO No' },
            { key: 'date', label: 'Date' },
            { key: 'entity', label: 'Entity' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'total', label: 'Total' },
            { key: 'status', label: 'Status' },
          ]}
        />
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No purchases awaiting approval" hint="Submitted purchases will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="font-mono text-sm text-primary underline-offset-2 hover:underline"
                          onClick={() => setViewing(r)}
                          title="View details"
                        >
                          {r.purchaseNo}
                        </button>
                      </TableCell>
                      <TableCell>{new Date(r.purchaseDate).toLocaleDateString()}</TableCell>
                      <TableCell>{r.entity?.name}</TableCell>
                      <TableCell>{r.supplier?.name}</TableCell>
                      <TableCell>{r.totalAmount.toFixed(2)}</TableCell>
                      <TableCell><Badge status={r.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)} title="View details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canApprove && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600"
                              onClick={() => approve(r.id)}
                              title="Approve"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-orange-600"
                              onClick={() => sendBack(r.id)}
                              title="Send for edit"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase {viewing?.purchaseNo}</DialogTitle>
            <DialogDescription>Status: {viewing?.status}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Entity:</span> {viewing?.entity?.name}</div>
            <div><span className="text-muted-foreground">Supplier:</span> {viewing?.supplier?.name}</div>
            <div><span className="text-muted-foreground">Invoice:</span> {viewing?.invoiceNo || '—'}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.purchaseDate && new Date(viewing.purchaseDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Total:</span> ৳{viewing?.totalAmount?.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Created By:</span> {viewing?.createdBy || '—'}</div>
          </div>
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Serials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.item?.name}</TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell>{it.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>{it.totalPrice.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-xs">{it.serials || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {canApprove && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
              <Button
                variant="outline"
                className="text-orange-700 border-orange-300 hover:bg-orange-50"
                onClick={() => sendBack(viewing.id)}
                disabled={busy}
              >
                <Undo2 className="h-4 w-4 mr-1" /> Send for Edit
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => approve(viewing.id)}
                disabled={busy}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
