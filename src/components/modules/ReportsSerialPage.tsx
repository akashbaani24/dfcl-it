'use client'
import { useEffect, useState } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { report } from '@/lib/api'
import { ScanLine } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ReportsSerialPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    report('serial-status').then((r) => setRows(r)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false
    if (q) {
      const ql = q.toLowerCase()
      return r.serialNumber?.toLowerCase().includes(ql) || r.item?.name?.toLowerCase().includes(ql) || r.item?.barcode?.toLowerCase().includes(ql)
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title="Serial Status Report"
        description="Live status of every serial number — In Stock, Sold, Returned, Damaged"
      />
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Search</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Serial / Item / Barcode" className="w-64 mt-1" />
        </div>
        <div>
          <Label className="text-xs">Status Filter</Label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="SOLD">Sold</option>
            <option value="RETURNED">Returned</option>
            <option value="DAMAGED">Damaged</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Serials</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">In Stock</div><div className="text-2xl font-bold text-emerald-600">{rows.filter((r) => r.status === 'IN_STOCK').length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sold</div><div className="text-2xl font-bold text-rose-600">{rows.filter((r) => r.status === 'SOLD').length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Returned/Damaged</div><div className="text-2xl font-bold text-amber-600">{rows.filter((r) => r.status === 'RETURNED' || r.status === 'DAMAGED').length}</div></CardContent></Card>
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No serials found" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Currently At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs flex items-center gap-1"><ScanLine className="h-3 w-3" />{s.serialNumber}</TableCell>
                      <TableCell>{s.item?.name}</TableCell>
                      <TableCell>{s.item?.category?.name}</TableCell>
                      <TableCell>{s.entity?.name}</TableCell>
                      <TableCell><Badge status={s.status} /></TableCell>
                      <TableCell>{new Date(s.updatedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
