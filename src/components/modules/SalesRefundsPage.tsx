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
import { list, create } from '@/lib/api'
import { toast } from 'sonner'
import { Eye } from 'lucide-react'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

export function SalesRefundsPage() {
  const perm = usePerm('sales-refunds')
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const [form, setForm] = useState({ salesId: '', returnId: '', amount: 0, method: 'CASH', refundDate: new Date().toISOString().slice(0, 10), notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await list('sales-refunds') as any[])
      setSales(await list('sales') as any[])
      setReturns(await list('sales-returns') as any[])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!q) { setFiltered(rows); return }
    const ql = q.toLowerCase()
    setFiltered(rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, rows])

  const startNew = () => {
    setForm({ salesId: '', returnId: '', amount: 0, method: 'CASH', refundDate: new Date().toISOString().slice(0, 10), notes: '' })
    setOpen(true)
  }

  const save = async () => {
    if (!form.salesId || !form.amount) { toast.error('Sales & amount required'); return }
    try {
      const r = await create('sales-refunds', {
        salesId: form.salesId,
        returnId: form.returnId || null,
        amount: Number(form.amount),
        method: form.method,
        refundDate: new Date(form.refundDate),
        notes: form.notes,
      })
      toast.success(`Created ${r.refundNo}`)
      setOpen(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Sales Refunds"
        description="Record refunds to customers — by cash, bank, or mobile."
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Refund"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search refunds..." />
        <ExportButtons
          module="sales-refunds"
          title="Sales Refunds"
          rows={rows.map((r) => ({
            refundNo: r.refundNo,
            sales: r.sales?.salesNo,
            date: new Date(r.refundDate).toLocaleDateString(),
            amount: r.amount,
            method: r.method,
            notes: r.notes,
          }))}
          columns={[
            { key: 'refundNo', label: 'Refund No' },
            { key: 'sales', label: 'Sales' },
            { key: 'date', label: 'Date' },
            { key: 'amount', label: 'Amount' },
            { key: 'method', label: 'Method' },
            { key: 'notes', label: 'Notes' },
          ]}
        />
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No refunds" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Refund No</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.refundNo}</TableCell>
                    <TableCell className="font-mono text-sm">{r.sales?.salesNo}</TableCell>
                    <TableCell>{new Date(r.refundDate).toLocaleDateString()}</TableCell>
                    <TableCell>৳{r.amount.toFixed(2)}</TableCell>
                    <TableCell><Badge status={r.method === 'CASH' ? 'DELIVERED' : 'CONVERTED'} />{r.method}</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Sales Refund</DialogTitle>
            <DialogDescription>Record money refunded to customer.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sales Order</Label>
              <Select value={form.salesId} onValueChange={(v) => setForm({ ...form, salesId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select sale" /></SelectTrigger>
                <SelectContent>{sales.map((s) => <SelectItem key={s.id} value={s.id}>{s.salesNo} — {s.customerName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sales Return (optional)</Label>
              <Select value={form.returnId} onValueChange={(v) => setForm({ ...form, returnId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Link to return (optional)" /></SelectTrigger>
                <SelectContent>{returns.map((r) => <SelectItem key={r.id} value={r.id}>{r.returnNo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="mt-1" /></div>
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK">Bank</SelectItem>
                  <SelectItem value="MOBILE">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Refund Date</Label><Input type="date" value={form.refundDate} onChange={(e) => setForm({ ...form, refundDate: e.target.value })} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Refund {viewing?.refundNo}</DialogTitle></DialogHeader>
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Sales:</span> {viewing?.sales?.salesNo}</div>
            <div><span className="text-muted-foreground">Amount:</span> ৳{viewing?.amount?.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Method:</span> {viewing?.method}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.refundDate && new Date(viewing.refundDate).toLocaleDateString()}</div>
            {viewing?.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
