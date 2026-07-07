'use client'
// Shared report component used by all report pages (Purchase, Sales, Stock,
// Accounts, Serial). Provides:
//   - Date range panel with ComboBox selectors (daily/monthly/yearly/custom)
//   - Report type ComboBox
//   - Summary stats cards
//   - Excel + PDF export buttons
//   - Table with columns defined by the parent page
//
// Usage:
//   <ReportShell
//     title="Purchase Report"
//     permModule="reports-purchase"
//     reportTypes={[{ value: 'summary', label: 'Summary' }, ...]}
//     apiType="purchase-report"
//     columns={...}  // function (reportType) => column defs
//     renderRow={...}  // function (row, reportType) => JSX
//     stats={...}  // function (data) => [{ label, value, color }]
//     exportColumns={...}  // function (reportType) => [{ key, label }]
//   />
import { useEffect, useState, useMemo, useCallback } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ComboBox } from '@/components/ui/combobox'
import { report } from '@/lib/api'
import { usePerm } from '@/components/shared/Perms'
import { exportToCSV, exportToPDF } from '@/lib/export'
import { SearchInput } from '@/components/shared/SearchInput'
import { useAuth } from '@/lib/auth-store'
import { Calendar, FileText, Loader2, FileSpreadsheet, FileType } from 'lucide-react'

export type ReportTypeOption = { value: string; label: string; sublabel?: string }
export type Col = { key: string; label: string; className?: string; align?: 'left' | 'right' | 'center' }
export type StatCard = { label: string; value: string; color?: string }

type Range = 'daily' | 'monthly' | 'yearly' | 'custom'

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

function getYearOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()
  for (let i = -1; i < 5; i++) {
    const y = now.getFullYear() - i
    options.push({ value: String(y), label: String(y) })
  }
  return options
}

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

