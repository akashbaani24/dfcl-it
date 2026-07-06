'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { useEffect, useState, useCallback } from 'react'
import { list } from '@/lib/api'
import { useApp } from '@/lib/store'
import { ScanLine } from 'lucide-react'

const columns: Col[] = [
  { key: 'itemCode', label: 'Item Code' },
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
        <ScanLine className="h-3 w-3" /> Optional
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">Quantity only</span>
    )
  },
]

export function ItemsPage() {
  const { setActive } = useApp()
  const [refreshKey, setRefreshKey] = useState(0)

  // Override Add and Edit to navigate to separate page
  const onAdd = () => {
    sessionStorage.removeItem('editingItemId')
    setActive('item-edit')
  }
  const onEdit = (row: any) => {
    sessionStorage.setItem('editingItemId', row.id)
    setActive('item-edit')
  }

  return (
    <ResourcePage
      slug="items"
      title="Item Management"
      description="Items created here. Barcode & serial numbers are auto-generated when items are received via Purchase Receive."
      columns={columns}
      addLabel="Add Item"
      onDataChange={() => setRefreshKey((k) => k + 1)}
      onCustomAdd={onAdd}
      onCustomEdit={onEdit}
    />
  )
}
