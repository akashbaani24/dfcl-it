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
import { Eye, PackageCheck, Pencil } from 'lucide-react'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

export function SalesPage() {
  const perm = usePerm('sales')
  const { setActive } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await list('sales') as any[]) }
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
    sessionStorage.removeItem('editingSalesId')
    setActive('sales-entry')
  }

  const startEdit = (row: any) => {
    sessionStorage.setItem('editingSalesId', row.id)
    setActive('sales-entry')
  }

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Create sales orders with serial numbers of products being sold."
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Sale"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search sales..." />
        <ExportButtons
          module="sales"
          title="Sales Orders"
          rows={rows.map((r) => ({
            salesNo: r.salesNo,
            date: new Date(r.salesDate).toLocaleDateString(),
            entity: r.entity?.name,
            customer: r.customerName,
            phone: r.customerPhone,
            total: r.totalAmount,
            paid: r.paidAmount,
            status: r.status,
            delivery: r.deliveryStatus,
          }))}
          columns={[
            { key: 'salesNo', label: 'Sales No' },
            { key: 'date', label: 'Date' },
            { key: 'entity', label: 'Entity' },
            { key: 'customer', label: 'Customer' },
            { key: 'phone', label: 'Phone' },
            { key: 'total', label: 'Total' },
            { key: 'paid', label: 'Paid' },
            { key: 'status', label: 'Status' },
            { key: 'delivery', label: 'Delivery' },
          ]}
        />
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No sales yet" />
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
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.salesNo}</TableCell>
                    <TableCell>{new Date(r.salesDate).toLocaleDateString()}</TableCell>
                    <TableCell>{r.entity?.name}</TableCell>
                    <TableCell>{r.customerName}</TableCell>
                    <TableCell>{r.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>{r.paidAmount.toFixed(2)}</TableCell>
                    <TableCell><Badge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                      {perm.canEdit && r.status === 'PENDING' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(r)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
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
            <DialogTitle>Sales {viewing?.salesNo}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Customer:</span> {viewing?.customerName}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing?.customerPhone || '—'}</div>
            <div><span className="text-muted-foreground">Entity:</span> {viewing?.entity?.name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.salesDate && new Date(viewing.salesDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Total:</span> ৳{viewing?.totalAmount?.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Paid:</span> ৳{viewing?.paidAmount?.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Delivery:</span> <Badge status={viewing?.deliveryStatus} /></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge status={viewing?.status} /></div>
          </div>
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Total</TableHead><TableHead>Serials</TableHead></TableRow></TableHeader>
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
          {viewing?.status === 'PENDING' && perm.canUpdate && (
            <DialogFooter>
              <Button onClick={() => { action('deliver-sales', viewing.id).then(() => { toast.success('Delivered & stock updated'); load(); setViewing(null) }) }}>
                <PackageCheck className="h-4 w-4 mr-1" /> Mark Delivered (Update Stock)
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
