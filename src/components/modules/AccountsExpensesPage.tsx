'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { Badge } from '@/components/shared/PageHeader'
import { useEffect, useState } from 'react'
import { list } from '@/lib/api'

const columns: Col[] = [
  { key: 'entryNo', label: 'Entry No' },
  { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
  { key: 'entityId', label: 'Entity', render: (r) => r.entity?.name },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' },
  { key: 'method', label: 'Method', render: (r) => <Badge status={r.method === 'CASH' ? 'DELIVERED' : 'CONVERTED'} /> },
  { key: 'amount', label: 'Amount', render: (r) => `৳${r.amount.toFixed(2)}`, className: 'text-right' },
]

const EXPENSE_CATEGORIES = ['RENT', 'SALARY', 'UTILITIES', 'TRANSPORT', 'OFFICE_SUPPLIES', 'MAINTENANCE', 'MARKETING', 'OTHER']

export function AccountsExpensesPage() {
  const [entities, setEntities] = useState<any[]>([])
  useEffect(() => { list('entities').then((r) => setEntities(r as any[])).catch(() => {}) }, [])
  const fields: FieldDef[] = [
    {
      name: 'entityId', label: 'Entity', type: 'select', required: true,
      options: entities.map((e) => ({ value: e.id, label: e.name })),
    },
    {
      name: 'category', label: 'Expense Type', type: 'select', required: true,
      options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
    },
    { name: 'amount', label: 'Amount (৳)', type: 'number', required: true, default: 0 },
    { name: 'date', label: 'Date', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
    {
      name: 'method', label: 'Payment Method', type: 'select', default: 'CASH',
      options: [
        { value: 'CASH', label: 'Cash' },
        { value: 'BANK', label: 'Bank' },
        { value: 'MOBILE', label: 'Mobile' },
      ],
    },
    { name: 'description', label: 'Description', type: 'textarea', full: true },
  ]
  return (
    <ResourcePage
      slug="account-entries"
      title="Daily Expenses"
      description="Record daily expenses by type/category. Filterable by entity."
      fields={fields}
      columns={columns}
      addLabel="Add Expense"
      filter={{ type: 'EXPENSE' }}
      defaultValues={{ type: 'EXPENSE' }}
      moduleKey="accounts-expenses"
    />
  )
}
