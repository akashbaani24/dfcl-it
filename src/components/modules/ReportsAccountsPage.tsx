'use client'
import { ReportShell, Col, StatCard } from '@/components/shared/ReportShell'
import { TableCell } from '@/components/ui/table'

const REPORT_TYPES = [
  { value: 'summary', label: 'Summary', sublabel: 'All transactions' },
  { value: 'category-wise', label: 'Category Wise', sublabel: 'Grouped by category' },
  { value: 'entity-wise', label: 'Entity Wise', sublabel: 'Grouped by entity' },
  { value: 'type-wise', label: 'Type Wise', sublabel: 'Expense vs Receive' },
]

function getColumns(rt: string): Col[] {
  switch (rt) {
    case 'summary':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'entryNo', label: 'Entry No' },
        { key: 'date', label: 'Date' },
        { key: 'entity', label: 'Entity' },
        { key: 'type', label: 'Type' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount', align: 'right' },
        { key: 'method', label: 'Method' },
        { key: 'description', label: 'Description' },
      ]
    case 'category-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'category', label: 'Category' },
        { key: 'count', label: 'Count', align: 'right' },
        { key: 'expense', label: 'Expense', align: 'right' },
        { key: 'receive', label: 'Receive', align: 'right' },
        { key: 'net', label: 'Net', align: 'right' },
      ]
    case 'entity-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'entity', label: 'Entity' },
        { key: 'count', label: 'Count', align: 'right' },
        { key: 'expense', label: 'Expense', align: 'right' },
        { key: 'receive', label: 'Receive', align: 'right' },
        { key: 'net', label: 'Net', align: 'right' },
      ]
    case 'type-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'type', label: 'Type' },
        { key: 'count', label: 'Count', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
      ]
    default:
      return []
  }
}

function renderRow(r: any, rt: string, idx: number): React.ReactNode {
  const fmtMoney = (n: number) => `৳${(n || 0).toFixed(2)}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—'

  switch (rt) {
    case 'summary':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-mono">{r.entryNo}</TableCell>
          <TableCell className="text-xs">{fmtDate(r.date)}</TableCell>
          <TableCell className="text-xs">{r.entity}</TableCell>
          <TableCell>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${r.type === 'EXPENSE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {r.type}
            </span>
          </TableCell>
          <TableCell className="text-xs">{r.category}</TableCell>
          <TableCell className={`text-xs text-right font-medium ${r.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(r.amount)}</TableCell>
          <TableCell className="text-xs">{r.method}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{r.description}</TableCell>
        </>
      )
    case 'category-wise':
    case 'entity-wise':
      const key = rt === 'category-wise' ? r.category : r.entity
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{key}</TableCell>
          <TableCell className="text-xs text-right">{r.count}</TableCell>
          <TableCell className="text-xs text-right text-red-600">{fmtMoney(r.expense)}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{fmtMoney(r.receive)}</TableCell>
          <TableCell className={`text-xs text-right font-medium ${r.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtMoney(r.net)}</TableCell>
        </>
      )
    case 'type-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.type === 'EXPENSE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {r.type}
            </span>
          </TableCell>
          <TableCell className="text-xs text-right">{r.count}</TableCell>
          <TableCell className={`text-xs text-right font-medium ${r.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(r.total)}</TableCell>
        </>
      )
    default:
      return null
  }
}

function renderTotalRow(rows: any[], data: any, rt: string): React.ReactNode {
  const fmtMoney = (n: number) => `৳${(n || 0).toFixed(2)}`

  switch (rt) {
    case 'summary':
      return (
        <>
          <TableCell colSpan={6} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">Expense: <span className="text-red-600">{fmtMoney(data.totalExpense)}</span> | Receive: <span className="text-green-600">{fmtMoney(data.totalReceive)}</span></TableCell>
          <TableCell colSpan={2}></TableCell>
        </>
      )
    case 'category-wise':
    case 'entity-wise':
      return (
        <>
          <TableCell colSpan={2} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{rows.reduce((s, r) => s + r.count, 0)}</TableCell>
          <TableCell className="text-xs text-right text-red-600">{fmtMoney(data.totalExpense)}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{fmtMoney(data.totalReceive)}</TableCell>
          <TableCell className="text-xs text-right font-medium">{fmtMoney(data.totalReceive - data.totalExpense)}</TableCell>
        </>
      )
    case 'type-wise':
      return (
        <>
          <TableCell colSpan={2} className="text-right text-xs">Net:</TableCell>
          <TableCell className="text-xs text-right">{rows.reduce((s, r) => s + r.count, 0)}</TableCell>
          <TableCell className="text-xs text-right font-medium">{fmtMoney(data.totalReceive - data.totalExpense)}</TableCell>
        </>
      )
    default:
      return null
  }
}

function getStats(data: any, rows: any[]): StatCard[] {
  if (!data) return []
  return [
    { label: 'Total Entries', value: String(rows.length) },
    { label: 'Total Expense', value: `৳${(data.totalExpense || 0).toFixed(2)}`, color: 'text-red-600' },
    { label: 'Total Receive', value: `৳${(data.totalReceive || 0).toFixed(2)}`, color: 'text-green-600' },
    { label: 'Net', value: `৳${((data.totalReceive || 0) - (data.totalExpense || 0)).toFixed(2)}`, color: ((data.totalReceive || 0) - (data.totalExpense || 0)) >= 0 ? 'text-green-600' : 'text-red-600' },
  ]
}

function getExportColumns(rt: string) {
  return getColumns(rt).map(c => ({ key: c.key, label: c.label }))
}

export function ReportsAccountsPage() {
  return (
    <ReportShell
      title="Accounts Report"
      description="Expense and receive transactions with grouping options"
      permModule="reports-accounts"
      reportTypes={REPORT_TYPES}
      apiType="accounts-report"
      defaultReportType="summary"
      columns={getColumns}
      renderRow={renderRow}
      renderTotalRow={renderTotalRow}
      stats={getStats}
      exportColumns={getExportColumns}
    />
  )
}
