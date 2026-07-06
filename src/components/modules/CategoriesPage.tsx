'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FieldDef } from '@/components/shared/FormDialog'
import { useEffect, useState, useCallback } from 'react'
import { list } from '@/lib/api'

const columns: Col[] = [
  { key: 'name', label: 'Category Name' },
  { key: 'shortCode', label: 'Short Code' },
  { key: 'parentId', label: 'Parent', render: (r) => r.parent?.name || '— Root Category' },
  { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
]
export function CategoriesPage() {
  const [cats, setCats] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const loadCats = useCallback(() => {
    list('categories').then((r) => setCats(r as any[])).catch(() => {})
  }, [])

  useEffect(() => { loadCats() }, [loadCats, refreshKey])

  const fields: FieldDef[] = [
    { name: 'name', label: 'Category Name', required: true, placeholder: 'e.g. Mobile / Samsung Mobile' },
    { name: 'shortCode', label: 'Short Code', required: true, placeholder: 'e.g. MOB / SMS-MOB' },
    {
      name: 'parentId', label: 'Parent Category',
      type: 'select',
      options: [{ value: '__NONE__', label: '— Root Category —' }, ...cats.map((c) => ({ value: c.id, label: c.name }))],
      help: 'Select "Root Category" to create a top-level category (e.g. Mobile, Computer). Select a parent to create a sub-category (e.g. Samsung Mobile under Mobile).',
    },
    { name: 'isActive', label: 'Active', type: 'switch', default: true },
  ]
  return (
    <ResourcePage
      slug="categories"
      title="Category & Sub-Category"
      description="Create categories first (Mobile, Computer), then sub-categories (Samsung Mobile, Laptop) under them"
      fields={fields}
      columns={columns}
      addLabel="Add Category"
      onDataChange={() => setRefreshKey((k) => k + 1)}
    />
  )
}
