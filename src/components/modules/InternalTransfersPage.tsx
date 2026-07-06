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
import { Eye, CheckCircle2 } from 'lucide-react'
import { LineItemEditor, LineItem } from '@/components/shared/LineItemEditor'
import { usePerm, ExportButtons } from '@/components/shared/Perms'

export function InternalTransfersPage() {
  const perm = usePerm('internal-transfers')
  const [rows, setRows] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const [form, setForm] = useState({ fromEntityId: '', toEntityId: '', transferDate: new Date().toISOString().slice(0, 10), notes: '' })
  const [lines, setLines] = useState<LineItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await list('internal-transfers') as any[]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('items').then((r) => setItems(r as any[])).catch(() => {})
  }, [load])

  const startNew = () => {
    setForm({ fromEntityId: '', toEntityId: '', transferDate: new Date().toISOString().slice(0, 10), notes: '' })
    setLines([])
    setOpen(true)
  }

  const save = async () => {
    if (!form.fromEntityId || !form.toEntityId) { toast.error('Select source & destination'); return }
    if (form.fromEntityId === form.toEntityId) { toast.error('Source and destination must be different'); return }
    if (lines.length === 0) { toast.error('Add items'); return }
    try {
      const r = await create('internal-transfers', {
        fromEntityId: form.fromEntityId,
        toEntityId: form.toEntityId,
        transferDate: new Date(form.transferDate),
        notes: form.notes,
        status: 'PENDING',
        items: { create: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, serials: l.serials || null })) },
      })
      toast.success(`Created ${r.transferNo}`)
      setOpen(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const receive = async (id: string) => {
    if (!confirm('Mark this transfer as received? Stock will be moved to destination entity.')) return
    try {
      await action('receive-transfer', id)
      toast.success('Transfer received. Stock moved.')
      load()
      setViewing(null)
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Internal Transfers"
        description="Move stock between entities. Source entity releases, destination receives."
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Transfer"
      />
      <ExportButtons
        module="internal-transfers"
        title="Internal Transfers"
        rows={rows.map((r) => ({
          transferNo: r.transferNo,
          date: new Date(r.transferDate).toLocaleDateString(),
          from: r.fromEntity?.name,
          to: r.toEntity?.name,
          status: r.status,
        }))}
        columns={[
          { key: 'transferNo', label: 'Transfer No' },
          { key: 'date', label: 'Date' },
          { key: 'from', label: 'From' },
          { key: 'to', label: 'To' },
          { key: 'status', label: 'Status' },
        ]}
      />
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : rows.length === 0 ? (
        <EmptyState title="No transfers" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer No</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.transferNo}</TableCell>
                    <TableCell>{r.fromEntity?.name}</TableCell>
                    <TableCell>{r.toEntity?.name}</TableCell>
                    <TableCell>{new Date(r.transferDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      {r.status === 'PENDING' && perm.canUpdate && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => receive(r.id)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                      )}
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
            <DialogTitle>New Internal Transfer</DialogTitle>
            <DialogDescription>For serial-tracked items, enter serial numbers being transferred.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From Entity</Label>
              <Select value={form.fromEntityId} onValueChange={(v) => setForm({ ...form, fromEntityId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">To Entity</Label>
              <Select value={form.toEntityId} onValueChange={(v) => setForm({ ...form, toEntityId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Destination" /></SelectTrigger>
                <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Transfer Date</Label>
              <Input type="date" value={form.transferDate} onChange={(e) => setForm({ ...form, transferDate: e.target.value })} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Items</Label>
            <div className="mt-1">
              <LineItemEditor items={items} value={lines} onChange={setLines} showPrice={false} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Create Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer {viewing?.transferNo}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">From:</span> {viewing?.fromEntity?.name}</div>
            <div><span className="text-muted-foreground">To:</span> {viewing?.toEntity?.name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.transferDate && new Date(viewing.transferDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Status:</span> {viewing?.status}</div>
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
          {viewing?.status === 'PENDING' && perm.canUpdate && (
            <DialogFooter>
              <Button onClick={() => receive(viewing.id)}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Received</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
