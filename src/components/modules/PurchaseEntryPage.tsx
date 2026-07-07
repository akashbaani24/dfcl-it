'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ComboBox } from '@/components/ui/combobox'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { list, create, update, getOne } from '@/lib/api'
import { toast } from 'sonner'

type LineItem = {
  id: string
  itemId: string
  itemName: string
  uom: string
  quantity: number
  unitPrice: number
  total: number
}

export function PurchaseEntryPage() {
  const { setActive } = useApp()
  const { user } = useAuth()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [entities, setEntities] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [uoms, setUoms] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form fields
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [purchaseFor, setPurchaseFor] = useState('')        // Entity (purchasing)
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [entryBy, setEntryBy] = useState(user?.employee?.name || user?.userId || '')
  const [shippingEntity, setShippingEntity] = useState('')   // Entity (receiving stock)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([])

  useEffect(() => {
    const id = sessionStorage.getItem('editingPurchaseId')
    if (id) {
      setEditingId(id)
      sessionStorage.removeItem('editingPurchaseId')
    }
    Promise.all([
      list('entities'),
      list('suppliers'),
      list('items'),
      list('uoms'),
    ]).then(([e, s, i, u]) => {
      setEntities(e as any[])
      setSuppliers(s as any[])
      setItems(i as any[])
      setUoms(u as any[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Load existing purchase for editing
  useEffect(() => {
    if (!editingId) return
    getOne('purchases', editingId).then((r: any) => {
      setPurchaseDate(r.purchaseDate ? new Date(r.purchaseDate).toISOString().slice(0, 10) : '')
      setPurchaseFor(r.entityId || '')
      setSupplierId(r.supplierId || '')
      setInvoiceNo(r.invoiceNo || '')
      setEntryBy(r.createdBy || user?.employee?.name || '')
      setShippingEntity(r.entityId || '')
      setNotes(r.notes || '')
      setLines((r.items || []).map((it: any) => ({
        id: it.id,
        itemId: it.itemId,
        itemName: it.item?.name || '',
        uom: it.item?.uom?.shortCode || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.totalPrice,
      })))
    }).catch(() => { toast.error('Failed to load'); setLoading(false) })
  }, [editingId])

  const addLine = () => {
    setLines([...lines, {
      id: Math.random().toString(36).slice(2),
      itemId: '',
      itemName: '',
      uom: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    }])
  }

  const updateLine = (id: string, patch: Partial<LineItem>) => {
    setLines(lines.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, ...patch }
      updated.total = (updated.quantity || 0) * (updated.unitPrice || 0)
      return updated
    }))
  }

  const onItemSelect = (id: string, itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (item) {
      updateLine(id, {
        itemId,
        itemName: item.name,
        uom: item.uom?.shortCode || '',
      })
    }
  }

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id))
  }

  const grandTotal = lines.reduce((sum, l) => sum + (l.total || 0), 0)

  const save = async () => {
    if (!purchaseFor) { toast.error('Purchase For (Entity) is required'); return }
    if (!supplierId) { toast.error('Supplier is required'); return }
    if (lines.length === 0) { toast.error('Add at least one item'); return }
    for (const l of lines) {
      if (!l.itemId) { toast.error('Select an item for each line'); return }
    }

    setSaving(true)
    try {
      const payload = {
        entityId: purchaseFor,
        supplierId,
        invoiceNo,
        purchaseDate: new Date(purchaseDate + 'T00:00:00.000Z').toISOString(),
        totalAmount: grandTotal,
        status: 'PENDING',
        createdBy: entryBy,
        notes,
        items: {
          create: lines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            totalPrice: l.total,
          })),
        },
      }
      if (editingId) {
        await update('purchases', editingId, payload)
        toast.success('Purchase updated')
      } else {
        await create('purchases', payload)
        toast.success('Purchase created')
      }
      setActive('purchases')
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => setActive('purchases')

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
          <h1 className="text-xl font-semibold tracking-tight">
            {editingId ? 'Edit Purchase' : 'New Purchase Entry'}
          </h1>
        </div>
      </div>

      {/* Form — spreadsheet-like layout */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Header section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-b">
          {/* Purchase Date */}
          <div className="p-3 border-r border-b sm:border-b-0">
            <Label className="text-xs font-semibold">Purchase Date</Label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="mt-1 h-9"
            />
          </div>
          {/* Purchase For (Entity) */}
          <div className="p-3 border-r border-b sm:border-b-0">
            <Label className="text-xs font-semibold">Purchase For</Label>
            <div className="mt-1">
              <ComboBox
                value={purchaseFor}
                onChange={setPurchaseFor}
                options={entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode }))}
                placeholder="(Entity Name Here)"
              />
            </div>
          </div>
          {/* Supplier */}
          <div className="p-3 border-b sm:border-b-0">
            <Label className="text-xs font-semibold">Supplier</Label>
            <div className="mt-1">
              <ComboBox
                value={supplierId}
                onChange={setSupplierId}
                options={suppliers.map((s) => ({ value: s.id, label: s.name, sublabel: s.shortCode }))}
                placeholder="Select supplier"
              />
            </div>
          </div>
          {/* Invoice/Bill No */}
          <div className="p-3 border-r">
            <Label className="text-xs font-semibold">Invoice/Bill No.</Label>
            <Input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Supplier invoice no"
              className="mt-1 h-9"
            />
          </div>
          {/* Purchase Entry By */}
          <div className="p-3 border-r">
            <Label className="text-xs font-semibold">Purchase Entry By</Label>
            <Input
              value={entryBy}
              onChange={(e) => setEntryBy(e.target.value)}
              placeholder="(User Name Here)"
              className="mt-1 h-9"
            />
          </div>
          {/* Shipping/Stock Receive */}
          <div className="p-3">
            <Label className="text-xs font-semibold">Shipping/Stock Receive</Label>
            <div className="mt-1">
              <ComboBox
                value={shippingEntity}
                onChange={setShippingEntity}
                options={entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode }))}
                placeholder="(Entity Name Here)"
              />
            </div>
          </div>
        </div>

        {/* Item table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-xs w-12">Sl No</th>
                <th className="px-3 py-2 text-left font-semibold text-xs min-w-[200px]">Item Name</th>
                <th className="px-3 py-2 text-left font-semibold text-xs w-24">Qty</th>
                <th className="px-3 py-2 text-left font-semibold text-xs w-24">UoM</th>
                <th className="px-3 py-2 text-left font-semibold text-xs w-32">Unit Price</th>
                <th className="px-3 py-2 text-left font-semibold text-xs w-32">Total</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={l.id} className="border-b hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <ComboBox
                      value={l.itemId}
                      onChange={(v) => onItemSelect(l.id, v)}
                      options={items.map((i) => ({ value: i.id, label: i.name, sublabel: i.itemCode }))}
                      placeholder="Select item"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) })}
                      className="h-8 w-20"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-muted-foreground font-mono">{l.uom || '—'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) })}
                      className="h-8 w-28"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">
                    ৳{(l.total || 0).toFixed(2)}
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
                    No items added. Click "Add Item" below.
                  </td>
                </tr>
              )}
              {/* Grand Total row */}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={4} className="px-3 py-2 text-right text-xs">Grand Total →</td>
                <td className="px-3 py-2 text-right text-xs">Total</td>
                <td className="px-3 py-2">৳{grandTotal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add Item button */}
        <div className="p-3 border-t">
          <Button variant="outline" size="sm" onClick={addLine} className="gap-1">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>

        {/* Notes */}
        <div className="p-3 border-t">
          <Label className="text-xs font-semibold">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 p-3 border-t bg-slate-50">
          <Button variant="outline" onClick={goBack}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-1">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : (editingId ? 'Update Purchase' : 'Create Purchase')}
          </Button>
        </div>
      </div>
    </div>
  )
}
