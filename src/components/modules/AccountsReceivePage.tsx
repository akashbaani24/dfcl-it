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

const RECEIVE_CATEGORIES = ['SALES_PAYMENT', 'REFUND_RECEIVED', 'ADVANCE', 'DEPOSIT', 'OTHER_INCOME']

export function AccountsReceivePage() {
  const [entities, setEntities] = useState<any[]>([])
  useEffect(() => { list('entities').then((r) => setEntities(r as any[])).catch(() => {}) }, [])
  const fields: FieldDef[] = [
    {
      name: 'entityId', label: 'Entity', type: 'select', required: true,
      options: entities.map((e) => ({ value: e.id, label: e.name })),
    },
    {
      name: 'category', label: 'Receive Type', type: 'select', required: true,
      options: RECEIVE_CATEGORIES.map((c) => ({ value: c, label: c })),
    },
    { name: 'amount', label: 'Amount (৳)', type: 'number', required: true, default: 0 },
    { name: 'date', label: 'Date', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
    {
      name: 'method', label: 'Receipt Method', type: 'select', default: 'CASH',
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
      title="Daily Receive"
      description="Record money received — sales payments, deposits, etc."
      fields={fields}
      columns={columns}
      addLabel="Add Receive"
      filter={{ type: 'RECEIVE' }}
      defaultValues={{ type: 'RECEIVE' }}
    />
  )
}
