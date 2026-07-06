'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'

const columns: Col[] = [
  { key: 'name', label: 'Unit Name' },
  { key: 'shortCode', label: 'Short Code' },
  { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
]
const fields: FieldDef[] = [
  { name: 'name', label: 'Unit Name', required: true, placeholder: 'e.g. Pieces' },
  { name: 'shortCode', label: 'Short Code', required: true, placeholder: 'e.g. PCS' },
  { name: 'isActive', label: 'Active', type: 'switch', default: true },
]
export function UomsPage() {
  return (
    <ResourcePage
      slug="uoms"
      title="Unit of Measure (UoM)"
      description="Units like Pieces, Box, Set, KG, Litre"
      fields={fields}
      columns={columns}
      addLabel="Add UoM"
    />
  )
}
