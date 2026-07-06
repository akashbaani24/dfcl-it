'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'
import { useNavigateToEdit } from '@/components/shared/useNavigateToEdit'

const columns: Col[] = [
  { key: 'sortOrder', label: 'Order' },
  { key: 'message', label: 'Message' },
  { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
]
const fields: FieldDef[] = [
  { name: 'message', label: 'Ticker Message', required: true, full: true, type: 'textarea' },
  { name: 'sortOrder', label: 'Sort Order', type: 'number', default: 1 },
  { name: 'isActive', label: 'Active', type: 'switch', default: true },
]

const navConfig = { slug: 'news-ticker', title: 'News Ticker', fields, backTo: 'news-ticker' as const }

export function NewsTickerPage() {
  const { navigateToAdd, navigateToEdit } = useNavigateToEdit()
  return (
    <ResourcePage
      slug="news-ticker"
      title="News Ticker"
      description="Notice messages that scroll on the top of every page"
      fields={fields}
      columns={columns}
      addLabel="Add Ticker"
      onCustomAdd={() => navigateToAdd(navConfig)}
      onCustomEdit={(row) => navigateToEdit(row.id, navConfig)}
    />
  )
}
