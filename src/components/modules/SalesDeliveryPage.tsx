'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { list, action } from '@/lib/api'
import { toast } from 'sonner'
import { Eye, PackageCheck } from 'lucide-react'
import { usePerm } from '@/components/shared/Perms'

export function SalesDeliveryPage() {
  const perm = usePerm('sales-delivery')
  const [rows, setRows] = useState<any[]>([])
  const [viewing, setViewing] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await list('sales') as any[]
      setRows(r.filter((s) => s.deliveryStatus === 'PENDING'))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const deliver = async (id: string) => {
    if (!confirm('Mark as delivered? Item serials will be marked SOLD and stock reduced.')) return
    try {
      await action('deliver-sales', id)
      toast.success('Delivered. Stock updated.')
      load()
      setViewing(null)
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Sales Order Delivery"
        description="Pending deliveries. Mark delivered once products are physically handed over."
      />
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : rows.length === 0 ? (
        <EmptyState title="No pending deliveries" hint="All sales are delivered" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.salesNo}</TableCell>
                    <TableCell>{new Date(r.salesDate).toLocaleDateString()}</TableCell>
                    <TableCell>{r.entity?.name}</TableCell>
                    <TableCell>{r.customerName}</TableCell>
                    <TableCell>{r.totalAmount.toFixed(2)}</TableCell>
                    <TableCell><Badge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      {perm.canUpdate && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => deliver(r.id)}><PackageCheck className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>Sales {viewing?.salesNo}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Customer:</span> {viewing?.customerName} ({viewing?.customerPhone})</div>
            <div><span className="text-muted-foreground">Entity:</span> {viewing?.entity?.name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.salesDate && new Date(viewing.salesDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Total:</span> ৳{viewing?.totalAmount?.toFixed(2)}</div>
          </div>
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Serials</TableHead></TableRow></TableHeader>
              <TableBody>
                {viewing?.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.item?.name}</TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell className="font-mono text-xs">{it.serials || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            {perm.canUpdate ? (
              <Button onClick={() => deliver(viewing.id)}><PackageCheck className="h-4 w-4 mr-1" /> Mark Delivered</Button>
            ) : (
              <p className="text-xs text-muted-foreground">You don't have permission to mark deliveries.</p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
