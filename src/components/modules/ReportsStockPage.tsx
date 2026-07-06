'use client'
import { useEffect, useState } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { report } from '@/lib/api'
import { Barcode, ScanLine } from 'lucide-react'
import { usePerm, ExportButtons } from '@/components/shared/Perms'

export function ReportsStockPage() {
  const perm = usePerm('reports-stock')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!perm.canView) return
    report('stock-summary').then((r) => setRows(r)).catch(() => {}).finally(() => setLoading(false))
  }, [perm.canView])

  if (!perm.canView) return <EmptyState title="Access denied" hint="You don't have permission to view this report" />

  const exportRows = rows.map((r) => ({
    entity: r.entity?.name,
    itemCode: r.item?.itemCode,
    barcode: r.item?.barcode,
    name: r.item?.name,
    category: r.item?.category?.parent?.name ? r.item.category.parent.name + ' → ' + r.item.category.name : r.item?.category?.name,
    serialTracking: r.item?.hasSerial ? 'Yes' : 'No',
    balance: r.balance,
  }))
  const exportColumns = [
    { key: 'entity', label: 'Entity' },
    { key: 'itemCode', label: 'Item Code' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'name', label: 'Item Name' },
    { key: 'category', label: 'Category' },
    { key: 'serialTracking', label: 'Serial Tracking' },
    { key: 'balance', label: 'Balance' },
  ]

  return (
    <div>
      <PageHeader title="Stock Report" description="Stock balance across all entities" />
      <ExportButtons module="reports-stock" title="Stock Report" rows={exportRows} columns={exportColumns} />
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : rows.length === 0 ? (
        <EmptyState title="No stock data" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Serial Tracking</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.entity?.name} ({r.entity?.shortCode})</TableCell>
                      <TableCell className="font-mono text-xs">{r.item?.itemCode}</TableCell>
                      <TableCell className="font-mono text-xs"><Barcode className="h-3 w-3 inline mr-1" />{r.item?.barcode}</TableCell>
                      <TableCell>{r.item?.name}</TableCell>
                      <TableCell>{r.item?.category?.parent?.name ? r.item.category.parent.name + ' → ' : ''}{r.item?.category?.name}</TableCell>
                      <TableCell>{r.item?.hasSerial ? <span className="text-xs flex items-center gap-1 text-emerald-700"><ScanLine className="h-3 w-3" />Yes</span> : <span className="text-xs text-muted-foreground">Bulk</span>}</TableCell>
                      <TableCell className="text-right font-bold">{r.balance}</TableCell>
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
