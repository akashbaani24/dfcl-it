'use client'
import { ReportShell, Col, StatCard } from '@/components/shared/ReportShell'
import { TableCell } from '@/components/ui/table'

const REPORT_TYPES = [
  { value: 'status-wise', label: 'Status Wise', sublabel: 'Grouped by status (IN_STOCK, SOLD, etc.)' },
  { value: 'item-wise', label: 'Item Wise', sublabel: 'Grouped by item' },
  { value: 'entity-wise', label: 'Entity Wise', sublabel: 'Grouped by entity' },
  { value: 'details', label: 'Details', sublabel: 'All serials line-by-line' },
]

function getColumns(rt: string): Col[] {
  switch (rt) {
    case 'status-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'status', label: 'Status' },
        { key: 'count', label: 'Count', align: 'right' },
        { key: 'uniqueItems', label: 'Unique Items', align: 'right' },
      ]
    case 'item-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'itemCode', label: 'Item Code' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'inStock', label: 'In Stock', align: 'right' },
        { key: 'sold', label: 'Sold', align: 'right' },
        { key: 'other', label: 'Other', align: 'right' },
      ]
    case 'entity-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'entity', label: 'Entity' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'inStock', label: 'In Stock', align: 'right' },
        { key: 'sold', label: 'Sold', align: 'right' },
        { key: 'other', label: 'Other', align: 'right' },
      ]
    case 'details':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'serialNumber', label: 'Serial Number' },
        { key: 'barcode', label: 'Barcode' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'itemCode', label: 'Item Code' },
        { key: 'category', label: 'Category' },
        { key: 'entity', label: 'Entity' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created' },
      ]
    default:
      return []
  }
}

function renderRow(r: any, rt: string, idx: number): React.ReactNode {
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—'
  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      IN_STOCK: 'bg-green-100 text-green-700',
      SOLD: 'bg-blue-100 text-blue-700',
      RETURNED: 'bg-amber-100 text-amber-700',
      DAMAGED: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
        {status}
      </span>
    )
  }

  switch (rt) {
    case 'status-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell>{statusBadge(r.status)}</TableCell>
          <TableCell className="text-xs text-right font-medium">{r.count}</TableCell>
          <TableCell className="text-xs text-right">{r.uniqueItems}</TableCell>
        </>
      )
    case 'item-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
          <TableCell className="text-xs font-mono">{r.itemCode}</TableCell>
          <TableCell className="text-xs text-right font-medium">{r.total}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{r.inStock}</TableCell>
          <TableCell className="text-xs text-right text-blue-600">{r.sold}</TableCell>
          <TableCell className="text-xs text-right text-amber-600">{r.other}</TableCell>
        </>
      )
    case 'entity-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.entity}</TableCell>
          <TableCell className="text-xs text-right font-medium">{r.total}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{r.inStock}</TableCell>
          <TableCell className="text-xs text-right text-blue-600">{r.sold}</TableCell>
          <TableCell className="text-xs text-right text-amber-600">{r.other}</TableCell>
        </>
      )
    case 'details':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-mono">{r.serialNumber}</TableCell>
          <TableCell className="text-xs font-mono">{r.barcode}</TableCell>
          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
          <TableCell className="text-xs font-mono">{r.itemCode}</TableCell>
          <TableCell className="text-xs">{r.category}</TableCell>
          <TableCell className="text-xs">{r.entity}</TableCell>
          <TableCell>{statusBadge(r.status)}</TableCell>
          <TableCell className="text-xs">{fmtDate(r.createdAt)}</TableCell>
        </>
      )
    default:
      return null
  }
}

function renderTotalRow(rows: any[], data: any, rt: string): React.ReactNode {
  switch (rt) {
    case 'status-wise':
      return (
        <>
          <TableCell colSpan={2} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{data.totalSerials}</TableCell>
          <TableCell></TableCell>
        </>
      )
    case 'item-wise':
    case 'entity-wise':
      return (
        <>
          <TableCell colSpan={2} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{data.totalSerials}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{rows.reduce((s, r) => s + r.inStock, 0)}</TableCell>
          <TableCell className="text-xs text-right text-blue-600">{rows.reduce((s, r) => s + r.sold, 0)}</TableCell>
          <TableCell className="text-xs text-right text-amber-600">{rows.reduce((s, r) => s + r.other, 0)}</TableCell>
        </>
      )
    case 'details':
      return (
        <>
          <TableCell colSpan={8} className="text-right text-xs">Total Serials:</TableCell>
          <TableCell className="text-xs text-right font-medium">{data.totalSerials}</TableCell>
        </>
      )
    default:
      return null
  }
}

function getStats(data: any, rows: any[]): StatCard[] {
  if (!data) return []
  return [
    { label: 'Total Serials', value: String(data.totalSerials || 0) },
    { label: 'In Stock', value: String(rows.filter((r: any) => r.inStock !== undefined ? r.inStock : r.status === 'IN_STOCK').reduce((s: number, r: any) => s + (r.inStock || (r.status === 'IN_STOCK' ? r.count : 0)), 0)), color: 'text-green-600' },
    { label: 'Sold', value: String(rows.filter((r: any) => r.sold !== undefined ? r.sold : r.status === 'SOLD').reduce((s: number, r: any) => s + (r.sold || (r.status === 'SOLD' ? r.count : 0)), 0)), color: 'text-blue-600' },
    { label: 'Report Type', value: data.reportType || '—' },
  ]
}

function getExportColumns(rt: string) {
  return getColumns(rt).map(c => ({ key: c.key, label: c.label }))
}

export function ReportsSerialPage() {
  return (
    <ReportShell
      title="Serial Status Report"
      description="Track all item serials and their current status"
      permModule="reports-serial"
      reportTypes={REPORT_TYPES}
      apiType="serial-report"
      defaultReportType="status-wise"
      showDatePanel={false}
      columns={getColumns}
      renderRow={renderRow}
      renderTotalRow={renderTotalRow}
      stats={getStats}
      exportColumns={getExportColumns}
    />
  )
}
