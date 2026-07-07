'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ComboBox } from '@/components/ui/combobox'
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
import { ArrowLeft, Save, Plus, Trash2, ScanLine, Package, AlertTriangle, Check } from 'lucide-react'
import { list, create, getOne } from '@/lib/api'
import { toast } from 'sonner'

type TransferLine = {
  id: string          // unique row id
  itemId: string
  itemName: string
  itemCode: string
  uom: string
  hasSerial: boolean
  quantity: number
  stockBalance: number   // available stock at From Entity
  barcodes: string[]     // scanned/entered barcodes for this line
  maxQty: number         // = stockBalance
}

export function InternalTransferEntryPage() {
  const { setActive, currentEntityId, selectedEntityId, selectedEntityName } = useApp()

  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  // From Entity defaults to the currently selected entity (the one the user
  // is logged into). The user cannot change it — transfers always go OUT
  // from the current entity.
  const [fromEntityId, setFromEntityId] = useState('')
  const [toEntityId, setToEntityId] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<TransferLine[]>([])

  // Barcode scanner input
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Ref to prevent double-submission
  const savingRef = useRef(false)

  useEffect(() => {
    list('entities').then((r) => {
      setEntities(r as any[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Default From Entity to the current/selected entity
  useEffect(() => {
    if (!fromEntityId) {
      const defaultEntity = currentEntityId || selectedEntityId || ''
      if (defaultEntity) {
        setFromEntityId(defaultEntity)
      }
    }
  }, [currentEntityId, selectedEntityId, fromEntityId])

  // Focus the barcode input when From Entity is set
  useEffect(() => {
    if (fromEntityId && barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }, [fromEntityId])

  // Lookup a barcode and add it to the lines
  const lookupBarcode = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return
    if (!fromEntityId) {
      toast.error('Please wait for From Entity to load')
      return
    }

    setScanning(true)
    try {
      const res = await fetch(
        `/api/lookup-barcode?barcode=${encodeURIComponent(barcode.trim())}&entityId=${fromEntityId}`
      )
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || `Barcode "${barcode}" not found`, { duration: 4000 })
        setBarcodeInput('')
        return
      }

      const item = data.item
      const stockBalance = data.stockBalance || 0
      const serial = data.serial

      // Check if this item is already in the lines
      const existing = lines.find((l) => l.itemId === item.id)
      if (existing) {
        // Add the barcode to the existing line (if not already there)
        if (existing.barcodes.includes(barcode.trim())) {
          toast.warning(`Barcode "${barcode}" already added for ${item.name}`)
        } else {
          const newQty = existing.quantity + 1
          if (newQty > existing.maxQty) {
            toast.error(
              `Cannot add more — stock for ${item.name} is ${existing.maxQty} (you're trying to transfer ${newQty})`,
              { duration: 5000 }
            )
          } else {
            setLines(lines.map((l) =>
              l.itemId === item.id
                ? { ...l, quantity: newQty, barcodes: [...l.barcodes, barcode.trim()] }
                : l
            ))
            toast.success(`Added ${item.name} (qty: ${newQty})`)
          }
        }
      } else {
        // Add a new line
        if (stockBalance <= 0) {
          toast.error(
            `${item.name} is out of stock at your entity (stock: 0). Cannot transfer.`,
            { duration: 5000 }
          )
        } else {
          const newLine: TransferLine = {
            id: Math.random().toString(36).slice(2),
            itemId: item.id,
            itemName: item.name,
            itemCode: item.itemCode || '',
            uom: item.uom?.shortCode || '',
            hasSerial: item.hasSerial || false,
            quantity: 1,
            stockBalance: stockBalance,
            maxQty: stockBalance,
            barcodes: [barcode.trim()],
          }
          setLines([...lines, newLine])
          toast.success(`Added ${item.name} (stock: ${stockBalance})`)
        }
      }
      setBarcodeInput('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setScanning(false)
    }
  }, [fromEntityId, lines])

  // Handle barcode input — submit on Enter
  const onBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      lookupBarcode(barcodeInput)
    }
  }

  // Update line quantity (with validation against maxQty)
  const updateLineQty = (id: string, qty: number) => {
    setLines(lines.map((l) => {
      if (l.id !== id) return l
      const safeQty = Math.max(0, Math.min(qty, l.maxQty))
      if (qty > l.maxQty) {
        toast.error(`Cannot transfer more than stock (${l.maxQty}) for ${l.itemName}`, { duration: 3000 })
      }
      return { ...l, quantity: safeQty }
    }))
  }

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id))
  }

  // Manually add an item by selecting from ComboBox
  const addItemManually = async (itemId: string) => {
    if (!itemId || !fromEntityId) return
    if (lines.some((l) => l.itemId === itemId)) {
      toast.error('This item is already added')
      return
    }
    try {
      // Fetch item details
      const item = await getOne('items', itemId) as any
      // Fetch stock balance
      const res = await fetch(`/api/lookup-barcode?barcode=${encodeURIComponent(item.itemCode || item.id)}&entityId=${fromEntityId}`)
      let stockBalance = 0
      if (res.ok) {
        const data = await res.json()
        stockBalance = data.stockBalance || 0
      }
      // If lookup by itemCode didn't work, try to get stock from stock-view
      if (stockBalance === 0) {
        const svRes = await fetch(`/api/stock-view?entityId=${fromEntityId}`)
        if (svRes.ok) {
          const svData = await svRes.json()
          const found = svData.find((s: any) => s.id === itemId)
          if (found) stockBalance = found.balance || 0
        }
      }

      const newLine: TransferLine = {
        id: Math.random().toString(36).slice(2),
        itemId: item.id,
        itemName: item.name,
        itemCode: item.itemCode || '',
        uom: item.uom?.shortCode || '',
        hasSerial: item.hasSerial || false,
        quantity: 1,
        stockBalance: stockBalance,
        maxQty: stockBalance,
        barcodes: [],
      }
      setLines([...lines, newLine])
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const fromEntity = entities.find((e) => e.id === fromEntityId)
  const toEntity = entities.find((e) => e.id === toEntityId)

  const onCreateClick = () => {
    // Validate before showing confirm dialog
    if (!fromEntityId) { toast.error('From Entity is required'); return }
    if (!toEntityId) { toast.error('Please select To Entity'); return }
    if (fromEntityId === toEntityId) { toast.error('From and To entity must be different'); return }
    if (lines.length === 0) { toast.error('Add at least one item (scan a barcode or add manually)'); return }
    for (const l of lines) {
      if (l.quantity <= 0) {
        toast.error(`Quantity must be > 0 for ${l.itemName}`)
        return
      }
      if (l.quantity > l.maxQty) {
        toast.error(`Quantity for ${l.itemName} exceeds stock (${l.maxQty})`)
        return
      }
    }
    // Show confirm dialog
    setConfirmOpen(true)
  }

  const save = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setConfirmOpen(false)

    try {
      const payload = {
        fromEntityId,
        toEntityId,
        transferDate: new Date(transferDate + 'T00:00:00.000Z').toISOString(),
        notes: notes || undefined,
        status: 'PENDING',
        // Prisma expects nested create: items: { create: [...] }
        // NOT items: [...] directly (that fails with "Invalid value provided.
        // Expected ...UncheckedCreateNestedManyWithoutTransferInput")
        items: {
          create: lines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            serials: l.barcodes.length > 0 ? l.barcodes.join(',') : null,
          })),
        },
      }

      const r = await create('internal-transfers', payload)
      toast.success(`Transfer ${r.transferNo} created`)
      setActive('internal-transfers')
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg, { duration: 8000 })
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  const goBack = () => setActive('internal-transfers')

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">Loading...</p></div>
  }

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Internal Transfer</h1>
          <p className="text-xs text-muted-foreground">Transfer stock from your entity to another entity — barcode-wise</p>
        </div>
      </div>

      {/* From / To / Date */}
      <div className="border rounded-lg bg-white p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* From Entity — locked to current entity */}
          <div>
            <Label className="text-xs font-semibold">From Entity (Source)</Label>
            <div className="mt-1 flex items-center gap-2 h-10 px-3 border rounded-md bg-slate-50">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {fromEntity?.name || selectedEntityName || '—'}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">(current entity)</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Transfers always go out from your currently selected entity.
            </p>
          </div>

          {/* To Entity — selectable */}
          <div>
            <Label className="text-xs font-semibold">To Entity (Destination) *</Label>
            <div className="mt-1">
              <ComboBox
                value={toEntityId}
                onChange={setToEntityId}
                options={entities
                  .filter((e) => e.id !== fromEntityId)  // exclude From Entity
                  .map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode }))}
                placeholder="Select destination entity"
              />
            </div>
          </div>

          {/* Transfer Date */}
          <div>
            <Label className="text-xs font-semibold">Transfer Date</Label>
            <Input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="mt-1 h-10"
            />
          </div>
        </div>
      </div>

      {/* Barcode Scanner */}
      <div className="border rounded-lg bg-blue-50/50 p-4 mb-4">
        <Label className="text-xs font-semibold flex items-center gap-1 text-blue-700">
          <ScanLine className="h-4 w-4" /> Barcode Scanner / Quick Add
        </Label>
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
          Scan a barcode (or type it) and press Enter. The item will be auto-filled with its name, stock, and barcode number.
          You can then adjust the quantity as needed — but not more than what's in stock.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={barcodeInputRef}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={onBarcodeKeyDown}
              placeholder="Scan or type barcode, then press Enter..."
              className="pl-8 h-10 font-mono"
              disabled={scanning || !fromEntityId}
            />
          </div>
          <Button
            onClick={() => lookupBarcode(barcodeInput)}
            disabled={scanning || !barcodeInput.trim() || !fromEntityId}
            className="gap-1"
          >
            {scanning ? 'Looking up...' : 'Add'}
          </Button>
        </div>
      </div>

      {/* Items Table */}
      <div className="border rounded-lg bg-white p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-xs font-semibold">Items to Transfer ({lines.length})</Label>
          <span className="text-[10px] text-muted-foreground">
            Qty cannot exceed stock — validated per line
          </span>
        </div>

        {lines.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-md">
            <ScanLine className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No items added yet. Scan a barcode above to begin.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-xs w-8">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Item Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs w-24">In Stock</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs w-24">Transfer Qty</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs min-w-[200px]">Barcodes (scanned)</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.id} className="border-b hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.itemName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{l.itemCode} · {l.uom}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-blue-600">{l.stockBalance}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        max={l.maxQty}
                        value={l.quantity}
                        onChange={(e) => updateLineQty(l.id, Number(e.target.value))}
                        className={`h-8 w-20 ${
                          l.quantity > l.maxQty
                            ? 'border-red-500 text-red-600'
                            : l.quantity === l.maxQty
                            ? 'border-amber-400'
                            : ''
                        }`}
                      />
                      {l.quantity > l.maxQty && (
                        <div className="text-[10px] text-red-600 flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Exceeds stock
                        </div>
                      )}
                      {l.quantity === l.maxQty && l.quantity > 0 && (
                        <div className="text-[10px] text-amber-600 mt-0.5">Max reached</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {l.barcodes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {l.barcodes.map((bc, i) => (
                            <span key={i} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {bc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">— (manual add)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="border rounded-lg bg-white p-4 mb-4">
        <Label className="text-xs font-semibold">Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this transfer..."
          className="mt-1"
          rows={2}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 p-3 border-t bg-slate-50 rounded-lg">
        <Button variant="outline" onClick={goBack}>Cancel</Button>
        <Button onClick={onCreateClick} disabled={saving} className="gap-1 ml-auto bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4" />
          {saving ? 'Creating...' : 'Create Transfer'}
        </Button>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to transfer <b>{lines.reduce((s, l) => s + l.quantity, 0)} item(s)</b> from{' '}
              <b>{fromEntity?.name}</b> to <b>{toEntity?.name}</b>.
              <br /><br />
              Once created, the destination entity will need to receive this transfer to complete the stock move.
              <br /><br />
              <span className="text-xs text-muted-foreground">
                Items: {lines.map((l) => `${l.itemName} (×${l.quantity})`).join(', ')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={save}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Check className="h-4 w-4 mr-1" /> Yes, Create Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
