'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { Badge } from '@/components/shared/PageHeader'
import { useEffect, useState } from 'react'
import { list } from '@/lib/api'
import { useApp } from '@/lib/store'

const columns: Col[] = [
  { key: 'entryNo', label: 'Entry No' },
  { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
  { key: 'entityId', label: 'Entity', render: (r) => r.entity?.name },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' },
  {
    key: 'method',
    label: 'Method',
    render: (r) => <Badge status={r.method === 'CASH' ? 'DELIVERED' : r.method === 'BANK' ? 'CONVERTED' : 'PENDING'} />,
  },
  {
    // Show the linked bank account when method=BANK.
    key: 'bankInfo',
    label: 'Bank Account',
    render: (r) => {
      if (r.method !== 'BANK') return <span className="text-muted-foreground">—</span>
      const b = r.bankInfo
      if (!b) return <span className="text-muted-foreground text-xs">Not linked</span>
      return (
        <span className="text-xs">
          {b.bankName}
          <span className="text-muted-foreground font-mono ml-1">({b.accountNumber})</span>
        </span>
      )
    },
  },
  { key: 'amount', label: 'Amount', render: (r) => `৳${(r.amount ?? 0).toFixed(2)}`, className: 'text-right' },
]

export function AccountsReceivePage() {
  const { setActive } = useApp()
  const [, setEntities] = useState<any[]>([])
  const [, setReceiveTypes] = useState<any[]>([])

  useEffect(() => {
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('account-types', { type: 'RECEIVE' }).then((r) => setReceiveTypes(r as any[])).catch(() => {})
  }, [])

  // Navigate to the dedicated ExpenseEntryPage with entryType=RECEIVE.
  // This gives us the conditional Bank Account ComboBox for free.
  const goAdd = () => {
    sessionStorage.removeItem('editingExpenseId')
    setActive('expense-receive-entry')
  }
  const goEdit = (row: any) => {
    sessionStorage.setItem('editingExpenseId', row.id)
    setActive('expense-receive-entry')
  }

  return (
    <ResourcePage
      slug="account-entries"
      title="Daily Receive"
      description="Record money received. When receipt is via Bank, select the bank account used. Types are managed from Company Setup → Account Type Setup."
      fields={[]}
      columns={columns}
      addLabel="Add Receive"
      filter={{ type: 'RECEIVE' }}
      defaultValues={{ type: 'RECEIVE' }}
      moduleKey="accounts-receive"
      onCustomAdd={goAdd}
      onCustomEdit={goEdit}
    />
  )
}
