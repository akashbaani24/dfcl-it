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
import { Eye, CheckCircle2, XCircle } from 'lucide-react'
import { LineItemEditor, LineItem } from '@/components/shared/LineItemEditor'
import { usePerm, ExportButtons } from '@/components/shared/Perms'

export function AdjustmentsPage() {
  const perm = usePerm('adjustments')
  const [rows, setRows] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const [form, setForm] = useState({ entityId: '', type: 'INCREASE', adjustDate: new Date().toISOString().slice(0, 10), reason: '' })
  const [lines, setLines] = useState<LineItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await list('adjustments') as any[]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('items').then((r) => setItems(r as any[])).catch(() => {})
  }, [load])

  const startNew = () => {
    setForm({ entityId: '', type: 'INCREASE', adjustDate: new Date().toISOString().slice(0, 10), reason: '' })
    setLines([])
    setOpen(true)
  }

  const save = async () => {
    if (!form.entityId || lines.length === 0) { toast.error('Entity & items required'); return }
    try {
      const r = await create('adjustments', {
        entityId: form.entityId,
        type: form.type,
        adjustDate: new Date(form.adjustDate),
        reason: form.reason,
        status: 'PENDING',
        items: { create: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, serials: l.serials || null })) },
      })
      toast.success(`Created ${r.adjustNo}`)
      setOpen(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const approve = async (id: string) => {
    if (!confirm('Approve this adjustment? Stock will be updated.')) return
    try {
      await action('approve-adjustment', id)
      toast.success('Adjustment approved')
      load()
      setViewing(null)
    } catch (e: any) { toast.error(e.message) }
  }
  const reject = async (id: string) => {
    try {
      await action('reject-adjustment', id)
      toast.success('Adjustment rejected')
      load()
      setViewing(null)
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Adjustments & Approval"
        description="Manual stock increases or decreases (damaged, lost, found, etc.)"
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Adjustment"
      />
      <ExportButtons
        module="adjustments"
        title="Stock Adjustments"
        rows={rows.map((r) => ({
          adjustNo: r.adjustNo,
          entity: r.entity?.name,
          type: r.type,
          date: new Date(r.adjustDate).toLocaleDateString(),
          reason: r.reason,
          status: r.status,
        }))}
        columns={[
          { key: 'adjustNo', label: 'Adjust No' },
          { key: 'entity', label: 'Entity' },
          { key: 'type', label: 'Type' },
          { key: 'date', label: 'Date' },
          { key: 'reason', label: 'Reason' },
          { key: 'status', label: 'Status' },
        ]}
      />
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : rows.length === 0 ? (
        <EmptyState title="No adjustments" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjust No</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.adjustNo}</TableCell>
                    <TableCell>{r.entity?.name}</TableCell>
                    <TableCell><Badge status={r.type === 'INCREASE' ? 'RECEIVED' : 'CANCELLED'} />{r.type}</TableCell>
                    <TableCell>{new Date(r.adjustDate).toLocaleDateString()}</TableCell>
                    <TableCell>{r.reason || '—'}</TableCell>
                    <TableCell><Badge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      {r.status === 'PENDING' && perm.canUpdate && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => approve(r.id)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => reject(r.id)}><XCircle className="h-3.5 w-3.5" /></Button>
                        </>
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
            <DialogTitle>New Stock Adjustment</DialogTitle>
            <DialogDescription>Increase or decrease stock at an entity.</DialogDescription>
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
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCREASE">Increase (found, added)</SelectItem>
                  <SelectItem value="DECREASE">Decrease (damaged, lost)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.adjustDate} onChange={(e) => setForm({ ...form, adjustDate: e.target.value })} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1" rows={2} />
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
            <Button onClick={save}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjustment {viewing?.adjustNo}</DialogTitle>
          </DialogHeader>
          <div className="text-sm grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Entity:</span> {viewing?.entity?.name}</div>
            <div><span className="text-muted-foreground">Type:</span> {viewing?.type}</div>
            <div><span className="text-muted-foreground">Reason:</span> {viewing?.reason}</div>
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
              <Button variant="destructive" onClick={() => reject(viewing.id)}>Reject</Button>
              <Button onClick={() => approve(viewing.id)}>Approve</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
