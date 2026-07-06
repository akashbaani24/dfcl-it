'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ComboBox } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save } from 'lucide-react'
import { list, getOne, update, create } from '@/lib/api'
import { toast } from 'sonner'
import { invalidateCache } from '@/lib/api'

type FieldDef = {
  name: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'select' | 'switch' | 'date'
  options?: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
  default?: any
  full?: boolean
  help?: string
}

export function GenericAddEditPage({
  slug,
  title,
  fields,
  defaultValues,
  onSaved,
  backTo,
}: {
  slug: string
  title: string
  fields: FieldDef[]
  defaultValues?: Record<string, any>
  onSaved?: () => void
  backTo: any
}) {
  const { setActive } = useApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  // Dynamic option lists for select fields
  const [selectOptions, setSelectOptions] = useState<Record<string, any[]>>({})

  useEffect(() => {
    const id = sessionStorage.getItem('editingRecordId')
    if (id) {
      setEditingId(id)
      sessionStorage.removeItem('editingRecordId')
    } else {
      // New record — set defaults
      const defaults: Record<string, any> = { ...(defaultValues || {}) }
      for (const f of fields) {
        if (f.default !== undefined) defaults[f.name] = f.default
        else if (f.type === 'switch') defaults[f.name] = false
        else if (f.type === 'number') defaults[f.name] = 0
        else defaults[f.name] = ''
      }
      setForm(defaults)
      setLoading(false)
    }
  }, [])

  // Load select options dynamically
  useEffect(() => {
    for (const f of fields) {
      if (f.type === 'select' && f.options && f.options.length > 0 && f.options[0].value === '__DYNAMIC__') {
        // This is a dynamic select — fetch from API
        const dynSlug = (f.options[0] as any).slug
        if (dynSlug) {
          list(dynSlug).then((r) => {
            setSelectOptions((prev) => ({ ...prev, [f.name]: r as any[] }))
          }).catch(() => {})
        }
      }
    }
  }, [fields])

  useEffect(() => {
    if (!editingId) return
    getOne(slug as any, editingId).then((r: any) => {
      const data: Record<string, any> = {}
      for (const f of fields) {
        data[f.name] = r[f.name] ?? f.default ?? (f.type === 'switch' ? false : '')
      }
      setForm(data)
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load record')
      setLoading(false)
    })
  }, [editingId])

  const save = async () => {
    // Validate required fields
    for (const f of fields) {
      if (f.required && !form[f.name]) {
        toast.error(`${f.label} is required`)
        return
      }
    }
    setSaving(true)
    try {
      // Convert __NONE__ to null/empty for optional selects
      const payload = { ...form }
      for (const f of fields) {
        if (f.type === 'select' && payload[f.name] === '__NONE__') payload[f.name] = null
        if (f.type === 'number') payload[f.name] = Number(payload[f.name]) || 0
        if (f.type === 'switch') payload[f.name] = !!payload[f.name]
      }
      if (editingId) {
        await update(slug as any, editingId, payload)
        toast.success('Updated successfully')
      } else {
        await create(slug as any, payload)
        toast.success('Created successfully')
      }
      invalidateCache(slug)
      onSaved?.()
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {editingId ? `Edit ${title}` : `Add ${title}`}
          </h1>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm">{title} Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => {
              const isFull = f.full
              return (
                <div key={f.name} className={isFull ? 'sm:col-span-2' : ''}>
                  <Label className="text-xs">
                    {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {f.type === 'textarea' ? (
                    <Textarea
                      value={form[f.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      placeholder={f.placeholder}
                      className="mt-1"
                      rows={2}
                    />
                  ) : f.type === 'select' ? (
                    <div className="mt-1">
                      <ComboBox
                        value={form[f.name] ?? ''}
                        onChange={(v) => setForm({ ...form, [f.name]: v })}
                        options={(selectOptions[f.name] || f.options || []).filter((o: any) => o.value !== '__DYNAMIC__')}
                        placeholder={f.placeholder || 'Select...'}
                      />
                    </div>
                  ) : f.type === 'switch' ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={!!form[f.name]}
                        onCheckedChange={(v) => setForm({ ...form, [f.name]: v })}
                      />
                      <span className="text-xs text-muted-foreground">{form[f.name] ? 'Yes' : 'No'}</span>
                    </div>
                  ) : (
                    <Input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      value={form[f.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      placeholder={f.placeholder}
                      className="mt-1"
                    />
                  )}
                  {f.help && <p className="text-[10px] text-muted-foreground mt-1">{f.help}</p>}
                </div>
              )
            })}
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
