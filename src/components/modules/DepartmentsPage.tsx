'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { useEffect, useState } from 'react'
import { list } from '@/lib/api'

const columns: Col[] = [
  { key: 'name', label: 'Department' },
  { key: 'shortCode', label: 'Short Code' },
  { key: 'entityId', label: 'Entity', render: (r) => r.entity?.name || '—' },
]

export function DepartmentsPage() {
  const [entities, setEntities] = useState<any[]>([])
  useEffect(() => { list('entities').then((r) => setEntities(r as any[])).catch(() => {}) }, [])
  const fields: FieldDef[] = [
    { name: 'name', label: 'Department Name', required: true, placeholder: 'e.g. Sales' },
    { name: 'shortCode', label: 'Short Code', required: true, placeholder: 'e.g. SAL' },
    {
      name: 'entityId', label: 'Entity', type: 'select', required: true,
      options: entities.map((e) => ({ value: e.id, label: `${e.name} (${e.shortCode})` })),
    },
  ]
  return (
    <ResourcePage
      slug="departments"
      title="Department Setup"
      description="Departments under each entity (Sales, Purchase, Accounts etc.)"
      fields={fields}
      columns={columns}
      addLabel="Add Department"
    />
  )
}
