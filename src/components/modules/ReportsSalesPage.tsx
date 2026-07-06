'use client'
import { useEffect, useState } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { report } from '@/lib/api'

export function ReportsSalesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [paid, setPaid] = useState(0)

  useEffect(() => {
    report('sales-summary').then((r) => {
      setRows(r)
      setTotal(r.reduce((s: number, x: any) => s + (x.total || 0), 0))
      setPaid(r.reduce((s: number, x: any) => s + (x.paid || 0), 0))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Sales Report" description="All sales orders with totals & payment status" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Sales</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Value</div><div className="text-2xl font-bold">৳{total.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Received</div><div className="text-2xl font-bold text-emerald-600">৳{paid.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending Delivery</div><div className="text-2xl font-bold text-amber-600">{rows.filter((r) => r.deliveryStatus === 'PENDING').length}</div></CardContent></Card>
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : rows.length === 0 ? (
        <EmptyState title="No sales" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{r.salesNo}</TableCell>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.entity?.name}</TableCell>
                    <TableCell>{r.customer}</TableCell>
                    <TableCell>{r.itemCount}</TableCell>
                    <TableCell><Badge status={r.status} /></TableCell>
                    <TableCell className="text-right">৳{r.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">৳{r.paid.toFixed(2)}</TableCell>
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
