'use client'
import { ReportShell, Col, StatCard } from '@/components/shared/ReportShell'
import { TableCell } from '@/components/ui/table'
import { Badge } from '@/components/shared/PageHeader'

const REPORT_TYPES = [
  { value: 'summary', label: 'Summary', sublabel: 'One row per adjustment' },
  { value: 'details', label: 'Details', sublabel: 'Line-by-line item details' },
  { value: 'entity-wise', label: 'Entity Wise', sublabel: 'Grouped by entity' },
  { value: 'type-wise', label: 'Type Wise', sublabel: 'Grouped by Excess/Shortage/Reject/Wastage' },
  { value: 'item-wise', label: 'Item Wise', sublabel: 'Grouped by item' },
  { value: 'status-wise', label: 'Status Wise', sublabel: 'Grouped by status' },
]

function getColumns(rt: string): Col[] {
  switch (rt) {
    case 'summary':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'adjustNo', label: 'Adjust No' },
        { key: 'adjustDate', label: 'Date' },
        { key: 'entity', label: 'Entity' },
        { key: 'type', label: 'Type' },
        { key: 'reason', label: 'Reason' },
        { key: 'itemCount', label: 'Items', align: 'right' },
        { key: 'totalQty', label: 'Qty', align: 'right' },
        { key: 'status', label: 'Status' },
      ]
    case 'details':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'adjustNo', label: 'Adjust No' },
        { key: 'adjustDate', label: 'Date' },
        { key: 'entity', label: 'Entity' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'itemCode', label: 'Model No' },
        { key: 'barcode', label: 'Barcode' },
        { key: 'serialNumber', label: 'Serial' },
        { key: 'qty', label: 'Qty', align: 'right' },
        { key: 'uom', label: 'UoM' },
        { key: 'adjustType', label: 'Adjust Type' },
        { key: 'status', label: 'Status' },
      ]
    case 'entity-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'entity', label: 'Entity' },
        { key: 'count', label: 'Adjustments', align: 'right' },
        { key: 'increase', label: 'Excess Qty', align: 'right' },
        { key: 'decrease', label: 'Decrease Qty', align: 'right' },
        { key: 'totalQty', label: 'Total Qty', align: 'right' },
      ]
    case 'type-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'adjustType', label: 'Adjust Type' },
        { key: 'count', label: 'Count', align: 'right' },
        { key: 'totalQty', label: 'Total Qty', align: 'right' },
      ]
    case 'item-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'itemCode', label: 'Model No' },
        { key: 'uom', label: 'UoM' },
        { key: 'count', label: 'Times Adjusted', align: 'right' },
        { key: 'totalQty', label: 'Total Qty', align: 'right' },
      ]
    case 'status-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'status', label: 'Status' },
        { key: 'count', label: 'Count', align: 'right' },
        { key: 'totalQty', label: 'Total Qty', align: 'right' },
      ]
    default:
      return []
  }
}

