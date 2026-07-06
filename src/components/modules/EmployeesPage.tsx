'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { useEffect, useState } from 'react'
import { list } from '@/lib/api'

const columns: Col[] = [
  { key: 'employeeCode', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'departmentId', label: 'Department', render: (r) => r.department?.name || '—' },
  { key: 'entityId', label: 'Entity', render: (r) => r.entity?.name || '—' },
  { key: 'phone', label: 'Phone' },
  { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
]

export function EmployeesPage() {
  const [entities, setEntities] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  useEffect(() => {
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('departments').then((r) => setDepartments(r as any[])).catch(() => {})
  }, [])
  const fields: FieldDef[] = [
    { name: 'name', label: 'Employee Name', required: true },
    { name: 'employeeCode', label: 'Employee Code', required: true, placeholder: 'EMP-001' },
    { name: 'designation', label: 'Designation', placeholder: 'e.g. Sales Manager' },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },
    {
      name: 'entityId', label: 'Entity', type: 'select', required: true,
      options: entities.map((e) => ({ value: e.id, label: e.name })),
    },
    {
      name: 'departmentId', label: 'Department', type: 'select', required: true,
      options: departments.map((d) => ({ value: d.id, label: `${d.name} (${d.entity?.shortCode || ''})` })),
    },
    { name: 'isActive', label: 'Active', type: 'switch', default: true },
  ]
  return (
    <ResourcePage
      slug="employees"
      title="Employee Setup"
      description="Employees assigned to entities and departments"
      fields={fields}
      columns={columns}
      addLabel="Add Employee"
    />
  )
}
