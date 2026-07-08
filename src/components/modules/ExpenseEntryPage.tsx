'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ComboBox } from '@/components/ui/combobox'
import { FileUpload } from '@/components/ui/file-upload'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'
import { list, create, update, getOne, invalidateCache } from '@/lib/api'
import { toast } from 'sonner'

// Full-page Expense entry form (used by both Daily Expense and Daily Receive
// modules). Supports:
//   • Per-line attachments (bills, receipts)
//   • Conditional Bank Account ComboBox that appears only when Payment Method
//     is set to "BANK" — pulls live bank accounts from Bank Info.
//   • Edit mode (loads existing record by ID from sessionStorage)
//
// `entryType` controls whether the record is saved as EXPENSE or RECEIVE.
export function ExpenseEntryPage({
  entryType = 'EXPENSE',
  backTo = 'accounts-expenses',
}: {
  entryType?: 'EXPENSE' | 'RECEIVE'
  backTo?: any
}) {
  const { setActive } = useApp()
  const { user } = useAuth()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Master data
  const [entities, setEntities] = useState<any[]>([])
  const [expenseTypes, setExpenseTypes] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])

  // Form state
  const [entityId, setEntityId] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState('CASH')
  const [bankInfoId, setBankInfoId] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])

  useEffect(() => {
    const id = sessionStorage.getItem('editingExpenseId')
    if (id) {
      setEditingId(id)
      sessionStorage.removeItem('editingExpenseId')
    }
    Promise.all([
      list('entities'),
      list('account-types', { type: entryType }),
      list('bank-infos'),
    ]).then(([e, t, b]) => {
      setEntities(e as any[])
      setExpenseTypes(t as any[])
      setBanks((b as any[]).filter((x) => x.isActive))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [entryType])

  // Load existing record for edit
  useEffect(() => {
    if (!editingId) return
    getOne('account-entries', editingId).then((r: any) => {
      setEntityId(r.entityId || '')
      setCategory(r.category || '')
      setAmount(r.amount || 0)
      setDate(r.date ? new Date(r.date).toISOString().slice(0, 10) : '')
      setMethod(r.method || 'CASH')
      setBankInfoId(r.bankInfoId || '')
      setDescription(r.description || '')
      try {
        setAttachments(r.attachments ? JSON.parse(r.attachments) : [])
      } catch { setAttachments([]) }
    }).catch(() => {
      toast.error('Failed to load record')
    })
  }, [editingId])

  const entityOptions = entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode }))
  const typeOptions = expenseTypes.map((t) => ({ value: t.name, label: t.name }))
  const methodOptions = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK', label: 'Bank' },
    { value: 'MOBILE', label: 'Mobile' },
  ]
  // Bank account dropdown — shows Bank Name, Account Name, and Account Number
  // so the user can identify the right account at a glance.
  const bankOptions = banks.map((b) => ({
    value: b.id,
    label: `${b.bankName} — ${b.accountName}`,
    sublabel: `A/C: ${b.accountNumber}`,
  }))

  const save = async () => {
    // Validate required fields
    if (!entityId) { toast.error('Entity is required'); return }
    if (!category) { toast.error(`${entryType === 'EXPENSE' ? 'Expense' : 'Receive'} Type is required`); return }
    if (!amount || amount <= 0) { toast.error('Amount must be greater than 0'); return }
    if (!date) { toast.error('Date is required'); return }
    if (method === 'BANK' && !bankInfoId) {
      toast.error('Please select a Bank Account when Payment Method is Bank')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, any> = {
        type: entryType,
        entityId,
        category,
        amount: Number(amount) || 0,
        date: new Date(date + 'T00:00:00.000Z').toISOString(),
        method,
        description: description || undefined,
        // When method is not BANK, clear bankInfoId so we don't leave stale
        // references from a previous edit.
        bankInfoId: method === 'BANK' ? bankInfoId : null,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : undefined,
      }
      if (editingId) {
        await update('account-entries', editingId, payload)
        toast.success('Updated successfully')
      } else {
        await create('account-entries', payload)
        toast.success('Created successfully')
      }
      invalidateCache('account-entries')
      setActive(backTo)
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => setActive(backTo)

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">Loading...</p></div>
  }

  const titleLabel = entryType === 'EXPENSE' ? 'Expense' : 'Receive'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {editingId ? `Edit ${titleLabel}` : `Add ${titleLabel}`}
          </h1>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm">{titleLabel} Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Entity<span className="text-destructive ml-0.5">*</span></Label>
              <div className="mt-1">
                <ComboBox
                  value={entityId}
                  onChange={setEntityId}
                  options={entityOptions}
                  placeholder="Select entity..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">{titleLabel} Type<span className="text-destructive ml-0.5">*</span></Label>
              <div className="mt-1">
                <ComboBox
                  value={category}
                  onChange={setCategory}
                  options={typeOptions}
                  placeholder="Select type..."
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Manage types from Company Setup → Account Type Setup
              </p>
            </div>
            <div>
              <Label className="text-xs">Amount (৳)<span className="text-destructive ml-0.5">*</span></Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Date<span className="text-destructive ml-0.5">*</span></Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Payment Method</Label>
              <div className="mt-1">
                <ComboBox
                  value={method}
                  onChange={(v) => {
                    setMethod(v)
                    // Reset bank selection when switching away from BANK
                    if (v !== 'BANK') setBankInfoId('')
                  }}
                  options={methodOptions}
                  placeholder="Select method..."
                />
              </div>
            </div>
            {/* Conditional Bank Account field — only visible when Payment
                Method is BANK. Pulls live accounts from Bank Info so the
                user can pick the right one (Bank Name + Account Name + A/C). */}
            {method === 'BANK' && (
              <div>
                <Label className="text-xs">Bank Account<span className="text-destructive ml-0.5">*</span></Label>
                <div className="mt-1">
                  <ComboBox
                    value={bankInfoId}
                    onChange={setBankInfoId}
                    options={bankOptions}
                    placeholder="Select bank account..."
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Linked from Bank Info. Add new accounts via Company Setup → Bank Info.
                </p>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Attachments (Bills, Receipts)</Label>
              <div className="mt-1">
                <FileUpload
                  multiple
                  value={attachments}
                  onChange={setAttachments}
                  label="Attach Bills/Receipts"
                  accept="image/*,.pdf"
                  maxSizeMB={5}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={goBack}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-1">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
