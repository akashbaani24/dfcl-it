'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { useEffect, useState } from 'react'
import { list } from '@/lib/api'

const columns: Col[] = [
  { key: 'name', label: 'Category Name' },
  { key: 'shortCode', label: 'Short Code' },
  { key: 'parentId', label: 'Parent', render: (r) => r.parent?.name || '— Root Category' },
  { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
]
export function CategoriesPage() {
  const [cats, setCats] = useState<any[]>([])
  useEffect(() => { list('categories').then((r) => setCats(r as any[])).catch(() => {}) }, [cats.length])
  const fields: FieldDef[] = [
    { name: 'name', label: 'Category Name', required: true, placeholder: 'e.g. Mobile / Samsung Mobile' },
    { name: 'shortCode', label: 'Short Code', required: true, placeholder: 'e.g. MOB / SMS-MOB' },
    {
      name: 'parentId', label: 'Parent Category',
      type: 'select',
      options: [{ value: '__NONE__', label: '— Root Category —' }, ...cats.map((c) => ({ value: c.id, label: c.name }))],
      help: 'Leave blank to create a top-level category. Select a parent to create a sub-category (e.g. Samsung Mobile under Mobile).',
    },
    { name: 'isActive', label: 'Active', type: 'switch', default: true },
  ]
  return (
    <ResourcePage
      slug="categories"
      title="Category & Sub-Category"
      description="Multi-level categories like Mobile → Samsung Mobile, Computer → Laptop"
      fields={fields}
      columns={columns}
      addLabel="Add Category"
    />
  )
}
