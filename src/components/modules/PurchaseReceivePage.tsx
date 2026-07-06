'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { list, action } from '@/lib/api'
import { toast } from 'sonner'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { CheckCircle2, Eye, PackageCheck, ScanLine, ShoppingCart } from 'lucide-react'

type ReceiveLine = {
  purchaseItemId: string
  itemId: string
  itemName: string
  itemCode: string
  hasSerial: boolean
  orderedQty: number
  receiveQty: number
  serials: string
}

export function PurchaseReceivePage() {
  const perm = usePerm('purchase-receive')
  const [receives, setReceives] = useState<any[]>([])
  const [approvedPurchases, setApprovedPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])

  // Receive form
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [activePurchase, setActivePurchase] = useState<any>(null)
  const [lines, setLines] = useState<ReceiveLine[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // View dialog
  const [viewing, setViewing] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, p] = await Promise.all([
        list('purchase-receives') as Promise<any[]>,
        list('purchases', { status: 'APPROVED' }) as Promise<any[]>,
      ])
      setReceives(r)
      setApprovedPurchases(p)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!q) { setFiltered(receives); return }
    const ql = q.toLowerCase()
    setFiltered(receives.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, receives])

  const openReceiveForm = async (purchase: any) => {
    // Fetch the full purchase (with items) so we can prefill the form
    try {
      const res = await fetch(`/api/resource?slug=purchases&id=${purchase.id}`)
      if (!res.ok) throw new Error(await res.text())
      const full = await res.json()
      const existing = (full.items || []).map((it: any): ReceiveLine => ({
        purchaseItemId: it.id,
        itemId: it.itemId,
        itemName: it.item?.name || '—',
        itemCode: it.item?.itemCode || '—',
        hasSerial: !!it.item?.hasSerial,
        orderedQty: it.quantity,
        receiveQty: 0,
        serials: '',
      }))
      setActivePurchase(full)
      setLines(existing)
      setNotes('')
      setReceiveOpen(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const updateLine = (id: string, patch: Partial<ReceiveLine>) => {
    setLines((prev) => prev.map((l) => (l.purchaseItemId === id ? { ...l, ...patch } : l)))
  }

  const save = async () => {
    if (!activePurchase) return
    // Validate
    const toReceive = lines.filter((l) => l.receiveQty > 0)
    if (toReceive.length === 0) {
      toast.error('Enter a receive quantity for at least one item')
      return
    }
    for (const l of toReceive) {
      if (l.receiveQty > l.orderedQty) {
        toast.error(`${l.itemName}: receive qty cannot exceed ordered qty (${l.orderedQty})`)
        return
      }
      // Serial is optional — just warn if count doesn't match
      if (l.serials) {
        const sns = l.serials.split(',').map((s) => s.trim()).filter(Boolean)
        if (sns.length > 0 && sns.length !== l.receiveQty) {
          if (!confirm(`${l.itemName}: serial count (${sns.length}) doesn't match receive qty (${l.receiveQty}). Continue anyway?`)) {
            return
          }
        }
      }
    }
    setSaving(true)
    try {
      const r = await action('create-purchase-receive', activePurchase.id, {
        items: toReceive.map((l) => ({
          purchaseItemId: l.purchaseItemId,
          itemId: l.itemId,
          quantity: l.receiveQty,
          hasSerial: l.hasSerial,
          serials: l.serials || null,
        })),
        notes,
      })
      toast.success(`Created ${r.receiveNo}`)
      setReceiveOpen(false)
      setActivePurchase(null)
      setLines([])
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const approve = async (id: string) => {
    if (!confirm('Approve this receive? This will generate item serials and update stock.')) return
    try {
      await action('approve-purchase-receive', id)
      toast.success('Receive approved. Stock updated.')
      setViewing(null)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Purchase Receive"
        description="Receive stock against approved purchase orders. Barcodes are auto-generated; serials are entered for tracked items. Receives are PENDING until approved."
      />

      {/* Approved purchases awaiting receive */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Approved Purchases Awaiting Receive
            <span className="ml-1 text-xs font-normal text-muted-foreground">({approvedPurchases.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {approvedPurchases.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No approved purchases pending receive</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO No</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedPurchases.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.purchaseNo}</TableCell>
                      <TableCell>{p.entity?.name}</TableCell>
                      <TableCell>{p.supplier?.name}</TableCell>
                      <TableCell>{new Date(p.purchaseDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {perm.canCreate && (
                          <Button size="sm" variant="default" className="gap-1" onClick={() => openReceiveForm(p)}>
                            <PackageCheck className="h-3.5 w-3.5" /> Receive
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All receives */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search receives..." />
        <ExportButtons
          module="purchase-receive"
          title="Purchase Receives"
          rows={receives.map((r) => ({
            receiveNo: r.receiveNo,
            purchaseNo: r.purchase?.purchaseNo,
            entity: r.entity?.name,
            date: r.receiveDate ? new Date(r.receiveDate).toLocaleDateString() : '',
            status: r.status,
            items: r.items?.length || 0,
          }))}
          columns={[
            { key: 'receiveNo', label: 'Receive No' },
            { key: 'purchaseNo', label: 'Purchase No' },
            { key: 'entity', label: 'Entity' },
            { key: 'date', label: 'Date' },
            { key: 'status', label: 'Status' },
            { key: 'items', label: 'Items' },
          ]}
        />
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No purchase receives yet" hint="Receive stock from an approved purchase above" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receive No</TableHead>
                    <TableHead>Purchase No</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.receiveNo}</TableCell>
                      <TableCell className="font-mono text-sm">{r.purchase?.purchaseNo || '—'}</TableCell>
                      <TableCell>{r.entity?.name}</TableCell>
                      <TableCell>{new Date(r.receiveDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge status={r.status} /></TableCell>
                      <TableCell>{r.items?.length || 0}</TableCell>
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

      {/* Receive form */}
      <Dialog open={receiveOpen} onOpenChange={(v) => { setReceiveOpen(v); if (!v) { setActivePurchase(null); setLines([]) } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Purchase {activePurchase?.purchaseNo}</DialogTitle>
            <DialogDescription>
              Enter the quantity being received now (partial receives are allowed). For serial-tracked items, enter one serial per unit. Barcodes are auto-generated for every unit on submit.
            </DialogDescription>
          </DialogHeader>

          {activePurchase && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm bg-muted/40 p-3 rounded-md">
              <div><span className="text-muted-foreground">Entity:</span> {activePurchase.entity?.name}</div>
              <div><span className="text-muted-foreground">Supplier:</span> {activePurchase.supplier?.name}</div>
              <div><span className="text-muted-foreground">Invoice:</span> {activePurchase.invoiceNo || '—'}</div>
              <div><span className="text-muted-foreground">PO Date:</span> {new Date(activePurchase.purchaseDate).toLocaleDateString()}</div>
              <div><span className="text-muted-foreground">Total:</span> ৳{activePurchase.totalAmount?.toFixed(2)}</div>
              <div><span className="text-muted-foreground">Status:</span> {activePurchase.status}</div>
            </div>
          )}

          <div className="border rounded-md overflow-x-auto mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Item</TableHead>
                  <TableHead className="w-24">Ordered</TableHead>
                  <TableHead className="w-28">Receive Qty</TableHead>
                  <TableHead className="min-w-[260px]">Serial Numbers (optional)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.purchaseItemId}>
                    <TableCell>
                      <div className="text-sm font-medium">{l.itemName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{l.itemCode}</div>
                    </TableCell>
                    <TableCell className="font-medium">{l.orderedQty}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={l.orderedQty}
                        value={l.receiveQty}
                        onChange={(e) => updateLine(l.purchaseItemId, { receiveQty: Math.min(Number(e.target.value), l.orderedQty) })}
                        className="w-24"
                        disabled={!perm.canCreate}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={l.serials}
                        onChange={(e) => updateLine(l.purchaseItemId, { serials: e.target.value })}
                        placeholder="SN001, SN002... (optional)"
                        className="font-mono text-xs"
                        disabled={!perm.canCreate}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
              placeholder="Optional notes about this receive..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !perm.canCreate}>
              {saving ? 'Saving...' : 'Create Receive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View receive detail */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive {viewing?.receiveNo}</DialogTitle>
            <DialogDescription>Status: {viewing?.status}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Purchase:</span> {viewing?.purchase?.purchaseNo}</div>
            <div><span className="text-muted-foreground">Entity:</span> {viewing?.entity?.name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.receiveDate && new Date(viewing.receiveDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Approved By:</span> {viewing?.approvedBy || '—'}</div>
          </div>
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Barcodes</TableHead>
                  <TableHead>Serials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{it.item?.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                    </TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell className="font-mono text-[10px] max-w-[260px] whitespace-normal break-all">{it.barcodes || '—'}</TableCell>
                    <TableCell className="font-mono text-[10px]">{it.serials || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {viewing?.status === 'PENDING' && perm.canUpdate && (
            <DialogFooter>
              <Button onClick={() => approve(viewing.id)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve Receive
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