export function ReportShell({
  title,
  description,
  permModule,
  reportTypes,
  apiType,
  defaultReportType,
  showDatePanel = true,
  columns,
  renderRow,
  renderTotalRow,
  stats,
  exportColumns,
  entityName: customEntityName,
}: {
  title: string
  description?: string
  permModule: string
  reportTypes: ReportTypeOption[]
  apiType: string
  defaultReportType?: string
  showDatePanel?: boolean
  columns: (reportType: string) => Col[]
  renderRow: (row: any, reportType: string, idx: number) => React.ReactNode
  renderTotalRow?: (rows: any[], data: any, reportType: string) => React.ReactNode
  stats?: (data: any, rows: any[]) => StatCard[]
  exportColumns: (reportType: string) => Array<{ key: string; label: string }>
  entityName?: string
}) {
  const perm = usePerm(permModule)
  const { user } = useAuth()

  const [reportType, setReportType] = useState(defaultReportType || reportTypes[0]?.value || '')
  const [range, setRange] = useState<Range>('monthly')

  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [fromMonth, setFromMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [toMonth, setToMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [fromYear, setFromYear] = useState(() => String(new Date().getFullYear()))
  const [toYear, setToYear] = useState(() => String(new Date().getFullYear()))
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const buildParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = { type: apiType, reportType, range }
    if (showDatePanel) {
      if (range === 'daily') {
        params.from = selectedDay
        params.to = selectedDay
      } else if (range === 'monthly') {
        const [fy, fm] = fromMonth.split('-').map(Number)
        const [ty, tm] = toMonth.split('-').map(Number)
        params.from = new Date(fy, fm - 1, 1).toISOString().slice(0, 10)
        params.to = new Date(ty, tm, 0).toISOString().slice(0, 10)
      } else if (range === 'yearly') {
        params.from = `${fromYear}-01-01`
        params.to = `${toYear}-12-31`
      } else if (range === 'custom') {
        params.from = from
        params.to = to
      }
    }
    return params
  }, [apiType, reportType, range, selectedDay, fromMonth, toMonth, fromYear, toYear, from, to, showDatePanel])

  const load = useCallback(async () => {
    if (!perm.canView) return
    setLoading(true)
    try {
      const r = await report(apiType, buildParams())
      setData(r)
    } catch (e: any) {
      console.error('Report load error:', e)
    } finally {
      setLoading(false)
    }
  }, [perm.canView, apiType, buildParams])

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

  const rangeLabel = (() => {
    if (!showDatePanel) return 'All Time'
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

  const entityName = customEntityName || user?.employee?.name ? `${user.employee?.name}'s Entity` : 'Head Office'
  const cols = columns(reportType)
  const statCards = stats ? (stats(data, rows) || []) : []

  const getExportRows = () => {
    return filtered.map((r: any) => {
      const out: any = { ...r }
      // Format dates and amounts for export
      for (const key of Object.keys(out)) {
        if (out[key] instanceof Date) {
          out[key] = out[key].toLocaleDateString()
        } else if (typeof out[key] === 'number' && key.toLowerCase().includes('amount')) {
          out[key] = out[key].toFixed(2)
        }
      }
      if (r.date) out.date = new Date(r.date).toLocaleDateString()
      if (r.purchaseDate) out.purchaseDate = new Date(r.purchaseDate).toLocaleDateString()
      if (r.salesDate) out.salesDate = new Date(r.salesDate).toLocaleDateString()
      if (r.createdAt) out.createdAt = new Date(r.createdAt).toLocaleDateString()
      return out
    })
  }

  const exportTitle = `${title.replace(/\s+/g, '_')}_${reportType}_${rangeLabel.replace(/\s+/g, '_')}`

  return (
    <div>
      <PageHeader title={title} description={description} />

      {/* Report Header */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs text-muted-foreground">{entityName}</div>
              <h2 className="text-lg font-bold">
                {title} — {reportTypes.find(rt => rt.value === reportType)?.label}
              </h2>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              <div>Range: <span className="font-medium text-foreground">{rangeLabel}</span></div>
              <div>User: <span className="font-medium text-foreground">{user?.employee?.name || user?.userId || '—'}</span></div>
            </div>
          </div>

          {/* Date Range Panel */}
          {showDatePanel && (
            <div className="border-t pt-3">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold">Date Range:</span>
                </div>
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

              {range === 'daily' && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold w-16">Day:</span>
                  <div className="w-56">
                    <ComboBox value={selectedDay} onChange={setSelectedDay} options={getDayOptions()} placeholder="Select day" />
                  </div>
                </div>
              )}

              {range === 'monthly' && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold w-16">From:</span>
                  <div className="w-48">
                    <ComboBox value={fromMonth} onChange={setFromMonth} options={getMonthOptions()} placeholder="From month" />
                  </div>
                  <span className="text-xs font-semibold ml-2">To:</span>
                  <div className="w-48">
                    <ComboBox value={toMonth} onChange={setToMonth} options={getMonthOptions()} placeholder="To month" />
                  </div>
                </div>
              )}

              {range === 'yearly' && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold w-16">From:</span>
                  <div className="w-32">
                    <ComboBox value={fromYear} onChange={setFromYear} options={getYearOptions()} placeholder="From year" />
                  </div>
                  <span className="text-xs font-semibold ml-2">To:</span>
                  <div className="w-32">
                    <ComboBox value={toYear} onChange={setToYear} options={getYearOptions()} placeholder="To year" />
                  </div>
                </div>
              )}

              {range === 'custom' && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold w-16">From:</span>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40 text-xs" />
                  <span className="text-xs font-semibold ml-2">To:</span>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40 text-xs" />
                </div>
              )}

              <Button size="sm" onClick={load} disabled={loading} className="gap-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                Generate Report
              </Button>
            </div>
          )}

          {/* Report Type Selector */}
          <div className={`border-t pt-3 ${showDatePanel ? 'mt-3' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold">Report Type:</span>
              </div>
              <div className="w-64">
                <ComboBox
                  value={reportType}
                  onChange={(v) => setReportType(v)}
                  options={reportTypes}
                  placeholder="Select report type"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {!loading && data && statCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {statCards.map((s, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color || ''}`}>{s.value}</div>
            </CardContent></Card>
          ))}
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
              onClick={() => exportToCSV(exportTitle, getExportRows(), exportColumns(reportType))}
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
              onClick={() => exportToPDF(`${title} — ${reportTypes.find(rt => rt.value === reportType)?.label} (${rangeLabel})`, getExportRows(), exportColumns(reportType))}
              className="gap-1"
              disabled={filtered.length === 0}
            >
              <FileType className="h-4 w-4" /> PDF
            </Button>
          )}
        </div>
      </div>

      {/* Report Table */}
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
                    {cols.map((c) => (
                      <TableHead key={c.key} className={c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}>
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any, i: number) => (
                    <TableRow key={i}>
                      {renderRow(r, reportType, i)}
                    </TableRow>
                  ))}
                  {renderTotalRow && (
                    <TableRow className="bg-slate-100 font-bold">
                      {renderTotalRow(filtered, data, reportType)}
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
