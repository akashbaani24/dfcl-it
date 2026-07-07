'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ComboBox } from '@/components/ui/combobox'
import { report } from '@/lib/api'
import { usePerm } from '@/components/shared/Perms'
import { exportToCSV, exportToPDF } from '@/lib/export'
import { SearchInput } from '@/components/shared/SearchInput'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Calendar, FileText, TrendingUp, Package, Users, Building2, Tags, FolderTree, Loader2, FileSpreadsheet, FileType } from 'lucide-react'

type ReportType = 'details' | 'summary' | 'supplier-wise' | 'purchase-for' | 'item-wise' | 'category-wise' | 'sub-category-wise'
type Range = 'daily' | 'monthly' | 'yearly' | 'custom'

const REPORT_TYPES: Array<{ value: ReportType; label: string; icon: any; desc: string }> = [
  { value: 'details', label: 'Details', icon: FileText, desc: 'Line-by-line item details per purchase' },
  { value: 'summary', label: 'Summary', icon: TrendingUp, desc: 'One row per purchase with totals' },
  { value: 'supplier-wise', label: 'Supplier Wise', icon: Users, desc: 'Grouped by supplier' },
  { value: 'purchase-for', label: 'Purchase For', icon: Building2, desc: 'Grouped by entity' },
  { value: 'item-wise', label: 'Item Wise', icon: Package, desc: 'Grouped by item' },
  { value: 'category-wise', label: 'Category Wise', icon: Tags, desc: 'Grouped by top-level category' },
  { value: 'sub-category-wise', label: 'Sub-Category Wise', icon: FolderTree, desc: 'Grouped by sub-category' },
]

// Generate month options for the monthly range (last 24 months)
function getMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

// Generate year options (last 5 years + next year)
function getYearOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()
  for (let i = -1; i < 5; i++) {
    const y = now.getFullYear() - i
    options.push({ value: String(y), label: String(y) })
  }
  return options
}

