'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { useEffect, useState } from 'react'
import { list } from '@/lib/api'
import { ScanLine, Barcode } from 'lucide-react'

const columns: Col[] = [
  { key: 'itemCode', label: 'Item Code' },
  {
    key: 'barcode', label: 'Barcode', render: (r) => (
      <span className="font-mono text-xs flex items-center gap-1">
        <Barcode className="h-3 w-3" /> {r.barcode}
      </span>
    )
  },
  { key: 'name', label: 'Item Name' },
  { key: 'categoryId', label: 'Category', render: (r) => {
    const cat = r.category
    return cat ? `${cat.parent?.name ? cat.parent.name + ' → ' : ''}${cat.name}` : '—'
  }},
  { key: 'uomId', label: 'UoM', render: (r) => r.uom?.shortCode || '—' },
  {
    key: 'hasSerial', label: 'Serial Tracking',
    render: (r) => r.hasSerial ? (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
        <ScanLine className="h-3 w-3" /> Enabled
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">Quantity only</span>
    )
  },
]
export function ItemsPage() {
  const [cats, setCats] = useState<any[]>([])
  const [uoms, setUoms] = useState<any[]>([])
  useEffect(() => {
    list('categories').then((r) => setCats(r as any[])).catch(() => {})
    list('uoms').then((r) => setUoms(r as any[])).catch(() => {})
  }, [])
  const fields: FieldDef[] = [
    { name: 'name', label: 'Item Name', required: true, full: true, placeholder: 'e.g. iPhone 15 Pro 256GB' },
    { name: 'itemCode', label: 'Item Code', required: true, placeholder: 'APL-IP15P-256' },
    { name: 'barcode', label: 'Barcode', required: true, placeholder: '8901001000011', help: 'Unique barcode for scanning at purchase/sales' },
    {
      name: 'categoryId', label: 'Category / Sub-Category', type: 'select', required: true,
      options: cats.map((c) => ({ value: c.id, label: c.parent?.name ? `${c.parent.name} → ${c.name}` : c.name })),
    },
    {
      name: 'uomId', label: 'Unit of Measure', type: 'select', required: true,
      options: uoms.map((u) => ({ value: u.id, label: `${u.name} (${u.shortCode})` })),
    },
    {
      name: 'hasSerial', label: 'Serial Number Tracking', type: 'switch', default: false,
      help: 'Enable for items where each unit has a unique serial on its body (phones, laptops, CPUs). Disable for bulk items like mouse, keyboard.',
    },
    { name: 'description', label: 'Description', type: 'textarea', full: true },
  ]
  return (
    <ResourcePage
      slug="items"
      title="Item Management (Barcode + Serial)"
      description="Items with barcodes. Serial tracking can be enabled per item."
      fields={fields}
      columns={columns}
      addLabel="Add Item"
    />
  )
}
