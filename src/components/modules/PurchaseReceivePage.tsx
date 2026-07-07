'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { ArrowLeft, ArrowRight, Plus, Trash2, Printer, CheckCircle2, Eye } from 'lucide-react'
import { list, action, getOne } from '@/lib/api'
import { toast } from 'sonner'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'

// Generate barcode: yymmdd + 7-digit sequential
function genBarcode(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
  return `${yy}${mm}${dd}${random}`
}

type Unit = { barcode: string; serial: string }
type ItemLine = {
  purchaseItemId: string
  itemId: string
  itemName: string
  itemCode: string
  orderedQty: number
  receivedQty: number
  remainingQty: number
  units: Unit[]
}

export function PurchaseReceivePage() {
  const perm = usePerm('purchase-receive')
  const [receives, setReceives] = useState<any[]>([])
  const [approvedPurchases, setApprovedPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])

  // Step-by-step receive state
  const [showSteps, setShowSteps] = useState(false)
  const [step, setStep] = useState(1)
  const [activePurchase, setActivePurchase] = useState<any>(null)
  const [itemLines, setItemLines] = useState<ItemLine[]>([])
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

  // ===== Step navigation =====
  const startReceive = async (purchase: any) => {
    try {
      const res = await fetch(`/api/resource?slug=purchases&id=${purchase.id}`)
      if (!res.ok) throw new Error(await res.text())
      const full = await res.json()
      const lines: ItemLine[] = (full.items || []).map((it: any) => ({
        purchaseItemId: it.id,
        itemId: it.itemId,
        itemName: it.item?.name || '—',
        itemCode: it.item?.itemCode || '—',
        orderedQty: it.quantity,
        receivedQty: 0,
        remainingQty: it.quantity,
        units: [],
      }))
      setActivePurchase(full)
      setItemLines(lines)
      setNotes('')
      setStep(1)
      setShowSteps(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const nextStep = () => {
    if (step === 1) { setStep(2); return }
    if (step === 2) { setStep(3); return }
    if (step === 3) { setStep(4); return }
  }
  const backStep = () => {
    if (step > 1) setStep(step - 1)
  }

  // Step 3: update received qty → generate barcodes
  const updateReceivedQty = (purchaseItemId: string, qty: number) => {
    setItemLines((prev) => prev.map((l) => {
      if (l.purchaseItemId !== purchaseItemId) return l
      const safeQty = Math.min(qty, l.orderedQty)
      const newUnits: Unit[] = []
      for (let i = 0; i < safeQty; i++) {
        if (l.units[i]) {
          newUnits.push({ barcode: l.units[i].barcode, serial: l.units[i].serial })
        } else {
          newUnits.push({ barcode: genBarcode(), serial: '' })
        }
      }
      return { ...l, receivedQty: safeQty, remainingQty: l.orderedQty - safeQty, units: newUnits }
    }))
  }

  const updateUnitSerial = (purchaseItemId: string, unitIndex: number, serial: string) => {
    setItemLines((prev) => prev.map((l) => {
      if (l.purchaseItemId !== purchaseItemId) return l
      const newUnits = [...l.units]
      if (newUnits[unitIndex]) newUnits[unitIndex] = { ...newUnits[unitIndex], serial }
      return { ...l, units: newUnits }
    }))
  }

  // Step 4: Submit → create receive + approve → stock hit
  const submitReceive = async () => {
    const toReceive = itemLines.filter((l) => l.receivedQty > 0)
    if (toReceive.length === 0) {
      toast.error('Enter received quantity for at least one item')
      return
    }
    // Check duplicate serials
    for (const l of toReceive) {
      const serials = l.units.map((u) => u.serial.trim()).filter(Boolean)
      const unique = new Set(serials)
      if (unique.size !== serials.length) {
        toast.error(`${l.itemName}: duplicate serial numbers. Each must be unique.`)
        return
      }
    }

    setSaving(true)
    try {
      // 1. Create the receive
      const r = await action('create-purchase-receive', activePurchase.id, {
        items: toReceive.map((l) => ({
          purchaseItemId: l.purchaseItemId,
          itemId: l.itemId,
          quantity: l.receivedQty,
          serials: l.units.map((u) => u.serial.trim()).filter(Boolean).join(',') || null,
        })),
        notes,
      })

      // 2. Immediately approve → stock hit + barcode-wise ItemSerials
      await action('approve-purchase-receive', r.id)

      toast.success(`Receive ${r.receiveNo} created & approved. Stock updated barcode-wise.`)
      setShowSteps(false)
      setActivePurchase(null)
      setItemLines([])
      load()
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // ===== Render =====
  if (showSteps && activePurchase) {
    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => { setShowSteps(false); setStep(1) }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Purchase Receive</h1>
              <p className="text-xs text-muted-foreground">Step {step} of 4</p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`h-2 w-10 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>

        {/* ===== STEP 1: Purchase Header ===== */}
        {step === 1 && (
          <Card>
            <CardContent className="p-0">
              <div className="bg-slate-50 px-4 py-2 border-b font-semibold text-sm text-center">Purchase Receive</div>
              <div className="px-4 py-2 flex items-center justify-between border-b">
                <span className="text-sm font-medium">Step-1</span>
                <Button size="sm" onClick={nextStep}>Next →</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Sl No</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead>Purchase ID</TableHead>
                      <TableHead>Purchase Entry By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="cursor-default">
                      <TableCell>1</TableCell>
                      <TableCell>{new Date(activePurchase.purchaseDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono">{activePurchase.purchaseNo}</TableCell>
                      <TableCell>{activePurchase.createdBy || 'Admin'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm bg-slate-50/50 border-t">
                <div><span className="text-muted-foreground">Entity:</span> {activePurchase.entity?.name}</div>
                <div><span className="text-muted-foreground">Supplier:</span> {activePurchase.supplier?.name}</div>
                <div><span className="text-muted-foreground">Invoice:</span> {activePurchase.invoiceNo || '—'}</div>
                <div><span className="text-muted-foreground">Total:</span> ৳{activePurchase.totalAmount?.toFixed(2)}</div>
                <div><span className="text-muted-foreground">Status:</span> {activePurchase.status}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== STEP 2: Item-level details ===== */}
        {step === 2 && (
          <Card>
            <CardContent className="p-0">
              <div className="bg-slate-50 px-4 py-2 border-b font-semibold text-sm text-center">Purchase Receive</div>
              <div className="px-4 py-2 flex items-center justify-between border-b">
                <span className="text-sm font-medium">Step-2</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={backStep}>← Back</Button>
                  <Button size="sm" onClick={nextStep}>Next →</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Sl No</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="w-28">Purchase Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemLines.map((l, i) => (
                      <TableRow key={l.purchaseItemId}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{l.itemName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{l.itemCode}</div>
                        </TableCell>
                        <TableCell className="font-medium">{l.orderedQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="px-4 py-2 flex justify-end border-t">
                <Button size="sm" onClick={nextStep}>Next →</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== STEP 3: Received Qty + Barcode + Serial ===== */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="bg-slate-50 px-4 py-2 border-b font-semibold text-sm text-center">Purchase Receive</div>
                <div className="px-4 py-2 flex items-center justify-between border-b">
                  <span className="text-sm font-medium">Step-3</span>
                  <Button variant="outline" size="sm" onClick={backStep}>← Back</Button>
                </div>
                {/* Summary table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="w-28">Purchase Qty</TableHead>
                        <TableHead className="w-28">Received Qty</TableHead>
                        <TableHead className="w-28">Remaining Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemLines.map((l) => (
                        <TableRow key={l.purchaseItemId}>
                          <TableCell className="font-medium">{l.itemName}</TableCell>
                          <TableCell>{l.orderedQty}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={l.orderedQty}
                              value={l.receivedQty}
                              onChange={(e) => updateReceivedQty(l.purchaseItemId, Number(e.target.value))}
                              className="w-20 h-8"
                              disabled={!perm.canCreate}
                            />
                          </TableCell>
                          <TableCell className="text-amber-600 font-medium">{l.remainingQty}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Per-item barcode + serial table */}
            {itemLines.filter((l) => l.receivedQty > 0).map((l) => (
              <Card key={l.purchaseItemId}>
                <CardContent className="p-0">
                  <div className="bg-slate-50 px-4 py-2 border-b font-semibold text-sm">{l.itemName}</div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Sl No</TableHead>
                          <TableHead>Barcode Number (Auto)</TableHead>
                          <TableHead>Serial Number (By User Manual)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {l.units.map((unit, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 bg-slate-50 border rounded px-2 h-8">
                                <span className="font-mono text-xs text-slate-600">{unit.barcode}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={unit.serial}
                                onChange={(e) => updateUnitSerial(l.purchaseItemId, idx, e.target.value)}
                                placeholder="Enter serial from product body (optional)"
                                className="font-mono text-xs h-8"
                                disabled={!perm.canCreate}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={backStep}>← Back</Button>
              <Button size="sm" onClick={nextStep}>Next →</Button>
            </div>
          </div>
        )}

        {/* ===== STEP 4: Final Summary + Submit ===== */}
        {step === 4 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="bg-slate-50 px-4 py-2 border-b font-semibold text-sm text-center">Purchase Receive Details</div>
                <div className="px-4 py-2 flex items-center justify-between border-b">
                  <span className="text-sm font-medium">Step-4</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={backStep}>← Back</Button>
                  </div>
                </div>

                {itemLines.filter((l) => l.receivedQty > 0).map((l) => (
                  <div key={l.purchaseItemId} className="border-b last:border-b-0">
                    <div className="bg-slate-50/50 px-4 py-2 text-sm font-medium border-b">
                      {l.itemName} — Qty: {l.receivedQty} / {l.orderedQty}
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Sl No</TableHead>
                            <TableHead>Barcode Number (Auto)</TableHead>
                            <TableHead>Serial Number</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {l.units.map((unit, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-xs">{unit.barcode}</TableCell>
                              <TableCell className="font-mono text-xs">{unit.serial || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}

                <div className="px-4 py-3 border-t bg-slate-50">
                  <Label className="text-xs">Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className="mt-1 h-9"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={backStep}>← Back</Button>
              <Button onClick={submitReceive} disabled={saving || !perm.canCreate} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {saving ? 'Submitting...' : 'Submit / Confirmed'}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===== Default view: approved purchases + receive list =====
  return (
    <div>
      <PageHeader
        title="Purchase Receive"
        description="Receive stock against approved purchase orders. Step-by-step: Header → Items → Receive + Barcode/Serial → Confirm."
      />

      {/* Approved purchases awaiting receive */}
      <Card className="mb-4">
        <CardContent className="p-0">
          <div className="px-4 py-2 border-b font-semibold text-sm bg-slate-50">
            Approved Purchases Awaiting Receive ({approvedPurchases.length})
          </div>
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
                          <Button size="sm" className="gap-1" onClick={() => startReceive(p)}>
                            Receive
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View dialog */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewing(null)}>
          <div className="bg-card rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Receive {viewing.receiveNo}</h3>
            <p className="text-xs text-muted-foreground mb-4">Status: {viewing.status}</p>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div><span className="text-muted-foreground">Purchase:</span> {viewing.purchase?.purchaseNo}</div>
              <div><span className="text-muted-foreground">Entity:</span> {viewing.entity?.name}</div>
              <div><span className="text-muted-foreground">Date:</span> {viewing.receiveDate && new Date(viewing.receiveDate).toLocaleDateString()}</div>
              <div><span className="text-muted-foreground">Approved By:</span> {viewing.approvedBy || '—'}</div>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Serials</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewing.items?.map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{it.item?.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                      </TableCell>
                      <TableCell>{it.quantity}</TableCell>
                      <TableCell className="font-mono text-xs">{it.barcodes || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{it.serials || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