// Generate day options (last 30 days)
function getDayOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const value = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export function ReportsPurchasePage() {
  const perm = usePerm('reports-purchase')
  const { currentEntityId, selectedEntityId } = useApp()
  const { user } = useAuth()

  const [reportType, setReportType] = useState<ReportType>('details')
  const [range, setRange] = useState<Range>('monthly')

  // For daily: a single day picker
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10))
  // For monthly: from-month and to-month pickers
  const [fromMonth, setFromMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [toMonth, setToMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  // For yearly: from-year and to-year pickers
  const [fromYear, setFromYear] = useState(() => String(new Date().getFullYear()))
  const [toYear, setToYear] = useState(() => String(new Date().getFullYear()))
  // For custom: date pickers
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  // Build the API params based on the selected range
  const buildParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = {
      type: 'purchase-report',
      reportType,
      range,
    }

    if (range === 'daily') {
      // Single day: from = to = selectedDay
      params.from = selectedDay
      params.to = selectedDay
    } else if (range === 'monthly') {
      // From-month: first day of that month
      // To-month: last day of that month
      const [fy, fm] = fromMonth.split('-').map(Number)
      const [ty, tm] = toMonth.split('-').map(Number)
      const fromStart = new Date(fy, fm - 1, 1)
      const toEnd = new Date(ty, tm, 0, 23, 59, 59, 999) // last day of to-month
      params.from = fromStart.toISOString().slice(0, 10)
      params.to = toEnd.toISOString().slice(0, 10)
    } else if (range === 'yearly') {
      // From-year: Jan 1
      // To-year: Dec 31
      params.from = `${fromYear}-01-01`
      params.to = `${toYear}-12-31`
    } else if (range === 'custom') {
      params.from = from
      params.to = to
    }

    return params
  }, [reportType, range, selectedDay, fromMonth, toMonth, fromYear, toYear, from, to])

  const load = useCallback(async () => {
    if (!perm.canView) return
    setLoading(true)
    try {
      const r = await report('purchase-report', buildParams())
      setData(r)
    } catch (e: any) {
      console.error('Report load error:', e)
    } finally {
      setLoading(false)
    }
  }, [perm.canView, buildParams])

  useEffect(() => {
    load()
  }, [load])

  const rows = data?.rows || []
  const filtered = useMemo(() => {
    if (!q) return rows
    const ql = q.toLowerCase()
    return rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql))
  }, [q, rows])

  if (!perm.canView) return <EmptyState title="Access denied" hint="You don't have permission to view this report" />

  // Format date range for display
  const rangeLabel = (() => {
    if (range === 'daily') {
      const d = new Date(selectedDay)
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    }
    if (range === 'monthly') {
      const [fy, fm] = fromMonth.split('-').map(Number)
      const [ty, tm] = toMonth.split('-').map(Number)
      const f = new Date(fy, fm - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const t = new Date(ty, tm - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      return `${f} to ${t}`
    }
    if (range === 'yearly') return `${fromYear} to ${toYear}`
    if (range === 'custom') return `${from} to ${to}`
    return ''
  })()

  const entityName = user?.employee?.name ? `${user.employee.name}'s Entity` : 'Head Office'

  // Build export columns based on report type
  const getExportColumns = () => {
    switch (reportType) {
      case 'details':
        return [
          { key: 'sl', label: 'Sl' },
          { key: 'purchaseDate', label: 'Purchase Date' },
          { key: 'purchaseId', label: 'Purchase ID' },
          { key: 'receiveNo', label: 'Purchase Receive ID' },
          { key: 'purchaseFor', label: 'Purchase For' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'itemName', label: 'Item Name' },
          { key: 'modelNo', label: 'Model No' },
          { key: 'size', label: 'Size' },
          { key: 'barcode', label: 'Barcode' },
          { key: 'serialNumber', label: 'Serial Number' },
          { key: 'qty', label: 'Qty' },
          { key: 'uom', label: 'UoM' },
          { key: 'unitPrice', label: 'Unit Price' },
          { key: 'total', label: 'Total' },
        ]
      case 'summary':
        return [
          { key: 'sl', label: 'Sl' },
          { key: 'purchaseNo', label: 'PO No' },
          { key: 'purchaseDate', label: 'Date' },
          { key: 'purchaseFor', label: 'Purchase For' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'itemCount', label: 'Items' },
          { key: 'totalQty', label: 'Qty' },
          { key: 'totalAmount', label: 'Total' },
          { key: 'status', label: 'Status' },
        ]
      case 'supplier-wise':
        return [
          { key: 'sl', label: 'Sl' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'purchaseCount', label: 'Purchases' },
          { key: 'totalQty', label: 'Total Qty' },
          { key: 'totalAmount', label: 'Total Amount' },
        ]
      case 'purchase-for':
        return [
          { key: 'sl', label: 'Sl' },
          { key: 'purchaseFor', label: 'Entity' },
          { key: 'purchaseCount', label: 'Purchases' },
          { key: 'totalQty', label: 'Total Qty' },
          { key: 'totalAmount', label: 'Total Amount' },
        ]
      case 'item-wise':
        return [
          { key: 'sl', label: 'Sl' },
          { key: 'itemName', label: 'Item Name' },
          { key: 'modelNo', label: 'Model No' },
          { key: 'uom', label: 'UoM' },
          { key: 'purchaseCount', label: 'Times Purchased' },
          { key: 'qty', label: 'Total Qty' },
          { key: 'totalAmount', label: 'Total Amount' },
        ]
      case 'category-wise':
        return [
          { key: 'sl', label: 'Sl' },
          { key: 'category', label: 'Category' },
          { key: 'itemCount', label: 'Item Count' },
          { key: 'qty', label: 'Total Qty' },
          { key: 'totalAmount', label: 'Total Amount' },
        ]
      case 'sub-category-wise':
        return [
          { key: 'sl', label: 'Sl' },
          { key: 'category', label: 'Category' },
          { key: 'subCategory', label: 'Sub-Category' },
          { key: 'itemCount', label: 'Item Count' },
          { key: 'qty', label: 'Total Qty' },
          { key: 'totalAmount', label: 'Total Amount' },
        ]
      default:
        return []
    }
  }

  // Prepare export rows (format dates for export)
  const getExportRows = () => {
    return filtered.map((r: any) => {
      const out: any = { ...r }
      if (r.purchaseDate) out.purchaseDate = new Date(r.purchaseDate).toLocaleDateString()
      if (r.unitPrice) out.unitPrice = r.unitPrice.toFixed(2)
      if (r.total) out.total = r.total.toFixed(2)
      if (r.totalAmount) out.totalAmount = r.totalAmount.toFixed(2)
      return out
    })
  }

  const exportTitle = `Purchase_Report_${reportType}_${rangeLabel.replace(/\s+/g, '_')}`

  return (
    <div>
      <PageHeader title="Purchase Report" description="Comprehensive purchase reports with date filtering and multiple grouping options" />

      {/* Report Header (like the screenshot) */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs text-muted-foreground">{entityName}</div>
              <h2 className="text-lg font-bold">
                Purchase Report — {REPORT_TYPES.find(rt => rt.value === reportType)?.label}
              </h2>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              <div>Range: <span className="font-medium text-foreground">{rangeLabel}</span></div>
              <div>User: <span className="font-medium text-foreground">{user?.employee?.name || user?.userId || '—'}</span></div>
            </div>
          </div>

          {/* Date Range Panel with ComboBox selectors */}
          <div className="border-t pt-3">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold">Date Range:</span>
              </div>
              {/* Range type selector (ComboBox) */}
              <div className="w-36">
                <ComboBox
                  value={range}
                  onChange={(v) => setRange(v as Range)}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                  placeholder="Select range"
                />
              </div>
            </div>

            {/* Range-specific selectors */}
            {range === 'daily' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold w-16">Day:</span>
                <div className="w-56">
                  <ComboBox
                    value={selectedDay}
                    onChange={setSelectedDay}
                    options={getDayOptions()}
                    placeholder="Select day"
                  />
                </div>
              </div>
            )}

            {range === 'monthly' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold w-16">From:</span>
                <div className="w-48">
                  <ComboBox
                    value={fromMonth}
                    onChange={setFromMonth}
                    options={getMonthOptions()}
                    placeholder="From month"
                  />
                </div>
                <span className="text-xs font-semibold ml-2">To:</span>
                <div className="w-48">
                  <ComboBox
                    value={toMonth}
                    onChange={setToMonth}
                    options={getMonthOptions()}
                    placeholder="To month"
                  />
                </div>
              </div>
            )}

            {range === 'yearly' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold w-16">From:</span>
                <div className="w-32">
                  <ComboBox
                    value={fromYear}
                    onChange={setFromYear}
                    options={getYearOptions()}
                    placeholder="From year"
                  />
                </div>
                <span className="text-xs font-semibold ml-2">To:</span>
                <div className="w-32">
                  <ComboBox
                    value={toYear}
                    onChange={setToYear}
                    options={getYearOptions()}
                    placeholder="To year"
                  />
                </div>
              </div>
            )}

            {range === 'custom' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold w-16">From:</span>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-40 text-xs"
                />
                <span className="text-xs font-semibold ml-2">To:</span>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-40 text-xs"
                />
              </div>
            )}

            <Button size="sm" onClick={load} disabled={loading} className="gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Generate Report
            </Button>
          </div>

          {/* Report Type Selector (ComboBox) */}
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold">Report Type:</span>
              </div>
              <div className="w-64">
                <ComboBox
                  value={reportType}
                  onChange={(v) => setReportType(v as ReportType)}
                  options={REPORT_TYPES.map(rt => ({ value: rt.value, label: rt.label, sublabel: rt.desc }))}
                  placeholder="Select report type"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold">{rows.length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Amount</div>
            <div className="text-2xl font-bold text-blue-600">৳{(data.totalAmount || 0).toFixed(2)}</div>
          </CardContent></Card>
          {data.totalQty !== undefined && (
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total Qty</div>
              <div className="text-2xl font-bold text-emerald-600">{data.totalQty}</div>
            </CardContent></Card>
          )}
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Range</div>
            <div className="text-sm font-bold pt-1">{rangeLabel}</div>
          </CardContent></Card>
        </div>
      )}

      {/* Search + Export */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search report..." />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto flex items-center gap-2">
          {perm.canExcel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(exportTitle, getExportRows(), getExportColumns())}
              className="gap-1"
              disabled={filtered.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          )}
          {perm.canPdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToPDF(`Purchase Report — ${REPORT_TYPES.find(rt => rt.value === reportType)?.label} (${rangeLabel})`, getExportRows(), getExportColumns())}
              className="gap-1"
              disabled={filtered.length === 0}
            >
              <FileType className="h-4 w-4" /> PDF
            </Button>
          )}
        </div>
      </div>

      {/* Report Table — changes based on report type */}
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading report...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No data" hint="Try a different date range or report type" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    {reportType === 'details' && (
                      <>
                        <TableHead className="w-12">Sl</TableHead>
                        <TableHead>Purchase Date</TableHead>
                        <TableHead>Purchase ID</TableHead>
                        <TableHead>Purchase Receive ID</TableHead>
                        <TableHead>Purchase For</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Model No</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>UoM</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </>
                    )}
                    {reportType === 'summary' && (
                      <>
                        <TableHead className="w-12">Sl</TableHead>
                        <TableHead>PO No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Purchase For</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                    {reportType === 'supplier-wise' && (
                      <>
                        <TableHead className="w-12">Sl</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Purchases</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </>
                    )}
                    {reportType === 'purchase-for' && (
                      <>
                        <TableHead className="w-12">Sl</TableHead>
                        <TableHead>Entity (Purchase For)</TableHead>
                        <TableHead className="text-right">Purchases</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </>
                    )}
                    {reportType === 'item-wise' && (
                      <>
                        <TableHead className="w-12">Sl</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Model No</TableHead>
                        <TableHead>UoM</TableHead>
                        <TableHead className="text-right">Times Purchased</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </>
                    )}
                    {reportType === 'category-wise' && (
                      <>
                        <TableHead className="w-12">Sl</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Item Count</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </>
                    )}
                    {reportType === 'sub-category-wise' && (
                      <>
                        <TableHead className="w-12">Sl</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Sub-Category</TableHead>
                        <TableHead className="text-right">Item Count</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any, i: number) => (
                    <TableRow key={i}>
                      {reportType === 'details' && (
                        <>
                          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
                          <TableCell className="text-xs">{new Date(r.purchaseDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs font-mono">{r.purchaseId || r.purchaseNo}</TableCell>
                          <TableCell className="text-xs font-mono">{r.receiveNo || '— (not received)'}</TableCell>
                          <TableCell className="text-xs">{r.purchaseFor}</TableCell>
                          <TableCell className="text-xs">{r.supplier}</TableCell>
                          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
                          <TableCell className="text-xs font-mono">{r.modelNo}</TableCell>
                          <TableCell className="text-xs">{r.size}</TableCell>
                          <TableCell className="text-xs font-mono">{r.barcode || '—'}</TableCell>
                          <TableCell className="text-xs font-mono">{r.serialNumber}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{r.qty}</TableCell>
                          <TableCell className="text-xs">{r.uom}</TableCell>
                          <TableCell className="text-xs text-right">৳{r.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right font-medium">৳{r.total.toFixed(2)}</TableCell>
                        </>
                      )}
                      {reportType === 'summary' && (
                        <>
                          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
                          <TableCell className="text-xs font-mono">{r.purchaseNo}</TableCell>
                          <TableCell className="text-xs">{new Date(r.purchaseDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs">{r.purchaseFor}</TableCell>
                          <TableCell className="text-xs">{r.supplier}</TableCell>
                          <TableCell className="text-xs text-right">{r.itemCount}</TableCell>
                          <TableCell className="text-xs text-right">{r.totalQty}</TableCell>
                          <TableCell className="text-xs text-right font-medium">৳{r.totalAmount.toFixed(2)}</TableCell>
                          <TableCell><Badge status={r.status} /></TableCell>
                        </>
                      )}
                      {reportType === 'supplier-wise' && (
                        <>
                          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
                          <TableCell className="text-xs font-medium">{r.supplier}</TableCell>
                          <TableCell className="text-xs text-right">{r.purchaseCount}</TableCell>
                          <TableCell className="text-xs text-right">{r.totalQty}</TableCell>
                          <TableCell className="text-xs text-right font-medium">৳{r.totalAmount.toFixed(2)}</TableCell>
                        </>
                      )}
                      {reportType === 'purchase-for' && (
                        <>
                          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
                          <TableCell className="text-xs font-medium">{r.purchaseFor}</TableCell>
                          <TableCell className="text-xs text-right">{r.purchaseCount}</TableCell>
                          <TableCell className="text-xs text-right">{r.totalQty}</TableCell>
                          <TableCell className="text-xs text-right font-medium">৳{r.totalAmount.toFixed(2)}</TableCell>
                        </>
                      )}
                      {reportType === 'item-wise' && (
                        <>
                          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
                          <TableCell className="text-xs font-medium">{r.itemName}</TableCell>
                          <TableCell className="text-xs font-mono">{r.modelNo}</TableCell>
                          <TableCell className="text-xs">{r.uom}</TableCell>
                          <TableCell className="text-xs text-right">{r.purchaseCount}</TableCell>
                          <TableCell className="text-xs text-right">{r.qty}</TableCell>
                          <TableCell className="text-xs text-right font-medium">৳{r.totalAmount.toFixed(2)}</TableCell>
                        </>
                      )}
                      {reportType === 'category-wise' && (
                        <>
                          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
                          <TableCell className="text-xs font-medium">{r.category}</TableCell>
                          <TableCell className="text-xs text-right">{r.itemCount}</TableCell>
                          <TableCell className="text-xs text-right">{r.qty}</TableCell>
                          <TableCell className="text-xs text-right font-medium">৳{r.totalAmount.toFixed(2)}</TableCell>
                        </>
                      )}
                      {reportType === 'sub-category-wise' && (
                        <>
                          <TableCell className="text-xs text-muted-foreground">{r.sl}</TableCell>
                          <TableCell className="text-xs">{r.category}</TableCell>
                          <TableCell className="text-xs font-medium">{r.subCategory}</TableCell>
                          <TableCell className="text-xs text-right">{r.itemCount}</TableCell>
                          <TableCell className="text-xs text-right">{r.qty}</TableCell>
                          <TableCell className="text-xs text-right font-medium">৳{r.totalAmount.toFixed(2)}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  {filtered.length > 0 && (
                    <TableRow className="bg-slate-100 font-bold">
                      {reportType === 'details' && (
                        <>
                          <TableCell colSpan={11} className="text-right text-xs">Total:</TableCell>
                          <TableCell className="text-xs text-right">{data.totalQty}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                          <TableCell className="text-xs text-right">৳{(data.totalAmount || 0).toFixed(2)}</TableCell>
                        </>
                      )}
                      {reportType === 'summary' && (
                        <>
                          <TableCell colSpan={6} className="text-right text-xs">Total:</TableCell>
                          <TableCell className="text-xs text-right">{filtered.reduce((s: number, r: any) => s + r.totalQty, 0)}</TableCell>
                          <TableCell className="text-xs text-right">৳{(data.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell></TableCell>
                        </>
                      )}
                      {(reportType === 'supplier-wise' || reportType === 'purchase-for') && (
                        <>
                          <TableCell colSpan={2} className="text-right text-xs">Total:</TableCell>
                          <TableCell className="text-xs text-right">{filtered.reduce((s: number, r: any) => s + r.purchaseCount, 0)}</TableCell>
                          <TableCell className="text-xs text-right">{filtered.reduce((s: number, r: any) => s + r.totalQty, 0)}</TableCell>
                          <TableCell className="text-xs text-right">৳{(data.totalAmount || 0).toFixed(2)}</TableCell>
                        </>
                      )}
                      {reportType === 'item-wise' && (
                        <>
                          <TableCell colSpan={4} className="text-right text-xs">Total:</TableCell>
                          <TableCell className="text-xs text-right">{data.totalQty}</TableCell>
                          <TableCell className="text-xs text-right">৳{(data.totalAmount || 0).toFixed(2)}</TableCell>
                        </>
                      )}
                      {(reportType === 'category-wise' || reportType === 'sub-category-wise') && (
                        <>
                          <TableCell colSpan={3} className="text-right text-xs">Total:</TableCell>
                          <TableCell className="text-xs text-right">{filtered.reduce((s: number, r: any) => s + r.qty, 0)}</TableCell>
                          <TableCell className="text-xs text-right">৳{(data.totalAmount || 0).toFixed(2)}</TableCell>
                        </>
                      )}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
