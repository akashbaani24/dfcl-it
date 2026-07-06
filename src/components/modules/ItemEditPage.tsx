'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save } from 'lucide-react'
import { list, getOne, update, create } from '@/lib/api'
import { toast } from 'sonner'
import { PermissionAction } from '@/lib/auth'

export function ItemEditPage() {
  const { setActive } = useApp()
  const { hasPerm } = useAuth()
  const canEdit = hasPerm('items', 'canEdit' as PermissionAction)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    itemCode: '',
    categoryId: '',
    uomId: '',
    hasSerial: false,
    description: '',
  })
  const [categories, setCategories] = useState<any[]>([])
  const [uoms, setUoms] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = sessionStorage.getItem('editingItemId')
    if (id) {
      setEditingId(id)
      sessionStorage.removeItem('editingItemId')
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    list('categories').then((r) => setCategories(r as any[])).catch(() => {})
    list('uoms').then((r) => setUoms(r as any[])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!editingId) {
      setLoading(false)
      return
    }
    getOne('items', editingId).then((r: any) => {
      setForm({
        name: r.name || '',
        itemCode: r.itemCode || '',
        categoryId: r.categoryId || '',
        uomId: r.uomId || '',
        hasSerial: r.hasSerial || false,
        description: r.description || '',
      })
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load item')
      setLoading(false)
    })
  }, [editingId])

  // Separate top-level categories and sub-categories
  const topCategories = categories.filter((c) => !c.parentId)
  const getSubCategories = (parentId: string) => categories.filter((c) => c.parentId === parentId)

  const save = async () => {
    if (!form.name || !form.itemCode || !form.categoryId || !form.uomId) {
      toast.error('Name, Item Code, Category and UoM are required')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await update('items', editingId, form)
        toast.success('Item updated')
      } else {
        const created = await create('items', form)
        toast.success('Item created')
        if (created?.id) setEditingId(created.id)
      }
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => setActive('items')

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">Loading...</p></div>
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {editingId ? 'Edit Item' : 'Add Item'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {editingId ? `Editing: ${form.name || '...'}` : 'Create a new item'}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm">Item Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Item Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. iPhone 15 Pro 256GB"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Item Code *</Label>
              <Input
                value={form.itemCode}
                onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                placeholder="e.g. APL-IP15P-256"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Category *</Label>
              <Select
                value={form.categoryId || '__NONE__'}
                onValueChange={(v) => {
                  // If selecting a top-level category, clear sub-category
                  const cat = categories.find((c) => c.id === v)
                  if (cat && !cat.parentId) {
                    // It's a top-level — check if it has sub-categories
                    const subs = getSubCategories(v)
                    if (subs.length > 0) {
                      // Has sub-categories — don't allow selecting parent directly
                      toast.info('Please select a sub-category under this category')
                      return
                    }
                  }
                  setForm({ ...form, categoryId: v === '__NONE__' ? '' : v })
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {topCategories.map((cat) => {
                    const subs = getSubCategories(cat.id)
                    if (subs.length === 0) {
                      // No sub-categories — show as selectable
                      return <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    }
                    // Has sub-categories — show parent as disabled header + subs
                    return (
                      <div key={cat.id}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground pointer-events-none">{cat.name}</div>
                        {subs.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id} className="pl-6">↳ {sub.name}</SelectItem>
                        ))}
                      </div>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Unit of Measure *</Label>
              <Select
                value={form.uomId || '__NONE__'}
                onValueChange={(v) => setForm({ ...form, uomId: v === '__NONE__' ? '' : v })}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select UoM" /></SelectTrigger>
                <SelectContent>
                  {uoms.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.shortCode})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.hasSerial}
              onCheckedChange={(v) => setForm({ ...form, hasSerial: v })}
            />
            <div>
              <Label className="text-xs cursor-pointer">Serial Number Tracking (optional)</Label>
              <p className="text-[10px] text-muted-foreground">Enable if each unit has a unique serial on its body. Barcode is always auto-generated at receive time.</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={goBack}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-1">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : (editingId ? 'Update Item' : 'Create Item')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
