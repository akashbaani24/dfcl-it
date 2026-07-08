'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ComboBox } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { FileUpload } from '@/components/ui/file-upload'
import { useState, useEffect } from 'react'

export type FieldDef = {
  name: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'select' | 'switch' | 'date' | 'files' | 'file'
  options?: { value: string; label: string; sublabel?: string }[]
  required?: boolean
  placeholder?: string
  default?: any
  full?: boolean  // span both columns
  help?: string
  accept?: string  // for file/files type
  maxSizeMB?: number  // for file/files type
  // Conditional visibility — field is shown only when this returns true.
  // Receives the current form data so it can react to other field values
  // (e.g. show a "Bank Account" combo box only when method === 'BANK').
  showWhen?: (form: Record<string, any>) => boolean
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initial,
  onSubmit,
  submitLabel = 'Save',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  fields: FieldDef[]
  initial?: Record<string, any>
  onSubmit: (data: Record<string, any>) => Promise<void>
  submitLabel?: string
}) {
  const [data, setData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      const d: Record<string, any> = {}
      for (const f of fields) {
        let v = initial?.[f.name] ?? f.default
        if (v === undefined) {
          if (f.type === 'switch') v = false
          else if (f.type === 'number') v = 0
          else if (f.type === 'files') v = []
          else if (f.type === 'file') v = null
          else v = ''
        }
        // For 'files' type, parse from JSON string if needed (when loading from DB)
        if (f.type === 'files' && typeof v === 'string') {
          try { v = JSON.parse(v) } catch { v = [] }
        }
        // For select fields with __NONE__ option, normalize null/empty to sentinel
        if (f.type === 'select' && f.options?.some((o) => o.value === '__NONE__')) {
          if (v === null || v === undefined || v === '') v = '__NONE__'
        }
        d[f.name] = v
      }
      setData(d)
      setErr('')
    }
  }, [open, initial, fields])

  const submit = async () => {
    setSaving(true); setErr('')
    try {
      const payload: Record<string, any> = { ...data }
      for (const f of fields) {
        if (f.type === 'number') payload[f.name] = Number(payload[f.name]) || 0
        if (f.type === 'switch') payload[f.name] = !!payload[f.name]
        // 'files' type: serialize array to JSON string for DB storage
        if (f.type === 'files') {
          payload[f.name] = Array.isArray(payload[f.name]) && payload[f.name].length > 0
            ? JSON.stringify(payload[f.name])
            : undefined
        }
        // 'file' type: single string (data URL)
        if (f.type === 'file') {
          payload[f.name] = payload[f.name] || undefined
        }
        // __NONE__ sentinel means "no value"
        if (payload[f.name] === '__NONE__') payload[f.name] = null
      }
      await onSubmit(payload)
      onOpenChange(false)
    } catch (e: any) {
      setErr(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Fill up the form fields below and submit.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {fields.filter((f) => !f.showWhen || f.showWhen(data)).map((f) => (
            <div key={f.name} className={f.full ? 'sm:col-span-2' : ''}>
              <Label htmlFor={f.name} className="text-xs">
                {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {f.type === 'textarea' ? (
                <Textarea
                  id={f.name}
                  value={data[f.name] ?? ''}
                  onChange={(e) => setData({ ...data, [f.name]: e.target.value })}
                  placeholder={f.placeholder}
                  className="mt-1"
                  rows={2}
                />
              ) : f.type === 'files' ? (
                <div className="mt-1">
                  <FileUpload
                    multiple
                    value={data[f.name] ?? []}
                    onChange={(v) => setData({ ...data, [f.name]: v })}
                    label={f.placeholder || 'Attach Files'}
                    accept={f.accept || 'image/*,.pdf'}
                    maxSizeMB={f.maxSizeMB || 5}
                  />
                </div>
              ) : f.type === 'file' ? (
                <div className="mt-1">
                  <FileUpload
                    value={data[f.name] ?? null}
                    onChange={(v) => setData({ ...data, [f.name]: v })}
                    label={f.placeholder || 'Upload File'}
                    accept={f.accept || 'image/*'}
                    maxSizeMB={f.maxSizeMB || 5}
                  />
                </div>
              ) : f.type === 'select' ? (
                <div className="mt-1">
                  <ComboBox
                    value={data[f.name] ?? ''}
                    onChange={(v) => setData({ ...data, [f.name]: v })}
                    options={f.options || []}
                    placeholder={f.placeholder || 'Select...'}
                  />
                </div>
              ) : f.type === 'switch' ? (
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    checked={!!data[f.name]}
                    onCheckedChange={(v) => setData({ ...data, [f.name]: v })}
                  />
                  <span className="text-xs text-muted-foreground">{data[f.name] ? 'Yes' : 'No'}</span>
                </div>
              ) : (
                <Input
                  id={f.name}
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  value={data[f.name] ?? ''}
                  onChange={(e) => setData({ ...data, [f.name]: e.target.value })}
                  placeholder={f.placeholder}
                  className="mt-1"
                />
              )}
              {f.help && <p className="text-[10px] text-muted-foreground mt-1">{f.help}</p>}
            </div>
          ))}
        </div>
        {err && <div className="text-xs text-destructive">{err}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
