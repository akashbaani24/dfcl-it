'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { report } from '@/lib/api'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Calendar, FileText, TrendingUp, Package, Users, Building2, Tags, FolderTree, Loader2 } from 'lucide-react'

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

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
]

export function ReportsPurchasePage() {
  const perm = usePerm('reports-purchase')
  const { currentEntityId, selectedEntityId } = useApp()
  const { user } = useAuth()

  const [reportType, setReportType] = useState<ReportType>('details')
  const [range, setRange] = useState<Range>('monthly')
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    if (!perm.canView) return
    setLoading(true)
    try {
      const params: Record<string, string> = {
        type: 'purchase-report',
        reportType,
        range,
      }
      if (range === 'custom') {
        params.from = from
        params.to = to
      }
      const r = await report('purchase-report', params)
      setData(r)
    } catch (e: any) {
      console.error('Report load error:', e)
    } finally {
      setLoading(false)
    }
  }, [perm.canView, reportType, range, from, to])

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
    if (range === 'daily') return 'Today'
    if (range === 'monthly') return 'This Month'
    if (range === 'yearly') return 'This Year'
    if (range === 'custom') return `${from} to ${to}`
    return ''
  })()

  // Get current entity name
  const entityName = user?.employee?.name ? `${user.employee.name}'s Entity` : 'Head Office'

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

          {/* Date Range Panel */}
          <div className="border-t pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold">Date Range:</span>
              </div>
              <div className="flex gap-1">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRange(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      range === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {range === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-8 w-36 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-8 w-36 text-xs"
                  />
                  <Button size="sm" onClick={load} className="h-8">Apply</Button>
                </div>
              )}
            </div>
          </div>

          {/* Report Type Selector */}
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold">Report Type:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {REPORT_TYPES.map((rt) => {
                const Icon = rt.icon
                return (
                  <button
                    key={rt.value}
                    onClick={() => setReportType(rt.value)}
                    title={rt.desc}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md border transition-colors text-center ${
                      reportType === rt.value
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-muted-foreground hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium leading-tight">{rt.label}</span>
                  </button>
                )
              })}
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
                          <TableCell colSpan={9} className="text-right text-xs">Total:</TableCell>
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
