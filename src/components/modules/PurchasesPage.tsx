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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { list, create, action, getOne } from '@/lib/api'
import { LineItemEditor, LineItem } from '@/components/shared/LineItemEditor'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { toast } from 'sonner'
import { CheckCircle2, Eye, ScanLine } from 'lucide-react'

export function PurchasesPage() {
  const perm = usePerm('purchases')
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const [form, setForm] = useState({ entityId: '', supplierId: '', invoiceNo: '', purchaseDate: new Date().toISOString().slice(0, 10), notes: '' })
  const [lines, setLines] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await list('purchases') as any[]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('suppliers').then((r) => setSuppliers(r as any[])).catch(() => {})
    list('items').then((r) => setItems(r as any[])).catch(() => {})
  }, [load])

  useEffect(() => {
    if (!q) { setFiltered(rows); return }
    const ql = q.toLowerCase()
    setFiltered(rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, rows])

  const startNew = () => {
    setForm({ entityId: '', supplierId: '', invoiceNo: '', purchaseDate: new Date().toISOString().slice(0, 10), notes: '' })
    setLines([])
    setOpen(true)
  }

  const totalAmount = lines.reduce((s, l) => s + (l.totalPrice || 0), 0)

  const save = async () => {
    if (!form.entityId || !form.supplierId) { toast.error('Entity & supplier required'); return }
    if (lines.length === 0) { toast.error('Add items'); return }
    // Validate: serial-tracked items must have serials
    for (const l of lines) {
      if (l.hasSerial) {
        const sns = l.serials.split(',').map((s) => s.trim()).filter(Boolean)
        if (sns.length === 0) {
          toast.error(`Enter serial numbers for ${l.itemName}`)
          return
        }
        if (sns.length !== l.quantity) {
          toast.error(`${l.itemName}: serial count (${sns.length}) doesn't match quantity (${l.quantity})`)
          return
        }
      }
    }
    setSaving(true)
    try {
      const po = await create('purchases', {
        entityId: form.entityId,
        supplierId: form.supplierId,
        invoiceNo: form.invoiceNo,
        purchaseDate: new Date(form.purchaseDate),
        notes: form.notes,
        totalAmount,
        status: 'PENDING',
        items: { create: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice, totalPrice: l.totalPrice, serials: l.serials || null })) },
      })
      toast.success(`Created ${po.purchaseNo}`)
      setOpen(false)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const approve = async (id: string) => {
    if (!confirm('Approve this purchase? This will generate item serials and update stock.')) return
    try {
      await action('approve-purchase', id)
      toast.success('Purchase approved. Stock updated.')
      load()
      setViewing(null)
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Purchase & Approval"
        description="Create purchase orders, enter serial numbers, and approve to update stock."
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
          supplier: r.supplier?.name,
          invoice: r.invoiceNo,
          total: r.totalAmount,
          status: r.status,
        }))}
        columns={[
          { key: 'purchaseNo', label: 'PO No' },
          { key: 'date', label: 'Date' },
          { key: 'entity', label: 'Entity' },
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
                    <TableHead>Entity</TableHead>
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
                      <TableCell>{r.supplier?.name}</TableCell>
                      <TableCell>{r.invoiceNo || '—'}</TableCell>
                      <TableCell>{r.totalAmount.toFixed(2)}</TableCell>
                      <TableCell><Badge status={r.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {r.status === 'PENDING' && perm.canUpdate && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => approve(r.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
            <DialogDescription>Enter items & their serial numbers (printed on product body).</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Entity</Label>
              <Select value={form.entityId} onValueChange={(v) => setForm({ ...form, entityId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select entity" /></SelectTrigger>
                <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Invoice No</Label>
              <Input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} className="mt-1" placeholder="Supplier invoice no" />
            </div>
            <div>
              <Label className="text-xs">Purchase Date</Label>
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs flex items-center gap-1"><ScanLine className="h-3 w-3" /> Items & Serial Numbers</Label>
            <div className="mt-1">
              <LineItemEditor items={items} value={lines} onChange={setLines} showPrice={true} showSerials={true} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Purchase'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          {viewing?.status === 'PENDING' && perm.canUpdate && (
            <DialogFooter>
              <Button onClick={() => approve(viewing.id)}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve & Receive Stock</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
