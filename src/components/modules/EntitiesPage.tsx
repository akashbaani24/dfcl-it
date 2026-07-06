'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FieldDef } from '@/components/shared/FormDialog'
import { useEffect, useState, useCallback } from 'react'
import { list } from '@/lib/api'

const columns: Col[] = [
  { key: 'name', label: 'Entity Name' },
  { key: 'shortCode', label: 'Short Code' },
  { key: 'parentId', label: 'Parent', render: (r) => r.parent?.name || '— (Root)' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
]

export function EntitiesPage() {
  const [entities, setEntities] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const loadEntities = useCallback(() => {
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
  }, [])

  useEffect(() => { loadEntities() }, [loadEntities, refreshKey])

  const fields: FieldDef[] = [
    { name: 'name', label: 'Entity Name', required: true, placeholder: 'e.g. Dhaka Showroom' },
    { name: 'shortCode', label: 'Short Code', required: true, placeholder: 'e.g. DHK-SR' },
    {
      name: 'parentId', label: 'Parent Entity',
      type: 'select',
      options: [{ value: '__NONE__', label: '— Root —' }, ...entities.map((e) => ({ value: e.id, label: `${e.name} (${e.shortCode})` }))],
      placeholder: 'Select parent (optional)',
    },
    { name: 'address', label: 'Address', type: 'textarea', full: true },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },
    { name: 'isActive', label: 'Active', type: 'switch', default: true },
  ]

  return (
    <ResourcePage
      slug="entities"
      title="Entity Management (Multi-level)"
      description="Create HQ, branches, warehouses with hierarchy & short codes"
      fields={fields}
      columns={columns}
      addLabel="Add Entity"
      onDataChange={() => setRefreshKey((k) => k + 1)}
    />
  )
}
