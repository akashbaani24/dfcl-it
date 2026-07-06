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
import { LineItemEditor, LineItem } from '@/components/shared/LineItemEditor'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Eye } from 'lucide-react'

export function PurchaseRequisitionsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const [form, setForm] = useState({ entityId: '', requestedBy: '', requiredDate: '', notes: '' })
  const [lines, setLines] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await list('purchase-requisitions')
      setRows(r as any[])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('items').then((r) => setItems(r as any[])).catch(() => {})
  }, [load])

  const startNew = () => {
    setForm({ entityId: '', requestedBy: '', requiredDate: '', notes: '' })
    setLines([])
    setOpen(true)
  }

  const save = async () => {
    if (!form.entityId) { toast.error('Select entity'); return }
    if (lines.length === 0) { toast.error('Add at least one item'); return }
    setSaving(true)
    try {
      const req = await create('purchase-requisitions', {
        entityId: form.entityId,
        requestedBy: form.requestedBy,
        requiredDate: form.requiredDate ? new Date(form.requiredDate) : null,
        notes: form.notes,
        status: 'PENDING',
        items: { create: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, notes: l.serials })) },
      })
      toast.success(`Created ${req.reqNo}`)
      setOpen(false)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const approve = async (id: string) => {
    try {
      await action('approve-purchase-requisition', id)
      toast.success('Requisition approved')
      load()
      if (viewing?.id === id) setViewing(null)
    } catch (e: any) { toast.error(e.message) }
  }
  const reject = async (id: string) => {
    try {
      await action('reject-purchase-requisition', id)
      toast.success('Requisition rejected')
      load()
      if (viewing?.id === id) setViewing(null)
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Purchase Requisitions"
        description="Internal requests to purchase items. Requires approval before becoming a Purchase Order."
        onAdd={startNew}
        addLabel="New Requisition"
      />
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : rows.length === 0 ? (
        <EmptyState title="No requisitions yet" hint="Create one to start" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Req No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.reqNo}</TableCell>
                      <TableCell>{new Date(r.requestDate).toLocaleDateString()}</TableCell>
                      <TableCell>{r.entity?.name}</TableCell>
                      <TableCell>{r.items?.length || 0} item(s)</TableCell>
                      <TableCell><Badge status={r.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {r.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => approve(r.id)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => reject(r.id)}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
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

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Requisition</DialogTitle>
            <DialogDescription>Create a request for purchasing items.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Entity</Label>
              <Select value={form.entityId} onValueChange={(v) => setForm({ ...form, entityId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select entity" /></SelectTrigger>
                <SelectContent>
                  {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Requested By</Label>
              <Input value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} className="mt-1" placeholder="Employee name" />
            </div>
            <div>
              <Label className="text-xs">Required Date</Label>
              <Input type="date" value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })} className="mt-1" />
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
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Submit Requisition'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisition {viewing?.reqNo}</DialogTitle>
            <DialogDescription>Status: {viewing?.status}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Entity:</span> {viewing?.entity?.name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.requestDate && new Date(viewing.requestDate).toLocaleString()}</div>
            <div><span className="text-muted-foreground">Requested By:</span> {viewing?.requestedBy || '—'}</div>
            <div><span className="text-muted-foreground">Required By:</span> {viewing?.requiredDate && new Date(viewing.requiredDate).toLocaleDateString()}</div>
          </div>
          {viewing?.notes && <p className="text-sm mt-2"><span className="text-muted-foreground">Notes:</span> {viewing.notes}</p>}
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.item?.name}</TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell className="font-mono text-xs">{it.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {viewing?.status === 'PENDING' && (
            <DialogFooter>
              <Button variant="destructive" onClick={() => reject(viewing.id)}><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
              <Button onClick={() => approve(viewing.id)}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
