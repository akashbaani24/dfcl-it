'use client'
import { ReportShell, Col, StatCard } from '@/components/shared/ReportShell'
import { TableCell } from '@/components/ui/table'
import { Badge } from '@/components/shared/PageHeader'

const REPORT_TYPES = [
  { value: 'summary', label: 'Summary', sublabel: 'One row per sale' },
  { value: 'customer-wise', label: 'Customer Wise', sublabel: 'Grouped by customer' },
  { value: 'entity-wise', label: 'Entity Wise', sublabel: 'Grouped by entity' },
  { value: 'item-wise', label: 'Item Wise', sublabel: 'Grouped by item' },
  { value: 'category-wise', label: 'Category Wise', sublabel: 'Grouped by category' },
]

function getColumns(rt: string): Col[] {
  switch (rt) {
    case 'summary':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'salesNo', label: 'Sales No' },
        { key: 'salesDate', label: 'Date' },
        { key: 'entity', label: 'Entity' },
        { key: 'customer', label: 'Customer' },
        { key: 'customerPhone', label: 'Phone' },
        { key: 'itemCount', label: 'Items', align: 'right' },
        { key: 'totalQty', label: 'Qty', align: 'right' },
        { key: 'totalAmount', label: 'Total', align: 'right' },
        { key: 'paidAmount', label: 'Paid', align: 'right' },
        { key: 'due', label: 'Due', align: 'right' },
        { key: 'status', label: 'Status' },
      ]
    case 'customer-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'customer', label: 'Customer' },
        { key: 'phone', label: 'Phone' },
        { key: 'salesCount', label: 'Sales', align: 'right' },
        { key: 'totalAmount', label: 'Total Amount', align: 'right' },
        { key: 'totalPaid', label: 'Total Paid', align: 'right' },
      ]
    case 'entity-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'entity', label: 'Entity' },
        { key: 'salesCount', label: 'Sales', align: 'right' },
        { key: 'totalAmount', label: 'Total Amount', align: 'right' },
        { key: 'totalPaid', label: 'Total Paid', align: 'right' },
      ]
    case 'item-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'modelNo', label: 'Model No' },
        { key: 'uom', label: 'UoM' },
        { key: 'salesCount', label: 'Times Sold', align: 'right' },
        { key: 'qty', label: 'Total Qty', align: 'right' },
        { key: 'totalAmount', label: 'Total Amount', align: 'right' },
      ]
    case 'category-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'category', label: 'Category' },
        { key: 'itemCount', label: 'Item Count', align: 'right' },
        { key: 'qty', label: 'Total Qty', align: 'right' },
        { key: 'totalAmount', label: 'Total Amount', align: 'right' },
      ]
    default:
      return []
  }
}

function renderRow(r: any, rt: string, idx: number): React.ReactNode {
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—'
  const fmtMoney = (n: number) => `৳${(n || 0).toFixed(2)}`

  switch (rt) {
    case 'summary':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-mono">{r.salesNo}</TableCell>
          <TableCell className="text-xs">{fmtDate(r.salesDate)}</TableCell>
          <TableCell className="text-xs">{r.entity}</TableCell>
          <TableCell className="text-xs font-medium">{r.customer}</TableCell>
          <TableCell className="text-xs">{r.customerPhone}</TableCell>
          <TableCell className="text-xs text-right">{r.itemCount}</TableCell>
          <TableCell className="text-xs text-right">{r.totalQty}</TableCell>
          <TableCell className="text-xs text-right font-medium">{fmtMoney(r.totalAmount)}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{fmtMoney(r.paidAmount)}</TableCell>
          <TableCell className="text-xs text-right text-orange-600">{fmtMoney(r.due)}</TableCell>
          <TableCell><Badge status={r.status} /></TableCell>
        </>
      )
    case 'customer-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.customer}</TableCell>
          <TableCell className="text-xs">{r.phone || '—'}</TableCell>
          <TableCell className="text-xs text-right">{r.salesCount}</TableCell>
          <TableCell className="text-xs text-right font-medium">{fmtMoney(r.totalAmount)}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{fmtMoney(r.totalPaid)}</TableCell>
        </>
      )
    case 'entity-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.entity}</TableCell>
          <TableCell className="text-xs text-right">{r.salesCount}</TableCell>
          <TableCell className="text-xs text-right font-medium">{fmtMoney(r.totalAmount)}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{fmtMoney(r.totalPaid)}</TableCell>
        </>
      )
    case 'item-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
          <TableCell className="text-xs font-mono">{r.modelNo}</TableCell>
          <TableCell className="text-xs">{r.uom}</TableCell>
          <TableCell className="text-xs text-right">{r.salesCount}</TableCell>
          <TableCell className="text-xs text-right">{r.qty}</TableCell>
          <TableCell className="text-xs text-right font-medium">{fmtMoney(r.totalAmount)}</TableCell>
        </>
      )
    case 'category-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.category}</TableCell>
          <TableCell className="text-xs text-right">{r.itemCount}</TableCell>
          <TableCell className="text-xs text-right">{r.qty}</TableCell>
          <TableCell className="text-xs text-right font-medium">{fmtMoney(r.totalAmount)}</TableCell>
        </>
      )
    default:
      return null
  }
}

