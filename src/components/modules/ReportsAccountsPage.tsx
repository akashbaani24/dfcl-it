'use client'
import { useEffect, useState } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { report } from '@/lib/api'

export function ReportsAccountsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    report('accounts-summary').then((r) => setData(r)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
  if (!data) return <EmptyState title="No data" />

  return (
    <div>
      <PageHeader title="Accounts Report" description="Daily expenses & receive summary" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Expense</div><div className="text-2xl font-bold text-rose-600">৳{data.totalExpense.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Receive</div><div className="text-2xl font-bold text-emerald-600">৳{data.totalReceive.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net</div><div className={`text-2xl font-bold ${data.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>৳{data.net.toFixed(2)}</div></CardContent></Card>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">By Category</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Receive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data.byCategory).map(([cat, v]: any) => (
                <TableRow key={cat}>
                  <TableCell className="font-medium">{cat}</TableCell>
                  <TableCell className="text-right text-rose-600">৳{v.expense.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-emerald-600">৳{v.receive.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b text-sm font-semibold">All Entries</div>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Entry No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries?.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.entryNo}</TableCell>
                    <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                    <TableCell>{e.entity?.name}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded ${e.type === 'EXPENSE' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>{e.type}</span>
                    </TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell>{e.method}</TableCell>
                    <TableCell className="text-right font-medium">৳{e.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
