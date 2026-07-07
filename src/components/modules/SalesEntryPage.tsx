'use client'
import { useEffect, useState, useRef } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ComboBox } from '@/components/ui/combobox'
import { AsyncComboBox } from '@/components/ui/async-combobox'
import { ArrowLeft, Save, Plus, Trash2, Search, User, Phone, MapPin, Calendar, Package, CreditCard, FileText, Check } from 'lucide-react'
import { list, create, getOne } from '@/lib/api'
import { toast } from 'sonner'

type LineItem = {
  id: string
  itemId: string
  itemName: string
  itemCode: string
  uom: string
  hasSerial: boolean
  quantity: number
  unitPrice: number
  totalPrice: number
  serials: string
}

type Payment = {
  id: string
  amount: number
  method: string
  reference: string
}

export function SalesEntryPage() {
  const { setActive } = useApp()
  const { user } = useAuth()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [entities, setEntities] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form fields
  const [salesType, setSalesType] = useState<'CASH' | 'ORDER'>('CASH')
  const [entityId, setEntityId] = useState('')
  const [customerMode, setCustomerMode] = useState<'EXISTING' | 'NEW'>('NEW')
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [salesDate, setSalesDate] = useState(new Date().toISOString().slice(0, 10))
  const [deliveryDate, setDeliveryDate] = useState('')
  const [salesPerson, setSalesPerson] = useState(user?.employee?.name || user?.userId || '')
  const [status, setStatus] = useState('PENDING')
  const [lines, setLines] = useState<LineItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [notes, setNotes] = useState('')
  const [hasBroker, setHasBroker] = useState(false)
  const [brokerName, setBrokerName] = useState('')
  const [brokerPhone, setBrokerPhone] = useState('')
  const [brokerCommission, setBrokerCommission] = useState(0)
  const [repairCharge, setRepairCharge] = useState(0)
  const [discount, setDiscount] = useState(0)

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])

  // Ref to prevent double-submission
  const savingRef = useRef(false)

  useEffect(() => {
    const id = sessionStorage.getItem('editingSalesId')
    if (id) {
      setEditingId(id)
      sessionStorage.removeItem('editingSalesId')
    }
    list('entities').then((r) => {
      setEntities(r as any[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Load existing sales for editing
  useEffect(() => {
    if (!editingId) return
    getOne('sales', editingId).then((r: any) => {
      setEntityId(r.entityId || '')
      setCustomerName(r.customerName || '')
      setCustomerPhone(r.customerPhone || '')
      setCustomerAddress(r.customerAddress || '')
      setSalesDate(r.salesDate ? new Date(r.salesDate).toISOString().slice(0, 10) : '')
      setDeliveryDate(r.deliveryDate ? new Date(r.deliveryDate).toISOString().slice(0, 10) : '')
      setNotes(r.notes || '')
      setPaidAmount(r.paidAmount || 0)
      setLines((r.items || []).map((it: any) => ({
        id: it.id,
        itemId: it.itemId,
        itemName: it.item?.name || '',
        itemCode: it.item?.itemCode || '',
        uom: it.item?.uom?.shortCode || '',
        hasSerial: it.item?.hasSerial || false,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        serials: it.serials || '',
      })))
    }).catch(() => { toast.error('Failed to load'); setLoading(false) })
  }, [editingId])

  // Filter customers by search
  useEffect(() => {
    if (customerMode !== 'EXISTING') return
    if (!customerSearch) { setCustomers([]); return }
    // Simple client-side filter — in a real app this would be a server search
    // For now, we just show all customers and filter
    list('customers').then((r) => {
      const filtered = (r as any[]).filter(c =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      ).slice(0, 20)
      setCustomers(filtered)
    }).catch(() => setCustomers([]))
  }, [customerSearch, customerMode])

  const addLine = (itemId: string) => {
    if (!itemId) return
    if (lines.some((l) => l.itemId === itemId)) {
      toast.error('This item is already added')
      return
    }
    // Fetch the full item to get UoM and hasSerial
    getOne('items', itemId).then((item: any) => {
      const newLine: LineItem = {
        id: Math.random().toString(36).slice(2),
        itemId: item.id,
        itemName: item.name,
        itemCode: item.itemCode || '',
        uom: item.uom?.shortCode || '',
        hasSerial: item.hasSerial || false,
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        serials: '',
      }
      setLines([...lines, newLine])
    }).catch(() => toast.error('Failed to load item'))
  }

  const updateLine = (id: string, patch: Partial<LineItem>) => {
    setLines(lines.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, ...patch }
      updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0)
      return updated
    }))
  }

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id))
  }

  const addPayment = () => {
    setPayments([...payments, {
      id: Math.random().toString(36).slice(2),
      amount: 0,
      method: 'CASH',
      reference: '',
    }])
  }

  const updatePayment = (id: string, patch: Partial<Payment>) => {
    setPayments(payments.map((p) => p.id === id ? { ...p, ...patch } : p))
  }

  const removePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id))
  }

  const subTotal = lines.reduce((s, l) => s + (l.totalPrice || 0), 0)
  const totalAmount = subTotal + (repairCharge || 0)
  const grandTotal = totalAmount - (discount || 0)
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0)

  const save = async () => {
    if (savingRef.current) return
    savingRef.current = true

    if (!entityId) { toast.error('Selling Entity is required'); savingRef.current = false; return }
    if (!customerName) { toast.error('Customer Name is required'); savingRef.current = false; return }
    if (lines.length === 0) { toast.error('Add at least one item'); savingRef.current = false; return }
    for (const l of lines) {
      if (l.hasSerial) {
        const sns = l.serials.split(',').map((s) => s.trim()).filter(Boolean)
        if (sns.length === 0) {
          toast.error(`Enter serial numbers for ${l.itemName}`)
          savingRef.current = false
          return
        }
      }
    }

    setSaving(true)
    try {
      const payload = {
        entityId,
        customerName,
        customerPhone: customerPhone || undefined,
        customerAddress: customerAddress || undefined,
        salesDate: new Date(salesDate + 'T00:00:00.000Z').toISOString(),
        deliveryDate: deliveryDate ? new Date(deliveryDate + 'T00:00:00.000Z').toISOString() : undefined,
        totalAmount: grandTotal,
        paidAmount: totalPaid,
        status: status,
        deliveryStatus: salesType === 'CASH' ? 'DELIVERED' : 'PENDING',
        notes: notes || undefined,
        items: lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          totalPrice: l.totalPrice,
          serials: l.serials || null,
        })),
      }

      const s = await create('sales', payload)
      toast.success(`Sales ${s.salesNo} created`)
      setActive('sales')
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg, { duration: 8000 })
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  const goBack = () => setActive('sales')

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
            {editingId ? 'Edit Sales Order' : 'New Sales Order'}
          </h1>
        </div>
      </div>

      {/* Main form — 2-column layout matching the screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column (2/3) — form fields */}
        <div className="lg:col-span-2 space-y-4">
          {/* Sales Type */}
          <div className="border rounded-lg bg-white p-4">
            <Label className="text-xs font-semibold">Sales Type</Label>
            <div className="flex gap-3 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={salesType === 'CASH'}
                  onChange={() => setSalesType('CASH')}
                  className="h-4 w-4"
                />
                <span className="text-sm">Cash Sales</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={salesType === 'ORDER'}
                  onChange={() => setSalesType('ORDER')}
                  className="h-4 w-4"
                />
                <span className="text-sm">Order Sales</span>
              </label>
            </div>
          </div>

          {/* Customer Information */}
          <div className="border rounded-lg bg-white p-4">
            <Label className="text-xs font-semibold">Customer Information</Label>

            {/* Existing / New Customer tabs */}
            <div className="flex gap-1 mt-2 mb-3 border-b">
              <button
                onClick={() => setCustomerMode('EXISTING')}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 ${customerMode === 'EXISTING' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground'}`}
              >
                Existing
              </button>
              <button
                onClick={() => setCustomerMode('NEW')}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 ${customerMode === 'NEW' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground'}`}
              >
                New Customer
              </button>
            </div>

            {customerMode === 'EXISTING' ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="pl-8 h-9"
                  />
                </div>
                {customers.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {customers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setCustomerId(c.id)
                          setCustomerName(c.name)
                          setCustomerPhone(c.phone || '')
                          setCustomerAddress(c.address || '')
                          setCustomers([])
                          setCustomerSearch('')
                        }}
                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
                {customerId && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Selected: {customerName}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Customer Name *</Label>
                  <div className="relative mt-1">
                    <User className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <div className="relative mt-1">
                    <Phone className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone number"
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Address</Label>
                  <div className="relative mt-1">
                    <MapPin className="h-4 w-4 absolute left-2.5 top-3 text-muted-foreground" />
                    <Textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Customer address"
                      className="pl-8 min-h-[60px]"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="border rounded-lg bg-white p-4">
            <Label className="text-xs font-semibold">Order Details</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              <div>
                <Label className="text-xs">Order Date</Label>
                <div className="relative mt-1">
                  <Calendar className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={salesDate}
                    onChange={(e) => setSalesDate(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Delivery Date</Label>
                <div className="relative mt-1">
                  <Calendar className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    placeholder="mm/dd/yyyy"
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-9 mt-1 border rounded-md px-2 text-sm"
                >
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-xs">Selling Entity</Label>
                <div className="mt-1">
                  <ComboBox
                    value={entityId}
                    onChange={setEntityId}
                    options={entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode }))}
                    placeholder="Select entity"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Sales Person</Label>
                <Input
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                  placeholder="Type to search sales person"
                  className="h-9 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="border rounded-lg bg-white p-4">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Package className="h-3 w-3" /> Items
            </Label>
            <div className="mt-2">
              <AsyncComboBox
                slug="items"
                value=""
                onChange={(v) => { if (v) addLine(v) }}
                placeholder="Search item to add..."
              />
            </div>

            {lines.length > 0 && (
              <div className="overflow-x-auto mt-3 border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-xs w-8">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-xs">Item Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-xs w-20">Qty</th>
                      <th className="px-3 py-2 text-left font-semibold text-xs w-24">Unit Price</th>
                      <th className="px-3 py-2 text-left font-semibold text-xs w-24">Total</th>
                      {lines.some(l => l.hasSerial) && (
                        <th className="px-3 py-2 text-left font-semibold text-xs min-w-[200px]">Serials (comma-separated)</th>
                      )}
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
                          <Input
                            type="number"
                            min={1}
                            value={l.quantity}
                            onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) })}
                            className="h-8 w-16"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={l.unitPrice}
                            onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) })}
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">৳{(l.totalPrice || 0).toFixed(2)}</td>
                        {lines.some(ll => ll.hasSerial) && (
                          <td className="px-3 py-2">
                            {l.hasSerial ? (
                              <Input
                                value={l.serials}
                                onChange={(e) => updateLine(l.id, { serials: e.target.value })}
                                placeholder="SN001,SN002,..."
                                className="h-8 font-mono text-xs"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
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

          {/* Payments (Optional) */}
          <div className="border rounded-lg bg-white p-4">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Payments (Optional)
            </Label>
            {payments.length === 0 ? (
              <Button variant="outline" size="sm" onClick={addPayment} className="mt-2 gap-1">
                <Plus className="h-4 w-4" /> Add Payment
              </Button>
            ) : (
              <div className="mt-2 space-y-2">
                {payments.map((p, idx) => (
                  <div key={p.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end border rounded-md p-2">
                    <div>
                      <Label className="text-[10px]">Amount</Label>
                      <Input
                        type="number"
                        value={p.amount}
                        onChange={(e) => updatePayment(p.id, { amount: Number(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Method</Label>
                      <select
                        value={p.method}
                        onChange={(e) => updatePayment(p.id, { method: e.target.value })}
                        className="w-full h-8 border rounded-md px-2 text-sm"
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="MOBILE">Mobile Banking</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Reference</Label>
                      <Input
                        value={p.reference}
                        onChange={(e) => updatePayment(p.id, { reference: e.target.value })}
                        placeholder="Txn ID / Check no"
                        className="h-8"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePayment(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPayment} className="gap-1">
                  <Plus className="h-4 w-4" /> Add Another
                </Button>
              </div>
            )}
          </div>

          {/* Broker */}
          <div className="border rounded-lg bg-white p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasBroker}
                onChange={(e) => setHasBroker(e.target.checked)}
                className="h-4 w-4"
              />
              <Label className="text-xs font-semibold cursor-pointer">Has Broker?</Label>
              <span className="text-xs text-muted-foreground">— Check if a broker is involved in this sale</span>
            </label>
            {hasBroker && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className="text-xs">Broker Name</Label>
                  <Input
                    value={brokerName}
                    onChange={(e) => setBrokerName(e.target.value)}
                    placeholder="Broker name"
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Broker Phone</Label>
                  <Input
                    value={brokerPhone}
                    onChange={(e) => setBrokerPhone(e.target.value)}
                    placeholder="Phone"
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Commission (৳)</Label>
                  <Input
                    type="number"
                    value={brokerCommission}
                    onChange={(e) => setBrokerCommission(Number(e.target.value))}
                    placeholder="0"
                    className="h-9 mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sales Note */}
          <div className="border rounded-lg bg-white p-4">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <FileText className="h-3 w-3" /> Sales Note
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instruction or note for this sale..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        {/* Right column (1/3) — Order Summary */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg bg-white p-4 sticky top-4">
            <h3 className="text-sm font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-medium">৳{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Repair Charge</span>
                <Input
                  type="number"
                  value={repairCharge}
                  onChange={(e) => setRepairCharge(Number(e.target.value))}
                  className="h-7 w-24 text-right"
                />
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Amount</span>
                <span>৳{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Discount</span>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="h-7 w-24 text-right"
                />
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Grand Total</span>
                <span className="text-blue-600">৳{grandTotal.toFixed(2)}</span>
              </div>
              {payments.length > 0 && (
                <>
                  <div className="flex justify-between text-green-600 border-t pt-2">
                    <span>Paid</span>
                    <span>৳{totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Due</span>
                    <span>৳{(grandTotal - totalPaid).toFixed(2)}</span>
                  </div>
                </>
              )}
              {hasBroker && brokerCommission > 0 && (
                <div className="flex justify-between text-purple-600 border-t pt-2">
                  <span>Broker Commission</span>
                  <span>৳{brokerCommission.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={goBack} className="flex-1">Cancel</Button>
              <Button onClick={save} disabled={saving} className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : (editingId ? 'Update' : 'Create Sales Order')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
