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
import { CheckCircle2, Eye, PackageCheck, ShoppingCart, Barcode } from 'lucide-react'

// Each unit gets its own barcode + optional serial
type ReceiveUnit = {
  barcode: string    // auto-generated, shown as read-only
  serial: string     // user enters (optional — from product body)
}

type ReceiveLine = {
  purchaseItemId: string
  itemId: string
  itemName: string
  itemCode: string
  orderedQty: number
  receiveQty: number
  units: ReceiveUnit[]  // per-unit barcodes + serials
}

// Generate barcode: yymmdd + 7-digit random
function genBarcode(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
  return `${yy}${mm}${dd}${random}`
}

export function PurchaseReceivePage() {
  const perm = usePerm('purchase-receive')
  const [receives, setReceives] = useState<any[]>([])
  const [approvedPurchases, setApprovedPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])

  const [receiveOpen, setReceiveOpen] = useState(false)
  const [activePurchase, setActivePurchase] = useState<any>(null)
  const [lines, setLines] = useState<ReceiveLine[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
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

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!q) { setFiltered(receives); return }
    const ql = q.toLowerCase()
    setFiltered(receives.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, receives])

  const openReceiveForm = async (purchase: any) => {
    try {
      const res = await fetch(`/api/resource?slug=purchases&id=${purchase.id}`)
      if (!res.ok) throw new Error(await res.text())
      const full = await res.json()
      const existing = (full.items || []).map((it: any): ReceiveLine => ({
        purchaseItemId: it.id,
        itemId: it.itemId,
        itemName: it.item?.name || '—',
        itemCode: it.item?.itemCode || '—',
        orderedQty: it.quantity,
        receiveQty: 0,
        units: [],
      }))
      setActivePurchase(full)
      setLines(existing)
      setNotes('')
      setReceiveOpen(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // When receiveQty changes, generate per-unit barcodes + empty serial inputs
  const updateReceiveQty = (id: string, qty: number) => {
    setLines((prev) => prev.map((l) => {
      if (l.purchaseItemId !== id) return l
      const safeQty = Math.min(qty, l.orderedQty)
      // Generate barcodes for new units, keep existing serials
      const newUnits: ReceiveUnit[] = []
      for (let i = 0; i < safeQty; i++) {
        if (l.units[i]) {
          // Keep existing serial, but barcode may already be set
          newUnits.push({
            barcode: l.units[i].barcode || genBarcode(),
            serial: l.units[i].serial || '',
          })
        } else {
          newUnits.push({ barcode: genBarcode(), serial: '' })
        }
      }
      return { ...l, receiveQty: safeQty, units: newUnits }
    }))
  }

  // Update serial for a specific unit
  const updateUnitSerial = (lineId: string, unitIndex: number, serial: string) => {
    setLines((prev) => prev.map((l) => {
      if (l.purchaseItemId !== lineId) return l
      const newUnits = [...l.units]
      if (newUnits[unitIndex]) {
        newUnits[unitIndex] = { ...newUnits[unitIndex], serial }
      }
      return { ...l, units: newUnits }
    }))
  }

  const save = async () => {
    if (!activePurchase) return
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
      // Check for duplicate serials within this receive
      const serials = l.units.map((u) => u.serial.trim()).filter(Boolean)
      const uniqueSerials = new Set(serials)
      if (uniqueSerials.size !== serials.length) {
        toast.error(`${l.itemName}: duplicate serial numbers detected. Each serial must be unique.`)
        return
      }
    }

    setSaving(true)
    try {
      const r = await action('create-purchase-receive', activePurchase.id, {
        items: toReceive.map((l) => ({
          purchaseItemId: l.purchaseItemId,
          itemId: l.itemId,
          quantity: l.receiveQty,
          // Send as array of {barcode, serial} pairs
          units: l.units.map((u) => ({ barcode: u.barcode, serial: u.serial.trim() || null })),
        })),
        notes,
      })
      toast.success(`Created ${r.receiveNo}`)
      setReceiveOpen(false)
      setActivePurchase(null)
      setLines([])
      load()
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const approve = async (id: string) => {
    if (!confirm('Approve this receive? This will create item serials and update stock.')) return
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
        description="Receive stock against approved purchase orders. Auto barcode per unit. Serial numbers from product body (optional). Partial receives allowed."
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
                          <Button size="sm" className="gap-1" onClick={() => openReceiveForm(p)}>
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
              Enter receive quantity. Each unit gets an auto barcode. Enter serial numbers from product body if available (optional). Partial receives allowed — each receive gets a separate ID.
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

          {lines.map((l) => (
            <div key={l.purchaseItemId} className="border rounded-md p-3 mt-3">
              {/* Item header + qty input */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium">{l.itemName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{l.itemCode} · Ordered: {l.orderedQty}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Receive Qty:</Label>
                  <Input
                    type="number"
                    min={0}
                    max={l.orderedQty}
                    value={l.receiveQty}
                    onChange={(e) => updateReceiveQty(l.purchaseItemId, Number(e.target.value))}
                    className="w-20 h-8"
                    disabled={!perm.canCreate}
                  />
                </div>
              </div>

              {/* Per-unit barcode + serial inputs */}
              {l.receiveQty > 0 && (
                <div className="border-t pt-2">
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-[10px] font-semibold text-muted-foreground mb-1 px-1">
                    <div className="w-8 text-center">#</div>
                    <div>Barcode (auto)</div>
                    <div>Serial Number (from product body — optional)</div>
                  </div>
                  {l.units.map((unit, idx) => (
                    <div key={idx} className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center mb-1">
                      <div className="w-8 text-center text-xs text-muted-foreground">{idx + 1}</div>
                      <div className="flex items-center gap-1 bg-slate-50 border rounded px-2 h-8">
                        <Barcode className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-xs text-slate-600">{unit.barcode}</span>
                      </div>
                      <Input
                        value={unit.serial}
                        onChange={(e) => updateUnitSerial(l.purchaseItemId, idx, e.target.value)}
                        placeholder="Enter serial from product body (leave blank if none)"
                        className="font-mono text-xs h-8"
                        disabled={!perm.canCreate}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

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
