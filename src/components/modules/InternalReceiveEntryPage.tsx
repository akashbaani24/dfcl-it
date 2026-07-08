'use client'
import { useEffect, useState, useRef } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, CheckCircle2, PackageCheck, ScanLine, Check, X, AlertTriangle } from 'lucide-react'
import { getOne, action } from '@/lib/api'
import { toast } from 'sonner'

export function InternalReceiveEntryPage() {
  const { setActive } = useApp()

  const [transfer, setTransfer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Barcode verification — user can scan each barcode to verify it matches
  // what's in the transfer. Verified units get a green checkmark.
  const [verifyInput, setVerifyInput] = useState('')
  const [verifiedBarcodes, setVerifiedBarcodes] = useState<Set<string>>(new Set())
  const [verifyError, setVerifyError] = useState('')

  // Ref to prevent double-submission
  const savingRef = useRef(false)

  useEffect(() => {
    const id = sessionStorage.getItem('receivingTransferId')
    if (!id) {
      toast.error('No transfer selected for receive')
      setActive('internal-receive')
      return
    }
    sessionStorage.removeItem('receivingTransferId')
    getOne('internal-transfers', id)
      .then((r: any) => {
        setTransfer(r)
        setLoading(false)
      })
      .catch((e: any) => {
        toast.error(e.message || 'Failed to load transfer')
        setActive('internal-receive')
      })
  }, [setActive])

  // Parse the "barcode|serial,barcode|serial" format into units
  const parseUnits = (serials: string | null | undefined): Array<{ barcode: string; serial: string }> => {
    if (!serials) return []
    return serials.split(',').map((unit: string) => {
      const parts = unit.split('|')
      return { barcode: parts[0] || '', serial: parts[1] || '' }
    }).filter((u) => u.barcode || u.serial)
  }

  // Build a flat list of all units across all items for verification
  const allUnits: Array<{
    itemIdx: number
    unitIdx: number
    itemName: string
    itemCode: string
    uom: string
    barcode: string
    serial: string
    verified: boolean
  }> = []
  ;(transfer?.items || []).forEach((it: any, itemIdx: number) => {
    const units = parseUnits(it.serials)
    if (units.length > 0) {
      units.forEach((u, unitIdx) => {
        allUnits.push({
          itemIdx,
          unitIdx,
          itemName: it.item?.name || '—',
          itemCode: it.item?.itemCode || '',
          uom: it.item?.uom?.shortCode || '',
          barcode: u.barcode,
          serial: u.serial,
          verified: verifiedBarcodes.has(u.barcode) || verifiedBarcodes.has(u.serial),
        })
      })
    } else {
      // No barcodes/serials — bulk item, show qty
      allUnits.push({
        itemIdx,
        unitIdx: 0,
        itemName: it.item?.name || '—',
        itemCode: it.item?.itemCode || '',
        uom: it.item?.uom?.shortCode || '',
        barcode: '',
        serial: '',
        verified: false,
      })
    }
  })

  // Handle barcode verification — user scans a barcode, we check if it's
  // in the transfer's unit list. If yes, mark as verified.
  const onVerifyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const scanned = verifyInput.trim()
      if (!scanned) return

      // Check if this barcode/serial exists in the transfer
      const found = allUnits.find(
        (u) => u.barcode === scanned || u.serial === scanned
      )
      if (!found) {
        setVerifyError(`"${scanned}" is not in this transfer`)
        setVerifyInput('')
        return
      }
      if (found.verified) {
        setVerifyError(`"${scanned}" already verified`)
        setVerifyInput('')
        return
      }
      // Mark as verified (use barcode as key, or serial if no barcode)
      const key = found.barcode || found.serial
      setVerifiedBarcodes((prev) => new Set([...prev, key]))
      setVerifyError('')
      setVerifyInput('')
      toast.success(`Verified: ${found.itemName} (${scanned})`)
    }
  }

  const verifiedCount = allUnits.filter((u) => u.verified).length
  const totalUnits = allUnits.length
  const allVerified = verifiedCount === totalUnits

  const onConfirmClick = () => {
    if (!transfer) return
    // Warn if not all units verified (but don't block — user might have
    // bulk items without barcodes)
    if (totalUnits > 0 && verifiedCount < totalUnits) {
      // Allow but warn in the confirm dialog
    }
    setConfirmOpen(true)
  }

  const save = async () => {
    if (savingRef.current) return
    if (!transfer) return
    savingRef.current = true
    setSaving(true)
    setConfirmOpen(false)

    try {
      const r = await action('receive-internal-transfer', transfer.id, { notes })
      toast.success(`Receive ${r.receiveNo} created. Stock moved.`)
      sessionStorage.setItem('showChallanForReceive', r.id)
      setActive('internal-receive')
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg, { duration: 8000 })
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  const goBack = () => setActive('internal-receive')

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">Loading transfer...</p></div>
  }

  if (!transfer) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">No transfer found</p></div>
  }

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Receive Transfer — {transfer.transferNo}
          </h1>
          <p className="text-xs text-muted-foreground">
            Verify items and serial numbers match what was physically received, then confirm
          </p>
        </div>
      </div>

      {/* Transfer Info */}
      <div className="border rounded-lg bg-white p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">From Entity:</span>
            <div className="font-medium">{transfer.fromEntity?.name}</div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">To Entity:</span>
            <div className="font-medium">{transfer.toEntity?.name}</div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Transfer Date:</span>
            <div className="font-medium">{new Date(transfer.transferDate).toLocaleDateString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Status:</span>
            <div className="font-medium text-amber-600">{transfer.status}</div>
          </div>
        </div>
      </div>

      {/* Barcode Verification — scan to verify each unit */}
      {totalUnits > 0 && (
        <div className="border rounded-lg bg-blue-50/50 p-4 mb-4">
          <Label className="text-xs font-semibold flex items-center gap-1 text-blue-700">
            <ScanLine className="h-4 w-4" /> Verify Barcodes (Optional)
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
            Scan each barcode to verify it matches what's in this transfer.
            Verified units get a green checkmark. {verifiedCount} of {totalUnits} verified.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                onKeyDown={onVerifyKeyDown}
                placeholder="Scan barcode to verify..."
                className="pl-8 h-10 font-mono"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              {allVerified ? (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <Check className="h-4 w-4" /> All Verified
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {verifiedCount}/{totalUnits}
                </span>
              )}
            </div>
          </div>
          {verifyError && (
            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {verifyError}
            </div>
          )}
        </div>
      )}

      {/* Items Table — Barcode + Serial in separate columns */}
      <div className="border rounded-lg bg-white p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-xs font-semibold">
            Items in this Transfer ({transfer.items?.length || 0})
          </Label>
          <span className="text-[10px] text-muted-foreground">
            Verify each barcode/serial matches the physical item
          </span>
        </div>

        {transfer.items?.length > 0 ? (
          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-xs w-8">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Item Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs w-20">Qty</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs w-16">UoM</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs min-w-[160px]">Barcodes</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs min-w-[160px]">Serial Numbers</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {transfer.items.map((it: any, idx: number) => {
                  const units = parseUnits(it.serials)
                  const barcodes = units.map((u) => u.barcode).filter(Boolean)
                  const serials = units.map((u) => u.serial).filter(Boolean)
                  const allUnitsVerified = units.every(
                    (u) => verifiedBarcodes.has(u.barcode) || verifiedBarcodes.has(u.serial)
                  )
                  return (
                    <tr key={it.id} className="border-b hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{it.item?.name || '—'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                      </td>
                      <td className="px-3 py-2 font-medium">{it.quantity}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{it.item?.uom?.shortCode || '—'}</td>
                      <td className="px-3 py-2">
                        {barcodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {barcodes.map((bc: string, i: number) => (
                              <span
                                key={i}
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  verifiedBarcodes.has(bc)
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`}
                              >
                                {bc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {serials.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {serials.map((sn: string, i: number) => (
                              <span
                                key={i}
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  verifiedBarcodes.has(sn)
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {sn}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {units.length > 0 ? (
                          allUnitsVerified ? (
                            <Check className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-[10px] text-amber-600">Pending</span>
                          )
                        ) : (
                          <span className="text-[10px] text-muted-foreground">N/A</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-md">
            No items in this transfer
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="border rounded-lg bg-white p-4 mb-4">
        <Label className="text-xs font-semibold">Receive Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this receive (e.g. condition, discrepancies)..."
          className="mt-1"
          rows={2}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 p-3 border-t bg-slate-50 rounded-lg">
        <Button variant="outline" onClick={goBack}>Cancel</Button>
        <Button
          onClick={onConfirmClick}
          disabled={saving || !transfer}
          className="gap-1 ml-auto bg-emerald-600 hover:bg-emerald-700"
        >
          <PackageCheck className="h-4 w-4" />
          {saving ? 'Receiving...' : 'Confirm Receive'}
        </Button>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Receive?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to receive <b>{transfer.items?.length || 0} item(s)</b> from{' '}
              <b>{transfer.fromEntity?.name}</b> to <b>{transfer.toEntity?.name}</b>.
              <br /><br />
              Once confirmed, the transfer status will change to <b>RECEIVED</b> and stock will be
              moved to your entity immediately.
              {totalUnits > 0 && verifiedCount < totalUnits && (
                <>
                  <br /><br />
                  <span className="text-amber-600 text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Warning: {totalUnits - verifiedCount} of {totalUnits} units are not yet verified.
                    You can still proceed, but please double-check the physical items.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={save}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Yes, Confirm Receive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
