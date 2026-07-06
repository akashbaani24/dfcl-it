'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FieldDef } from '@/components/shared/FormDialog'

const columns: Col[] = [
  { key: 'name', label: 'Type Name' },
  { key: 'type', label: 'Module', render: (r) => (
    <span className={`text-xs px-2 py-0.5 rounded ${r.type === 'EXPENSE' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
      {r.type === 'EXPENSE' ? 'Expense' : 'Receive'}
    </span>
  )},
  { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
]

const fields: FieldDef[] = [
  { name: 'name', label: 'Type Name', required: true, placeholder: 'e.g. RENT, SALARY, SALES_PAYMENT' },
  {
    name: 'type', label: 'Module Type', type: 'select', required: true, default: 'EXPENSE',
    options: [
      { value: 'EXPENSE', label: 'Expense (Daily Expenses)' },
      { value: 'RECEIVE', label: 'Receive (Daily Receive)' },
    ],
  },
  { name: 'isActive', label: 'Active', type: 'switch', default: true },
]

export function AccountTypesPage() {
  return (
    <ResourcePage
      slug="account-types"
      title="Account Type Setup"
      description="Create custom types for Daily Expenses and Daily Receive modules"
      fields={fields}
      columns={columns}
      addLabel="Add Type"
    />
  )
}
