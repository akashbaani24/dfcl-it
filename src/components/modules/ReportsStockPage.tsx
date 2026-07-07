'use client'
import { ReportShell, Col, StatCard } from '@/components/shared/ReportShell'
import { TableCell } from '@/components/ui/table'

const REPORT_TYPES = [
  { value: 'summary', label: 'Summary', sublabel: 'Total stock per item' },
  { value: 'entity-wise', label: 'Entity Wise', sublabel: 'Stock per entity + item' },
  { value: 'item-wise', label: 'Item Wise', sublabel: 'Stock per item with entity breakdown' },
  { value: 'category-wise', label: 'Category Wise', sublabel: 'Stock grouped by category' },
]

function getColumns(rt: string): Col[] {
  switch (rt) {
    case 'summary':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'itemCode', label: 'Item Code' },
        { key: 'category', label: 'Category' },
        { key: 'uom', label: 'UoM' },
        { key: 'totalStock', label: 'Total Stock', align: 'right' },
      ]
    case 'entity-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'entity', label: 'Entity' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'itemCode', label: 'Item Code' },
        { key: 'category', label: 'Category' },
        { key: 'uom', label: 'UoM' },
        { key: 'stock', label: 'Stock', align: 'right' },
      ]
    case 'item-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'itemCode', label: 'Item Code' },
        { key: 'uom', label: 'UoM' },
        { key: 'totalStock', label: 'Total Stock', align: 'right' },
        { key: 'entities', label: 'Entity Breakdown' },
      ]
    case 'category-wise':
      return [
        { key: 'sl', label: 'Sl' },
        { key: 'category', label: 'Category' },
        { key: 'itemCount', label: 'Item Count', align: 'right' },
        { key: 'totalStock', label: 'Total Stock', align: 'right' },
      ]
    default:
      return []
  }
}

function renderRow(r: any, rt: string, idx: number): React.ReactNode {
  switch (rt) {
    case 'summary':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
          <TableCell className="text-xs font-mono">{r.itemCode}</TableCell>
          <TableCell className="text-xs">{r.category}</TableCell>
          <TableCell className="text-xs">{r.uom}</TableCell>
          <TableCell className="text-xs text-right font-medium text-blue-600">{r.totalStock}</TableCell>
        </>
      )
    case 'entity-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.entity}</TableCell>
          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
          <TableCell className="text-xs font-mono">{r.itemCode}</TableCell>
          <TableCell className="text-xs">{r.category}</TableCell>
          <TableCell className="text-xs">{r.uom}</TableCell>
          <TableCell className="text-xs text-right font-medium text-blue-600">{r.stock}</TableCell>
        </>
      )
    case 'item-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
          <TableCell className="text-xs font-mono">{r.itemCode}</TableCell>
          <TableCell className="text-xs">{r.uom}</TableCell>
          <TableCell className="text-xs text-right font-medium text-blue-600">{r.totalStock}</TableCell>
          <TableCell className="text-xs">
            <div className="flex flex-wrap gap-1">
              {r.entities?.map((e: any, i: number) => (
                <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {e.entity}: <b>{e.stock}</b>
                </span>
              ))}
            </div>
          </TableCell>
        </>
      )
    case 'category-wise':
      return (
        <>
          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
          <TableCell className="text-xs font-medium">{r.category}</TableCell>
          <TableCell className="text-xs text-right">{r.itemCount}</TableCell>
          <TableCell className="text-xs text-right font-medium text-blue-600">{r.totalStock}</TableCell>
        </>
      )
    default:
      return null
  }
}

function renderTotalRow(rows: any[], data: any, rt: string): React.ReactNode {
  switch (rt) {
    case 'summary':
    case 'item-wise':
      return (
        <>
          <TableCell colSpan={4} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{data.totalStock}</TableCell>
          {rt === 'item-wise' && <TableCell></TableCell>}
        </>
      )
    case 'entity-wise':
      return (
        <>
          <TableCell colSpan={6} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{data.totalStock}</TableCell>
        </>
      )
    case 'category-wise':
      return (
        <>
          <TableCell colSpan={2} className="text-right text-xs">Total:</TableCell>
          <TableCell className="text-xs text-right">{rows.reduce((s, r) => s + r.itemCount, 0)}</TableCell>
          <TableCell className="text-xs text-right">{data.totalStock}</TableCell>
        </>
      )
    default:
      return null
  }
}

function getStats(data: any, rows: any[]): StatCard[] {
  if (!data) return []
  return [
    { label: 'Total Items', value: String(rows.length) },
    { label: 'Total Stock', value: String(data.totalStock || 0), color: 'text-blue-600' },
    { label: 'Report Type', value: data.reportType || '—' },
    { label: 'Range', value: 'All Time' },
  ]
}

function getExportColumns(rt: string) {
  // For item-wise, flatten the entities array for export
  if (rt === 'item-wise') {
    return [
      { key: 'sl', label: 'Sl' },
      { key: 'itemName', label: 'Item Name' },
      { key: 'itemCode', label: 'Item Code' },
      { key: 'uom', label: 'UoM' },
      { key: 'totalStock', label: 'Total Stock' },
    ]
  }
  return getColumns(rt).map(c => ({ key: c.key, label: c.label }))
}

export function ReportsStockPage() {
  return (
    <ReportShell
      title="Stock Report"
      description="Current stock levels across all entities"
      permModule="reports-stock"
      reportTypes={REPORT_TYPES}
      apiType="stock-report"
      defaultReportType="summary"
      showDatePanel={false}
      columns={getColumns}
      renderRow={renderRow}
      renderTotalRow={renderTotalRow}
      stats={getStats}
      exportColumns={getExportColumns}
    />
  )
}
