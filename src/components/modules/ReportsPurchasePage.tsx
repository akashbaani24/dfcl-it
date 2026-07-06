'use client'
import { useEffect, useState, useMemo } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { report } from '@/lib/api'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

export function ReportsPurchasePage() {
  const perm = usePerm('reports-purchase')
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!perm.canView) return
    report('purchase-summary').then((r) => {
      setRows(r)
      setTotal(r.reduce((s: number, x: any) => s + (x.total || 0), 0))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [perm.canView])

  const filtered = useMemo(() => {
    if (!q) return rows
    const ql = q.toLowerCase()
    return rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql))
  }, [q, rows])

  if (!perm.canView) return <EmptyState title="Access denied" hint="You don't have permission to view this report" />

  const exportRows = rows.map((r) => ({
    purchaseNo: r.purchaseNo,
    date: new Date(r.date).toLocaleDateString(),
    entity: r.entity?.name,
    supplier: r.supplier?.name,
    items: r.itemCount,
    status: r.status,
    total: r.total,
  }))
  const exportColumns = [
    { key: 'purchaseNo', label: 'PO No' },
    { key: 'date', label: 'Date' },
    { key: 'entity', label: 'Entity' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'items', label: 'Items' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total' },
  ]

  return (
    <div>
      <PageHeader title="Purchase Report" description="All purchases with totals" />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search purchases..." />
        <ExportButtons module="reports-purchase" title="Purchase Report" rows={exportRows} columns={exportColumns} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Purchases</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Amount</div><div className="text-2xl font-bold">৳{total.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-bold text-amber-600">{rows.filter((r) => r.status === 'PENDING').length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Received</div><div className="text-2xl font-bold text-emerald-600">{rows.filter((r) => r.status === 'RECEIVED').length}</div></CardContent></Card>
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No purchases" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{r.purchaseNo}</TableCell>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.entity?.name}</TableCell>
                    <TableCell>{r.supplier?.name}</TableCell>
                    <TableCell>{r.itemCount}</TableCell>
                    <TableCell><Badge status={r.status} /></TableCell>
                    <TableCell className="text-right">৳{r.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
