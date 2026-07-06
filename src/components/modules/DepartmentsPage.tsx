'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FieldDef } from '@/components/shared/FormDialog'

const columns: Col[] = [
  { key: 'name', label: 'Department' },
  { key: 'shortCode', label: 'Short Code' },
]

const fields: FieldDef[] = [
  { name: 'name', label: 'Department Name', required: true, placeholder: 'e.g. Sales' },
  { name: 'shortCode', label: 'Short Code', required: true, placeholder: 'e.g. SAL' },
]

export function DepartmentsPage() {
  return (
    <ResourcePage
      slug="departments"
      title="Department Setup"
      description="Departments like Sales, Purchase, Accounts, Store, etc."
      fields={fields}
      columns={columns}
      addLabel="Add Department"
    />
  )
}
