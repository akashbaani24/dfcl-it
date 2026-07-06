'use client'
import { useEffect, useState } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { report } from '@/lib/api'
import { Barcode, ScanLine } from 'lucide-react'

export function ReportsStockPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    report('stock-summary').then((r) => setRows(r)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Stock Report" description="Stock balance across all entities" />
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
