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
import { list, create, action } from '@/lib/api'
import { toast } from 'sonner'
import { Eye, RotateCcw } from 'lucide-react'
import { LineItemEditor, LineItem } from '@/components/shared/LineItemEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

export function SalesReturnsPage() {
  const perm = usePerm('sales-returns')
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const [form, setForm] = useState({ salesId: '', reason: '', returnDate: new Date().toISOString().slice(0, 10) })
  const [lines, setLines] = useState<LineItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await list('sales-returns') as any[])
      const s = await list('sales') as any[]
      setSales(s.filter((x) => x.deliveryStatus === 'DELIVERED'))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    list('items').then((r) => setItems(r as any[])).catch(() => {})
  }, [load])

  useEffect(() => {
    if (!q) { setFiltered(rows); return }
    const ql = q.toLowerCase()
    setFiltered(rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, rows])

  const startNew = () => {
    setForm({ salesId: '', reason: '', returnDate: new Date().toISOString().slice(0, 10) })
    setLines([])
    setOpen(true)
  }

  const onSalesSelect = (id: string) => {
    setForm({ ...form, salesId: id })
    const s = sales.find((x) => x.id === id)
    if (s) {
      setLines(s.items.map((it: any) => ({
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
    if (!form.salesId || lines.length === 0) { toast.error('Select sales & items'); return }
    const total = lines.reduce((s, l) => s + l.totalPrice, 0)
    try {
      const r = await create('sales-returns', {
        salesId: form.salesId,
        reason: form.reason,
        returnDate: new Date(form.returnDate),
        totalAmount: total,
        items: { create: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice, totalPrice: l.totalPrice, serials: l.serials || null })) },
      })
      await action('sales-return', r.id)
      toast.success(`Created ${r.returnNo}`)
      setOpen(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Sales Returns"
        description="Customer returns. Returned serials are marked IN_STOCK again."
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Return"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search returns..." />
        <ExportButtons
          module="sales-returns"
          title="Sales Returns"
          rows={rows.map((r) => ({
            returnNo: r.returnNo,
            sales: r.sales?.salesNo,
            date: new Date(r.returnDate).toLocaleDateString(),
            reason: r.reason,
            total: r.totalAmount,
          }))}
          columns={[
            { key: 'returnNo', label: 'Return No' },
            { key: 'sales', label: 'Sales' },
            { key: 'date', label: 'Date' },
            { key: 'reason', label: 'Reason' },
            { key: 'total', label: 'Total' },
          ]}
        />
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No returns" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return No</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.returnNo}</TableCell>
                    <TableCell className="font-mono text-sm">{r.sales?.salesNo}</TableCell>
                    <TableCell>{new Date(r.returnDate).toLocaleDateString()}</TableCell>
                    <TableCell>{r.reason || '—'}</TableCell>
                    <TableCell>{r.totalAmount.toFixed(2)}</TableCell>
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
            <DialogTitle>New Sales Return</DialogTitle>
            <DialogDescription>Select a delivered sale, edit items & serials to return.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sales Order</Label>
              <Select value={form.salesId} onValueChange={onSalesSelect}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select delivered sale" /></SelectTrigger>
                <SelectContent>{sales.map((s) => <SelectItem key={s.id} value={s.id}>{s.salesNo} — {s.customerName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Return Date</Label><Input type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1" rows={2} /></div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Items to Return</Label>
            <div className="mt-1">
              <LineItemEditor items={items} value={lines} onChange={setLines} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}><RotateCcw className="h-4 w-4 mr-1" /> Save Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Return {viewing?.returnNo}</DialogTitle></DialogHeader>
          <div className="text-sm grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Sales:</span> {viewing?.sales?.salesNo}</div>
            <div><span className="text-muted-foreground">Reason:</span> {viewing?.reason}</div>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}