function renderTotalRow(rows: any[], data: any, rt: string): React.ReactNode {
  const fmtMoney = (n: number) => `৳${(n || 0).toFixed(2)}`
  const { TableCell } = require('@/components/ui/table')

  switch (rt) {
    case 'summary':
      return (
        <>
          <TableCell colSpan={7} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{rows.reduce((s, r) => s + r.totalQty, 0)}</TableCell>
          <TableCell className="text-xs text-right">{fmtMoney(data.totalAmount)}</TableCell>
          <TableCell className="text-xs text-right">{fmtMoney(data.totalPaid)}</TableCell>
          <TableCell className="text-xs text-right">{fmtMoney(data.totalAmount - data.totalPaid)}</TableCell>
          <TableCell></TableCell>
        </>
      )
    case 'customer-wise':
    case 'entity-wise':
      return (
        <>
          <TableCell colSpan={2} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{rows.reduce((s, r) => s + r.salesCount, 0)}</TableCell>
          <TableCell className="text-xs text-right">{fmtMoney(data.totalAmount)}</TableCell>
          <TableCell className="text-xs text-right">{fmtMoney(rows.reduce((s, r) => s + r.totalPaid, 0))}</TableCell>
        </>
      )
    case 'item-wise':
      return (
        <>
          <TableCell colSpan={4} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{data.totalQty}</TableCell>
          <TableCell className="text-xs text-right">{fmtMoney(data.totalAmount)}</TableCell>
        </>
      )
    case 'category-wise':
      return (
        <>
          <TableCell colSpan={3} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{rows.reduce((s, r) => s + r.qty, 0)}</TableCell>
          <TableCell className="text-xs text-right">{fmtMoney(data.totalAmount)}</TableCell>
        </>
      )
    default:
      return null
  }
}

function getStats(data: any, rows: any[]): StatCard[] {
  if (!data) return []
  return [
    { label: 'Total Sales', value: String(rows.length) },
    { label: 'Total Amount', value: `৳${(data.totalAmount || 0).toFixed(2)}`, color: 'text-blue-600' },
    { label: 'Total Paid', value: `৳${(data.totalPaid || 0).toFixed(2)}`, color: 'text-emerald-600' },
    { label: 'Total Due', value: `৳${((data.totalAmount || 0) - (data.totalPaid || 0)).toFixed(2)}`, color: 'text-orange-600' },
  ]
}

function getExportColumns(rt: string) {
  return getColumns(rt).map(c => ({ key: c.key, label: c.label }))
}

export function ReportsSalesPage() {
  return (
    <ReportShell
      title="Sales Report"
      description="Sales reports with date filtering and grouping options"
      permModule="reports-sales"
      reportTypes={REPORT_TYPES}
      apiType="sales-report"
      defaultReportType="summary"
      columns={getColumns}
      renderRow={renderRow}
      renderTotalRow={renderTotalRow}
      stats={getStats}
      exportColumns={getExportColumns}
    />
  )
}
