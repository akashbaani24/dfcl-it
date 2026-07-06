'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ComboBox } from '@/components/ui/combobox'
import { list, create, action } from '@/lib/api'
import { toast } from 'sonner'
import { Eye, PackageCheck, ScanLine } from 'lucide-react'
import { LineItemEditor, LineItem } from '@/components/shared/LineItemEditor'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

export function SalesPage() {
  const perm = usePerm('sales')
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const [form, setForm] = useState({
    entityId: '', customerName: '', customerPhone: '', customerAddress: '',
    salesDate: new Date().toISOString().slice(0, 10), notes: '', paidAmount: 0,
  })
  const [lines, setLines] = useState<LineItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await list('sales') as any[]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('items').then((r) => setItems(r as any[])).catch(() => {})
  }, [load])

  useEffect(() => {
    if (!q) { setFiltered(rows); return }
    const ql = q.toLowerCase()
    setFiltered(rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, rows])

  const startNew = () => {
    setForm({
      entityId: '', customerName: '', customerPhone: '', customerAddress: '',
      salesDate: new Date().toISOString().slice(0, 10), notes: '', paidAmount: 0,
    })
    setLines([])
    setOpen(true)
  }

  const totalAmount = lines.reduce((s, l) => s + (l.totalPrice || 0), 0)

  const save = async () => {
    if (!form.entityId || !form.customerName) { toast.error('Entity & customer required'); return }
    if (lines.length === 0) { toast.error('Add items'); return }
    for (const l of lines) {
      if (l.hasSerial) {
        const sns = l.serials.split(',').map((s) => s.trim()).filter(Boolean)
        if (sns.length === 0) {
          toast.error(`Enter serial numbers for ${l.itemName}`)
          return
        }
      }
    }
    try {
      const s = await create('sales', {
        entityId: form.entityId,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerAddress: form.customerAddress,
        salesDate: new Date(form.salesDate),
        notes: form.notes,
        totalAmount,
        paidAmount: Number(form.paidAmount) || 0,
        status: 'PENDING',
        deliveryStatus: 'PENDING',
        items: { create: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice, totalPrice: l.totalPrice, serials: l.serials || null })) },
      })
      toast.success(`Created ${s.salesNo}`)
      setOpen(false)
      load()
    } catch (e: any) { toast.error(e.message) }
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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sales Order</DialogTitle>
            <DialogDescription>Enter items and the serial numbers physically being handed over to customer.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Selling Entity</Label>
              <div className="mt-1">
                <ComboBox
                  value={form.entityId || ''}
                  onChange={(v) => setForm({ ...form, entityId: v })}
                  options={entities.map((e) => ({ value: e.id, label: e.name }))}
                  placeholder="Select entity"
                />
              </div>
            </div>
            <div><Label className="text-xs">Sales Date</Label><Input type="date" value={form.salesDate} onChange={(e) => setForm({ ...form, salesDate: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Customer Name</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Customer Phone</Label><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Customer Address</Label><Textarea value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} className="mt-1" rows={2} /></div>
            <div><Label className="text-xs">Paid Amount</Label><Input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) })} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} /></div>
          </div>
          <div className="mt-3">
            <Label className="text-xs flex items-center gap-1"><ScanLine className="h-3 w-3" /> Items & Serials</Label>
            <div className="mt-1">
              <LineItemEditor items={items} value={lines} onChange={setLines} showPrice={true} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Create Sales Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
