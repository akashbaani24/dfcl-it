'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  adjustType: AdjustType
}

const ADJUST_TYPES: Array<{ value: AdjustType; label: string; effect: string }> = [
  { value: 'EXCESS', label: 'Excess', effect: 'INCREASE' },
  { value: 'SHORTAGE', label: 'Shortage', effect: 'DECREASE' },
  { value: 'REJECT', label: 'Reject', effect: 'DECREASE' },
  { value: 'WASTAGE', label: 'Wastage', effect: 'DECREASE' },
]

export function AdjustmentEntryPage() {
  const { setActive, currentEntityId, selectedEntityId, selectedEntityName } = useApp()

  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [entityId, setEntityId] = useState('')
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<AdjustLine[]>([])
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
        adjustType: 'EXCESS',
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
    if (e.key === 'Enter') { e.preventDefault(); lookupBarcode(barcodeInput) }
  }

  const updateLine = (id: string, patch: Partial<AdjustLine>) => {
    setLines(lines.map((l) => l.id === id ? { ...l, ...patch } : l))
  }

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id))
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
      const types = new Set(lines.map(l => l.adjustType))
      const allExcess = [...types].every(t => t === 'EXCESS')
      const allDecrease = [...types].every(t => t !== 'EXCESS')
      const overallType = allExcess ? 'INCREASE' : allDecrease ? 'DECREASE' : 'MIXED'
      const typeSummary = lines.map(l => `${l.itemName}:${l.adjustType}`).join(', ')

      const payload = {
        entityId,
        adjustDate: new Date(adjustDate + 'T00:00:00.000Z').toISOString(),
        type: overallType,
        reason: reason ? `${reason} [${typeSummary}]` : typeSummary,
        status: 'PENDING',
        items: {
          create: lines.map((l) => {
            const adjTypeDef = ADJUST_TYPES.find(t => t.value === l.adjustType)
            const effect = adjTypeDef?.effect || 'INCREASE'
            const adjInfo = `ADJTYPE:${l.adjustType}|EFFECT:${effect}`
            const bcSn = [l.barcode, l.serialNumber].filter(Boolean).join(',')
            return {
              itemId: l.itemId,
              quantity: l.quantity,
              serials: bcSn ? `${adjInfo}|${bcSn}` : adjInfo,
            }
          }),
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
        <h1 className="text-xl font-semibold tracking-tight">New Adjustment Entry</h1>
      </div>

      <div className="border-2 border-black rounded-lg bg-white max-w-4xl mx-auto">
        {/* Header fields */}
        <div className="grid grid-cols-2 gap-0 border-b-2 border-black">
          <div className="p-3 border-r-2 border-black">
            <Label className="text-xs font-bold">Entity (Default)</Label>
            <div className="mt-1 flex items-center gap-2 h-10 px-3 border rounded-md bg-slate-50">
              <span className="text-sm font-medium">{fromEntity?.name || selectedEntityName || '—'}</span>
            </div>
          </div>
          <div className="p-3">
            <Label className="text-xs font-bold">Adjust Date</Label>
            <Input type="date" value={adjustDate} onChange={(e) => setAdjustDate(e.target.value)} className="mt-1 h-10" />
          </div>
        </div>

        {/* Reason */}
        <div className="p-3 border-b-2 border-black">
          <Label className="text-xs font-bold">Adjust Reason</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for adjustment..."
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Barcode scan input */}
        <div className="p-3 border-b-2 border-black flex items-center gap-2">
          <div className="relative flex-1">
            <ScanLine className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={barcodeRef}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={onBarcodeKeyDown}
              placeholder="Manually type Serial / Barcode or Scan Here"
              className="pl-8 h-10 font-mono"
              disabled={scanning || !entityId}
            />
          </div>
          <Button onClick={() => lookupBarcode(barcodeInput)} disabled={scanning || !barcodeInput.trim()} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-100 border-b-2 border-black">
              <tr>
                <th className="px-2 py-2 text-center font-bold text-xs w-8 border-r border-slate-300">Sl</th>
                <th className="px-2 py-2 text-left font-bold text-xs border-r border-slate-300">Item Name</th>
                <th className="px-2 py-2 text-left font-bold text-xs w-28 border-r border-slate-300">Barcode</th>
                <th className="px-2 py-2 text-left font-bold text-xs w-28 border-r border-slate-300">Serial</th>
                <th className="px-2 py-2 text-center font-bold text-xs w-20 border-r border-slate-300">Qty</th>
                <th className="px-2 py-2 text-left font-bold text-xs w-16 border-r border-slate-300">UoM</th>
                <th className="px-2 py-2 text-left font-bold text-xs w-28 border-r border-slate-300">Adjust type</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={l.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                  <td className="px-2 py-1.5 text-center text-xs text-muted-foreground border-r border-slate-200">{idx + 1}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200">
                    <div className="text-xs font-medium">{l.itemName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{l.itemCode}</div>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-xs border-r border-slate-200">{l.barcode || '—'}</td>
                  <td className="px-2 py-1.5 font-mono text-xs border-r border-slate-200">{l.serialNumber || '—'}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200">
                    <Input
                      type="number" min={1} value={l.quantity}
                      onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) })}
                      className="h-7 w-16 text-center text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-xs border-r border-slate-200">{l.uom || '—'}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200">
                    <select
                      value={l.adjustType}
                      onChange={(e) => updateLine(l.id, { adjustType: e.target.value as AdjustType })}
                      className="h-7 w-full text-xs border rounded px-1"
                    >
                      {ADJUST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => removeLine(l.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-xs text-muted-foreground">
                    No items added. Scan barcode above to add items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Buttons */}
        <div className="flex justify-between p-3 border-t-2 border-black">
          <Button variant="outline" onClick={goBack}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-1 bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4" />
            {saving ? 'Submitting...' : 'Submit For Approval'}
          </Button>
        </div>
      </div>
    </div>
  )
}
