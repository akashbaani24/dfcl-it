'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FieldDef } from '@/components/shared/FormDialog'
import { Badge } from '@/components/shared/PageHeader'
import { useEffect, useState } from 'react'
import { list } from '@/lib/api'
import { useNavigateToEdit } from '@/components/shared/useNavigateToEdit'

const columns: Col[] = [
  { key: 'entryNo', label: 'Entry No' },
  { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
  { key: 'entityId', label: 'Entity', render: (r) => r.entity?.name },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' },
  { key: 'method', label: 'Method', render: (r) => <Badge status={r.method === 'CASH' ? 'DELIVERED' : 'CONVERTED'} /> },
  { key: 'amount', label: 'Amount', render: (r) => `৳${r.amount.toFixed(2)}`, className: 'text-right' },
]

export function AccountsExpensesPage() {
  const [entities, setEntities] = useState<any[]>([])
  const [expenseTypes, setExpenseTypes] = useState<any[]>([])
  const { navigateToAdd, navigateToEdit } = useNavigateToEdit()

  useEffect(() => {
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('account-types', { type: 'EXPENSE' }).then((r) => setExpenseTypes(r as any[])).catch(() => {})
  }, [])

  const fields: FieldDef[] = [
    {
      name: 'entityId', label: 'Entity', type: 'select', required: true,
      options: entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode })),
    },
    {
      name: 'category', label: 'Expense Type', type: 'select', required: true,
      options: expenseTypes.map((t) => ({ value: t.name, label: t.name })),
      help: 'Manage types from Company Setup → Account Type Setup',
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
    { name: 'attachments', label: 'Attachments (Bills, Receipts)', type: 'files', full: true, accept: 'image/*,.pdf', maxSizeMB: 5, placeholder: 'Attach Bills/Receipts' },
  ]

  // Build nav config inside component so dynamic select options (entities, expense types)
  // are captured fresh from current state when Add/Edit is clicked.
  const buildNavConfig = () => ({
    slug: 'account-entries',
    title: 'Expense',
    fields,
    defaultValues: { type: 'EXPENSE' },
    backTo: 'accounts-expenses' as const,
  })

  return (
    <ResourcePage
      slug="account-entries"
      title="Daily Expenses"
      description="Record daily expenses by type. Types are managed from Company Setup → Account Type Setup."
      fields={fields}
      columns={columns}
      addLabel="Add Expense"
      filter={{ type: 'EXPENSE' }}
      defaultValues={{ type: 'EXPENSE' }}
      moduleKey="accounts-expenses"
      onCustomAdd={() => navigateToAdd(buildNavConfig())}
      onCustomEdit={(row) => navigateToEdit(row.id, buildNavConfig())}
    />
  )
}
