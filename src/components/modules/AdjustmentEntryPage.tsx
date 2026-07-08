'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ComboBox } from '@/components/ui/combobox'
import { ArrowLeft, Save, Plus, Trash2, ScanLine } from 'lucide-react'
import { list, create, getOne } from '@/lib/api'
import { toast } from 'sonner'

type AdjustType = 'EXCESS' | 'SHORTAGE' | 'REJECT' | 'WASTAGE'

type AdjustLine = {
  id: string
  itemId: string
  itemName: string
  itemCode: string
  uom: string
  barcode: string
  serialNumber: string
  quantity: number
}

const ADJUST_TYPES: Array<{ value: AdjustType; label: string; desc: string; effect: string }> = [
  { value: 'EXCESS', label: 'Excess', desc: 'Stock will increase (+)', effect: 'INCREASE' },
  { value: 'SHORTAGE', label: 'Shortage', desc: 'Stock will decrease (−)', effect: 'DECREASE' },
  { value: 'REJECT', label: 'Reject', desc: 'Stock will decrease (−)', effect: 'DECREASE' },
  { value: 'WASTAGE', label: 'Wastage', desc: 'Stock will decrease (−)', effect: 'DECREASE' },
]

export function AdjustmentEntryPage() {
  const { setActive, currentEntityId, selectedEntityId, selectedEntityName } = useApp()
  const { user } = useAuth()

  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form
  const [entityId, setEntityId] = useState('')
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().slice(0, 10))
  const [adjustType, setAdjustType] = useState<AdjustType>('EXCESS')
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<AdjustLine[]>([])

  // Barcode scanner
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const barcodeRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)

  useEffect(() => {
    list('entities').then((r) => {
      setEntities(r as any[])
      const def = currentEntityId || selectedEntityId || ''
      if (def) setEntityId(def)
      setLoading(false)
    })
  }, [currentEntityId, selectedEntityId])

  useEffect(() => {
    if (entityId && barcodeRef.current) barcodeRef.current.focus()
  }, [entityId])

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (!barcode.trim() || !entityId) return
    setScanning(true)
    try {
      const res = await fetch(`/api/lookup-barcode?barcode=${encodeURIComponent(barcode.trim())}&entityId=${entityId}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || `Barcode "${barcode}" not found`)
        setBarcodeInput('')
        return
      }
      const item = data.item
      const existing = lines.find((l) => l.itemId === item.id)
      if (existing) {
        toast.warning(`${item.name} already added`)
        setBarcodeInput('')
        return
      }
      const newLine: AdjustLine = {
        id: Math.random().toString(36).slice(2),
        itemId: item.id,
        itemName: item.name,
        itemCode: item.itemCode || '',
        uom: item.uom?.shortCode || '',
        barcode: data.serial?.barcode || barcode.trim(),
        serialNumber: data.serial?.serialNumber || '',
        quantity: 1,
      }
      setLines([...lines, newLine])
      toast.success(`Added: ${item.name}`)
      setBarcodeInput('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setScanning(false)
    }
  }, [entityId, lines])

  const onBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      lookupBarcode(barcodeInput)
    }
  }

  const addLineManual = () => {
    setLines([...lines, {
      id: Math.random().toString(36).slice(2),
      itemId: '', itemName: '', itemCode: '', uom: '',
      barcode: '', serialNumber: '', quantity: 1,
    }])
  }

  const updateLine = (id: string, patch: Partial<AdjustLine>) => {
    setLines(lines.map((l) => l.id === id ? { ...l, ...patch } : l))
  }

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id))
  }

  const onItemSelect = async (id: string, itemId: string) => {
    if (!itemId) { updateLine(id, { itemId: '', itemName: '', uom: '' }); return }
    try {
      const full = await getOne('items', itemId) as any
      updateLine(id, { itemId, itemName: full.name, uom: full.uom?.shortCode || '' })
    } catch { updateLine(id, { itemId, itemName: '', uom: '' }) }
  }

  const save = async () => {
    if (savingRef.current) return
    if (!entityId) { toast.error('Entity is required'); return }
    if (lines.length === 0) { toast.error('Add at least one item'); return }
    for (const l of lines) {
      if (!l.itemId) { toast.error('Select item for each line'); return }
      if (l.quantity <= 0) { toast.error('Quantity must be > 0'); return }
    }

    savingRef.current = true
    setSaving(true)
    try {
      const adjType = ADJUST_TYPES.find(t => t.value === adjustType)
      const payload = {
        entityId,
        adjustDate: new Date(adjustDate + 'T00:00:00.000Z').toISOString(),
        type: adjType?.effect || 'INCREASE',
        reason: `${adjustType}: ${reason || '—'}`,
        status: 'PENDING',
        items: {
          create: lines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            serials: l.barcode || l.serialNumber || null,
          })),
        },
      }
      await create('adjustments', payload)
      toast.success('Adjustment submitted for approval')
      setActive('adjustments')
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg, { duration: 8000 })
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  const goBack = () => setActive('adjustments')

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">Loading...</p></div>

  const fromEntity = entities.find((e) => e.id === entityId)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Adjustment</h1>
          <p className="text-xs text-muted-foreground">Adjust stock by excess, shortage, reject, or wastage — requires approval</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Header section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-b">
          <div className="p-3 border-r border-b sm:border-b-0">
            <Label className="text-xs font-semibold">Entity (Default)</Label>
            <div className="mt-1 flex items-center gap-2 h-10 px-3 border rounded-md bg-slate-50">
              <span className="text-sm font-medium">{fromEntity?.name || selectedEntityName || '—'}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">(current entity)</span>
            </div>
          </div>
          <div className="p-3 border-r border-b sm:border-b-0">
            <Label className="text-xs font-semibold">Date</Label>
            <Input type="date" value={adjustDate} onChange={(e) => setAdjustDate(e.target.value)} className="mt-1 h-10" />
          </div>
          <div className="p-3">
            <Label className="text-xs font-semibold">Adjust Type</Label>
            <div className="mt-1">
              <ComboBox
                value={adjustType}
                onChange={(v) => setAdjustType(v as AdjustType)}
                options={ADJUST_TYPES.map(t => ({ value: t.value, label: t.label, sublabel: t.desc }))}
                placeholder="Select type"
              />
            </div>
          </div>
        </div>

        {/* Barcode scanner */}
        <div className="p-3 border-b bg-blue-50/50">
          <Label className="text-xs font-semibold flex items-center gap-1 text-blue-700">
            <ScanLine className="h-4 w-4" /> Barcode / Serial Scanner
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
            Scan or type barcode/serial, press Enter — item name + UoM auto-fills
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={barcodeRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={onBarcodeKeyDown}
                placeholder="Scan or type barcode / serial..."
                className="pl-8 h-10 font-mono"
                disabled={scanning || !entityId}
              />
            </div>
            <Button onClick={() => lookupBarcode(barcodeInput)} disabled={scanning || !barcodeInput.trim()} className="gap-1">
              {scanning ? '...' : 'Add'}
            </Button>
            <Button variant="outline" onClick={addLineManual} className="gap-1">
              <Plus className="h-4 w-4" /> Manual
            </Button>
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-xs w-8">Sl</th>
                <th className="px-3 py-2 text-left font-semibold text-xs min-w-[200px]">Item Name</th>
                <th className="px-3 py-2 text-left font-semibold text-xs w-28">Barcode</th>
                <th className="px-3 py-2 text-left font-semibold text-xs w-28">Serial</th>
                <th className="px-3 py-2 text-left font-semibold text-xs w-20">UoM</th>
                <th className="px-3 py-2 text-left font-semibold text-xs w-24">Qty</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={l.id} className="border-b hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2">
                    {l.itemName ? (
                      <div>
                        <div className="font-medium text-xs">{l.itemName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{l.itemCode}</div>
                      </div>
                    ) : (
                      <Input
                        value={l.itemId}
                        onChange={(e) => onItemSelect(l.id, e.target.value)}
                        placeholder="Type item ID..."
                        className="h-8 text-xs"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{l.barcode || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.serialNumber || '—'}</td>
                  <td className="px-3 py-2 text-xs">{l.uom || '—'}</td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) })}
                      className="h-8 w-20"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No items added. Scan a barcode or click "Manual" to add.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Reason */}
        <div className="p-3 border-t">
          <Label className="text-xs font-semibold">Adjust Reason</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for this adjustment (e.g. damaged in transit, found extra stock, etc.)"
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-3 border-t bg-slate-50">
          <Button variant="outline" onClick={goBack}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-1 ml-auto bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4" />
            {saving ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      </div>
    </div>
  )
}