function renderRow(r: any, rt: string, idx: number): React.ReactNode {
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—'

  switch (rt) {
    case 'summary':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-mono">{r.adjustNo}</TableCell>
          <TableCell className="text-xs">{fmtDate(r.adjustDate)}</TableCell>
          <TableCell className="text-xs">{r.entity}</TableCell>
          <TableCell>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${r.type === 'INCREASE' ? 'bg-green-100 text-green-700' : r.type === 'DECREASE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
              {r.type}
            </span>
          </TableCell>
          <TableCell className="text-xs max-w-[200px] truncate">{r.reason}</TableCell>
          <TableCell className="text-xs text-right">{r.itemCount}</TableCell>
          <TableCell className="text-xs text-right font-medium">{r.totalQty}</TableCell>
          <TableCell><Badge status={r.status} /></TableCell>
        </>
      )
    case 'details':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-mono">{r.adjustNo}</TableCell>
          <TableCell className="text-xs">{fmtDate(r.adjustDate)}</TableCell>
          <TableCell className="text-xs">{r.entity}</TableCell>
          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
          <TableCell className="text-xs font-mono">{r.itemCode}</TableCell>
          <TableCell className="text-xs font-mono">{r.barcode}</TableCell>
          <TableCell className="text-xs font-mono">{r.serialNumber}</TableCell>
          <TableCell className="text-xs text-right font-medium">{r.qty}</TableCell>
          <TableCell className="text-xs">{r.uom}</TableCell>
          <TableCell>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${r.adjustType === 'EXCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {r.adjustType}
            </span>
          </TableCell>
          <TableCell><Badge status={r.status} /></TableCell>
        </>
      )
    case 'entity-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.entity}</TableCell>
          <TableCell className="text-xs text-right">{r.count}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{r.increase}</TableCell>
          <TableCell className="text-xs text-right text-red-600">{r.decrease}</TableCell>
          <TableCell className="text-xs text-right font-medium">{r.totalQty}</TableCell>
        </>
      )
    case 'type-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.adjustType === 'EXCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {r.adjustType}
            </span>
          </TableCell>
          <TableCell className="text-xs text-right">{r.count}</TableCell>
          <TableCell className="text-xs text-right font-medium">{r.totalQty}</TableCell>
        </>
      )
    case 'item-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
          <TableCell className="text-xs font-mono">{r.itemCode}</TableCell>
          <TableCell className="text-xs">{r.uom}</TableCell>
          <TableCell className="text-xs text-right">{r.count}</TableCell>
          <TableCell className="text-xs text-right font-medium">{r.totalQty}</TableCell>
        </>
      )
    case 'status-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell><Badge status={r.status} /></TableCell>
          <TableCell className="text-xs text-right">{r.count}</TableCell>
          <TableCell className="text-xs text-right font-medium">{r.totalQty}</TableCell>
        </>
      )
    default:
      return null
  }
}

function renderTotalRow(rows: any[], data: any, rt: string): React.ReactNode {
  const { TableCell } = require('@/components/ui/table')
  switch (rt) {
    case 'summary':
      return (
        <>
          <TableCell colSpan={6} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{rows.reduce((s, r) => s + r.itemCount, 0)}</TableCell>
          <TableCell className="text-xs text-right">{data.totalQty}</TableCell>
          <TableCell></TableCell>
        </>
      )
    case 'details':
      return (
        <>
          <TableCell colSpan={8} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{data.totalQty}</TableCell>
          <TableCell colSpan={3}></TableCell>
        </>
      )
    case 'entity-wise':
      return (
        <>
          <TableCell colSpan={2} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{rows.reduce((s, r) => s + r.count, 0)}</TableCell>
          <TableCell className="text-xs text-right text-green-600">{rows.reduce((s, r) => s + r.increase, 0)}</TableCell>
          <TableCell className="text-xs text-right text-red-600">{rows.reduce((s, r) => s + r.decrease, 0)}</TableCell>
          <TableCell className="text-xs text-right">{data.totalQty}</TableCell>
        </>
      )
    case 'type-wise':
    case 'item-wise':
    case 'status-wise':
      return (
        <>
          <TableCell colSpan={2} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{rows.reduce((s, r) => s + r.count, 0)}</TableCell>
          <TableCell className="text-xs text-right">{data.totalQty}</TableCell>
        </>
      )
    default:
      return null
  }
}

function getStats(data: any, rows: any[]): StatCard[] {
  if (!data) return []
  return [
    { label: 'Total Adjustments', value: String(rows.length) },
    { label: 'Total Qty', value: String(data.totalQty || 0), color: 'text-blue-600' },
    { label: 'Report Type', value: data.reportType || '—' },
  ]
}

function getExportColumns(rt: string) {
  return getColumns(rt).map(c => ({ key: c.key, label: c.label }))
}

export function ReportsAdjustmentPage() {
  return (
    <ReportShell
      title="Adjustment Report"
      description="Stock adjustments — excess, shortage, reject, wastage with date filtering"
      permModule="adjustments"
      reportTypes={REPORT_TYPES}
      apiType="adjustment-report"
      defaultReportType="summary"
      columns={getColumns}
      renderRow={renderRow}
      renderTotalRow={renderTotalRow}
      stats={getStats}
      exportColumns={getExportColumns}
    />
  )
}
