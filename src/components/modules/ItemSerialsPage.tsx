'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { useEffect, useState } from 'react'
import { list } from '@/lib/api'
import { Badge } from '@/components/shared/PageHeader'

const columns: Col[] = [
  { key: 'serialNumber', label: 'Serial Number', render: (r) => <span className="font-mono">{r.serialNumber}</span> },
  { key: 'itemId', label: 'Item', render: (r) => r.item?.name || '—' },
  { key: 'entityId', label: 'Currently At', render: (r) => r.entity?.name || '—' },
  { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  { key: 'updatedAt', label: 'Last Updated', render: (r) => new Date(r.updatedAt).toLocaleString() },
]
export function ItemSerialsPage() {
  const [items, setItems] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  useEffect(() => {
    list('items').then((r) => setItems((r as any[]).filter((i) => i.hasSerial))).catch(() => {})
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
  }, [])
  const fields: FieldDef[] = [
    {
      name: 'itemId', label: 'Item', type: 'select', required: true,
      options: items.map((i) => ({ value: i.id, label: `${i.name} (${i.itemCode})` })),
    },
    { name: 'serialNumber', label: 'Serial Number (on product body)', required: true, placeholder: 'e.g. IP15P-A1B2C3', help: 'Enter the serial number exactly as printed on the product body.' },
    { name: 'barcode', label: 'Per-unit barcode (optional)' },
    {
      name: 'entityId', label: 'Currently At Entity', type: 'select', required: true,
      options: entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode })),
    },
    {
      name: 'status', label: 'Status', type: 'select', default: 'IN_STOCK',
      options: [
        { value: 'IN_STOCK', label: 'In Stock' },
        { value: 'SOLD', label: 'Sold' },
        { value: 'RETURNED', label: 'Returned' },
        { value: 'DAMAGED', label: 'Damaged' },
      ],
    },
  ]
  return (
    <ResourcePage
      slug="item-serials"
      title="Item Serial Numbers"
      description="Each physical unit tracked by its unique body serial number"
      fields={fields}
      columns={columns}
      addLabel="Add Serial"
    />
  )
}
