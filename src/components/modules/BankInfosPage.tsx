'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { useNavigateToEdit } from '@/components/shared/useNavigateToEdit'

const columns: Col[] = [
  { key: 'bankName', label: 'Bank Name' },
  { key: 'accountName', label: 'Account Name' },
  { key: 'accountNumber', label: 'Account Number' },
  { key: 'branch', label: 'Branch' },
  { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
]

const fields = [
  { name: 'bankName', label: 'Bank Name', type: 'text' as const, required: true, placeholder: 'e.g. Dutch-Bangla Bank Ltd' },
  { name: 'accountName', label: 'Account Name', type: 'text' as const, required: true, placeholder: 'e.g. DFCL-IT Pvt Ltd' },
  { name: 'accountNumber', label: 'Account Number', type: 'text' as const, required: true, placeholder: 'e.g. 1234567890123' },
  { name: 'branch', label: 'Branch', type: 'text' as const, placeholder: 'e.g. Gulshan Branch' },
  { name: 'routingNumber', label: 'Routing Number', type: 'text' as const, placeholder: 'Optional' },
  { name: 'swiftCode', label: 'SWIFT Code', type: 'text' as const, placeholder: 'Optional' },
  { name: 'isActive', label: 'Active', type: 'switch' as const, default: true },
]

export function BankInfosPage() {
  const { navigateToAdd, navigateToEdit } = useNavigateToEdit()

  return (
    <ResourcePage
      slug="bank-infos"
      title="Bank Information"
      description="Bank accounts for sales payments, expenses, and receives"
      columns={columns}
      addLabel="Add Bank"
      onCustomAdd={() => navigateToAdd({ slug: 'bank-infos', title: 'Bank', fields, backTo: 'bank-infos' })}
      onCustomEdit={(row) => navigateToEdit(row.id, { slug: 'bank-infos', title: 'Bank', fields, backTo: 'bank-infos' })}
    />
  )
}
