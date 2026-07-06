'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { useEffect, useState } from 'react'
import { list } from '@/lib/api'
import { useNavigateToEdit } from '@/components/shared/useNavigateToEdit'

const columns: Col[] = [
  { key: 'name', label: 'Supplier Name' },
  { key: 'shortCode', label: 'Short Code' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'entityId', label: 'Entity', render: (r) => r.entity?.name || '—' },
]
export function SuppliersPage() {
  const [entities, setEntities] = useState<any[]>([])
  const { navigateToAdd, navigateToEdit } = useNavigateToEdit()
  useEffect(() => { list('entities').then((r) => setEntities(r as any[])).catch(() => {}) }, [])
  const fields: FieldDef[] = [
    { name: 'name', label: 'Supplier Name', required: true },
    { name: 'shortCode', label: 'Short Code', required: true, placeholder: 'e.g. TDB' },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },
    { name: 'address', label: 'Address', type: 'textarea', full: true },
    {
      name: 'entityId', label: 'Entity', type: 'select', required: true,
      options: entities.map((e) => ({ value: e.id, label: e.name })),
    },
  ]
  // Build nav config inside component so dynamic entity select options are
  // captured fresh from current state when Add/Edit is clicked.
  const buildNavConfig = () => ({ slug: 'suppliers', title: 'Supplier', fields, backTo: 'suppliers' as const })
  return (
    <ResourcePage
      slug="suppliers"
      title="Supplier Setup"
      description="Vendors from whom you purchase items"
      fields={fields}
      columns={columns}
      addLabel="Add Supplier"
      onCustomAdd={() => navigateToAdd(buildNavConfig())}
      onCustomEdit={(row) => navigateToEdit(row.id, buildNavConfig())}
    />
  )
}
