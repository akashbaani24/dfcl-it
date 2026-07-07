'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { list } from '@/lib/api'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { Eye, Pencil, AlertTriangle } from 'lucide-react'
import { useApp } from '@/lib/store'

export function PurchasesPage() {
  const perm = usePerm('purchases')
  const { setActive } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await list('purchases') as any[]) }
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
    // Navigate to full-page purchase entry form
    sessionStorage.removeItem('editingPurchaseId')
    setActive('purchase-entry')
  }

  const startEdit = (row: any) => {
    sessionStorage.setItem('editingPurchaseId', row.id)
    setActive('purchase-entry')
  }

  return (
    <div>
      <PageHeader
        title="Purchase"
        description="Create purchase orders, view submitted purchases, and edit ones sent back for revision."
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Purchase"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search purchases..." />
        <ExportButtons
          module="purchases"
          title="Purchase Orders"
          rows={rows.map((r) => ({
          purchaseNo: r.purchaseNo,
          date: new Date(r.purchaseDate).toLocaleDateString(),
          entity: r.entity?.name,
          shippingEntity: r.shippingEntity?.name || r.entity?.name,
          supplier: r.supplier?.name,
          invoice: r.invoiceNo,
          total: r.totalAmount,
          status: r.status,
        }))}
        columns={[
          { key: 'purchaseNo', label: 'PO No' },
          { key: 'date', label: 'Date' },
          { key: 'entity', label: 'Purchase For' },
          { key: 'shippingEntity', label: 'Shipping/Receive' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'invoice', label: 'Invoice' },
          { key: 'total', label: 'Total' },
          { key: 'status', label: 'Status' },
        ]}
        />
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No purchases yet" hint="Create one to start" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Purchase For</TableHead>
                    <TableHead>Shipping/Receive</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.purchaseNo}</TableCell>
                      <TableCell>{new Date(r.purchaseDate).toLocaleDateString()}</TableCell>
                      <TableCell>{r.entity?.name}</TableCell>
                      <TableCell>
                        {r.shippingEntity?.name ? (
                          <span className="text-blue-700 font-medium">{r.shippingEntity?.name}</span>
                        ) : (
                          <span className="text-muted-foreground">{r.entity?.name} (default)</span>
                        )}
                      </TableCell>
                      <TableCell>{r.supplier?.name}</TableCell>
                      <TableCell>{r.invoiceNo || '—'}</TableCell>
                      <TableCell>{r.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge status={r.status} />
                          {r.status === 'SENT_BACK' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-700">
                              <AlertTriangle className="h-3 w-3" />
                              Sent back for edit
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)} title="View details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {perm.canEdit && (r.status === 'SENT_BACK' || r.status === 'SUBMITTED') && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(r)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
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
          {viewing?.status === 'SENT_BACK' && (
            <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Sent back for edit.</span>
              <span className="text-orange-700">Click Edit to revise and re-submit this purchase.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Purchase For (Entity):</span> {viewing?.entity?.name}</div>
            <div>
              <span className="text-muted-foreground">Shipping/Stock Receive:</span>{' '}
              <span className="text-blue-700 font-medium">
                {viewing?.shippingEntity?.name || viewing?.entity?.name || '—'}
              </span>
            </div>
            <div><span className="text-muted-foreground">Supplier:</span> {viewing?.supplier?.name}</div>
            <div><span className="text-muted-foreground">Invoice:</span> {viewing?.invoiceNo || '—'}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.purchaseDate && new Date(viewing.purchaseDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Total:</span> ৳{viewing?.totalAmount?.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Approved By:</span> {viewing?.approvedBy || '—'}</div>
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
          {perm.canEdit && (viewing?.status === 'SENT_BACK' || viewing?.status === 'SUBMITTED') && (
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
              <Button onClick={() => { const v = viewing; setViewing(null); startEdit(v) }}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            </div>
          )}
          {perm.canEdit && viewing?.status !== 'SENT_BACK' && viewing?.status !== 'SUBMITTED' && (
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
