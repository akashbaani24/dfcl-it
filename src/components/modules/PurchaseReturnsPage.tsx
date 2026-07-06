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
import { list, create, action } from '@/lib/api'
import { toast } from 'sonner'
import { Eye, Undo2 } from 'lucide-react'
import { LineItemEditor, LineItem } from '@/components/shared/LineItemEditor'
import { usePerm, ExportButtons } from '@/components/shared/Perms'

export function PurchaseReturnsPage() {
  const perm = usePerm('purchase-returns')
  const [returns, setReturns] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ purchaseId: '', reason: '', returnDate: new Date().toISOString().slice(0, 10) })
  const [lines, setLines] = useState<LineItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setReturns(await list('purchase-returns') as any[])
      const ps = await list('purchases') as any[]
      setPurchases(ps.filter((p) => p.status === 'RECEIVED'))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    list('items').then((r) => setItems(r as any[])).catch(() => {})
  }, [load])

  const startNew = () => {
    setForm({ purchaseId: '', reason: '', returnDate: new Date().toISOString().slice(0, 10) })
    setLines([])
    setOpen(true)
  }

  const onPurchaseSelect = (id: string) => {
    setForm({ ...form, purchaseId: id })
    const p = purchases.find((x) => x.id === id)
    if (p) {
      // Pre-fill lines from purchase items
      setLines(p.items.map((it: any) => ({
        id: Math.random().toString(36).slice(2),
        itemId: it.itemId,
        itemName: it.item?.name,
        hasSerial: it.item?.hasSerial,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.unitPrice * it.quantity,
        serials: it.serials || '',
      })))
    }
  }

  const save = async () => {
    if (!form.purchaseId || lines.length === 0) { toast.error('Select purchase & items'); return }
    const total = lines.reduce((s, l) => s + l.totalPrice, 0)
    try {
      const r = await create('purchase-returns', {
        purchaseId: form.purchaseId,
        reason: form.reason,
        returnDate: new Date(form.returnDate),
        totalAmount: total,
        items: { create: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice, totalPrice: l.totalPrice, serials: l.serials || null })) },
      })
      await action('purchase-return', r.id)
      toast.success(`Created ${r.returnNo}`)
      setOpen(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Purchase Returns"
        description="Return items to supplier. Serials are marked as RETURNED."
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Return"
      />
      <ExportButtons
        module="purchase-returns"
        title="Purchase Returns"
        rows={returns.map((r) => ({
          returnNo: r.returnNo,
          purchase: r.purchase?.purchaseNo,
          date: new Date(r.returnDate).toLocaleDateString(),
          reason: r.reason,
          total: r.totalAmount,
        }))}
        columns={[
          { key: 'returnNo', label: 'Return No' },
          { key: 'purchase', label: 'Purchase' },
          { key: 'date', label: 'Date' },
          { key: 'reason', label: 'Reason' },
          { key: 'total', label: 'Total' },
        ]}
      />
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : returns.length === 0 ? (
        <EmptyState title="No returns" hint="Create a return when needed" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return No</TableHead>
                  <TableHead>Purchase</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.returnNo}</TableCell>
                    <TableCell className="font-mono text-sm">{r.purchase?.purchaseNo}</TableCell>
                    <TableCell>{new Date(r.returnDate).toLocaleDateString()}</TableCell>
                    <TableCell>{r.reason || '—'}</TableCell>
                    <TableCell>{r.totalAmount.toFixed(2)}</TableCell>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Return</DialogTitle>
            <DialogDescription>Select the purchase, edit quantity/serials to return.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Purchase</Label>
              <Select value={form.purchaseId} onValueChange={onPurchaseSelect}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select received purchase" /></SelectTrigger>
                <SelectContent>{purchases.map((p) => <SelectItem key={p.id} value={p.id}>{p.purchaseNo} — {p.supplier?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Return Date</Label>
              <Input type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1" rows={2} />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Items to Return</Label>
            <div className="mt-1">
              <LineItemEditor items={items} value={lines} onChange={setLines} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}><Undo2 className="h-4 w-4 mr-1" /> Save Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return {viewing?.returnNo}</DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Purchase:</span> {viewing?.purchase?.purchaseNo}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.returnDate && new Date(viewing.returnDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Reason:</span> {viewing?.reason}</div>
          </div>
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Total</TableHead><TableHead>Serials</TableHead></TableRow>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
