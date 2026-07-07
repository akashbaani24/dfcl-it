'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { list, action, getOne } from '@/lib/api'
import { toast } from 'sonner'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { Eye, PackageCheck, ArrowLeftRight, Printer, X } from 'lucide-react'

export function InternalReceivePage() {
  const perm = usePerm('internal-receive')
  const { setActive } = useApp()
  const [receives, setReceives] = useState<any[]>([])
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])

  // View dialog
  const [viewing, setViewing] = useState<any>(null)
  // Receive challan (full-screen printable)
  const [challan, setChallan] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, t] = await Promise.all([
        list('internal-receives') as Promise<any[]>,
        list('internal-transfers', { status: 'PENDING' }) as Promise<any[]>,
      ])
      setReceives(r)
      setPendingTransfers(t)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!q) { setFiltered(receives); return }
    const ql = q.toLowerCase()
    setFiltered(receives.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, receives])

  // Open the full-page receive entry form for a transfer
  const openReceiveForm = (transfer: any) => {
    sessionStorage.setItem('receivingTransferId', transfer.id)
    setActive('internal-receive-entry')
  }

  // Auto-open challan after creating a receive (set by the entry page)
  useEffect(() => {
    load()
    const challanId = sessionStorage.getItem('showChallanForReceive')
    if (challanId) {
      sessionStorage.removeItem('showChallanForReceive')
      getOne('internal-receives', challanId).then((r: any) => {
        setChallan(r)
      }).catch(() => {})
    }
  }, [load])

  // Open challan from the view dialog
  const openChallan = async (row: any) => {
    try {
      const full = await getOne('internal-receives', row.id) as any
      setChallan(full)
    } catch {
      setChallan(row)
    }
  }

  return (
    <div>
      <PageHeader
        title="Internal Receive"
        description="Confirm receipt of internal transfers. Item serials and stock are moved from the source entity to the receiving entity on confirm."
      />

      {/* Pending transfers awaiting receive */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Pending Transfers Awaiting Receive
            <span className="ml-1 text-xs font-normal text-muted-foreground">({pendingTransfers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingTransfers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No pending transfers awaiting receive</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer No</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTransfers.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-sm">{t.transferNo}</TableCell>
                      <TableCell>{t.fromEntity?.name}</TableCell>
                      <TableCell>{t.toEntity?.name}</TableCell>
                      <TableCell>{new Date(t.transferDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {perm.canCreate && (
                          <Button size="sm" variant="default" className="gap-1" onClick={() => openReceiveForm(t)}>
                            <PackageCheck className="h-3.5 w-3.5" /> Receive
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All receives */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search receives..." />
        <ExportButtons
          module="internal-receive"
          title="Internal Receives"
          rows={receives.map((r) => ({
            receiveNo: r.receiveNo,
            transferNo: r.transfer?.transferNo,
            entity: r.entity?.name,
            date: r.receiveDate ? new Date(r.receiveDate).toLocaleDateString() : '',
            status: r.status,
            items: r.items?.length || 0,
          }))}
          columns={[
            { key: 'receiveNo', label: 'Receive No' },
            { key: 'transferNo', label: 'Transfer No' },
            { key: 'entity', label: 'Entity' },
            { key: 'date', label: 'Date' },
            { key: 'status', label: 'Status' },
            { key: 'items', label: 'Items' },
          ]}
        />
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No internal receives yet" hint="Receive stock from a pending transfer above" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receive No</TableHead>
                    <TableHead>Transfer No</TableHead>
                    <TableHead>From Entity</TableHead>
                    <TableHead>To Entity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.receiveNo}</TableCell>
                      <TableCell className="font-mono text-sm">{r.transfer?.transferNo || '—'}</TableCell>
                      <TableCell>{r.transfer?.fromEntity?.name || '—'}</TableCell>
                      <TableCell>{r.transfer?.toEntity?.name || r.entity?.name}</TableCell>
                      <TableCell>{new Date(r.receiveDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge status={r.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View receive detail */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive {viewing?.receiveNo}</DialogTitle>
            <DialogDescription>Status: {viewing?.status}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Transfer:</span> {viewing?.transfer?.transferNo}</div>
            <div><span className="text-muted-foreground">Receiving Entity:</span> {viewing?.entity?.name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.receiveDate && new Date(viewing.receiveDate).toLocaleDateString()}</div>
          </div>
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Barcodes</TableHead>
                  <TableHead>Serials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.items?.length > 0 ? (
                  viewing.items.map((it: any, idx: number) => {
                    // Parse the 'barcode|serial,barcode|serial' format from the transfer's serials field
                    const units = (it.serials || '').split(',').map((u: string) => {
                      const parts = u.split('|')
                      return { barcode: parts[0] || '', serial: parts[1] || '' }
                    }).filter((u: any) => u.barcode || u.serial)
                    const barcodes = units.map((u: any) => u.barcode).filter(Boolean)
                    const serials = units.map((u: any) => u.serial).filter(Boolean)
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{it.item?.name || '—'}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                        </TableCell>
                        <TableCell className="font-medium">{it.quantity}</TableCell>
                        <TableCell>
                          {barcodes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {barcodes.map((bc: string, i: number) => (
                                <span key={i} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{bc}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {serials.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {serials.map((sn: string, i: number) => (
                                <span key={i} className="text-[10px] font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">{sn}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No items</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <Button variant="outline" onClick={() => openChallan(viewing)} className="gap-1">
              <Printer className="h-4 w-4" /> Print Challan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Printable Receive Challan */}
      {challan && (
        <ReceiveChallan receive={challan} onClose={() => setChallan(null)} />
      )}
    </div>
  )
}

/**
 * Printable Receive Challan — shows the received items with barcode + serial
 * in separate columns. Same layout as the transfer challan.
 */
function ReceiveChallan({ receive, onClose }: { receive: any; onClose: () => void }) {
  const parseUnits = (serials: string | null | undefined): Array<{ barcode: string; serial: string }> => {
    if (!serials) return []
    return serials.split(',').map((unit: string) => {
      const parts = unit.split('|')
      return { barcode: parts[0] || '', serial: parts[1] || '' }
    }).filter((u) => u.barcode || u.serial)
  }

  const allRows: Array<{ sl: number; itemName: string; itemCode: string; barcode: string; serial: string; qty: number; uom: string }> = []
  let sl = 1
  for (const it of (receive.items || [])) {
    const units = parseUnits(it.serials)
    const uom = it.item?.uom?.shortCode || ''
    const itemName = it.item?.name || '—'
    const itemCode = it.item?.itemCode || ''
    if (units.length > 0) {
      for (const u of units) {
        allRows.push({ sl: sl++, itemName, itemCode, barcode: u.barcode, serial: u.serial, qty: 1, uom })
      }
    } else {
      allRows.push({ sl: sl++, itemName, itemCode, barcode: '—', serial: '—', qty: it.quantity, uom })
    }
  }
  const totalQty = allRows.reduce((s, r) => s + r.qty, 0)
  const receiveDate = receive.receiveDate ? new Date(receive.receiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto print:relative print:overflow-visible">
      <div className="sticky top-0 bg-white border-b px-4 py-2 flex items-center justify-between print:hidden">
        <h2 className="text-sm font-semibold">Receive Challan — {receive.receiveNo}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-8 max-w-[800px] mx-auto print:p-0 print:max-w-none">
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-2xl font-bold">{receive.entity?.name || receive.transfer?.toEntity?.name || '—'}</h1>
          <h2 className="text-lg font-semibold mt-1">Stock Receive Challan</h2>
          <div className="flex justify-between text-sm mt-2">
            <span><b>Receive No:</b> {receive.receiveNo}</span>
            <span><b>Date:</b> {receiveDate}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border rounded p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">From (Source Entity)</div>
            <div className="text-base font-medium mt-1">{receive.transfer?.fromEntity?.name || '—'}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">To (Receiving Entity)</div>
            <div className="text-base font-medium mt-1">{receive.entity?.name || receive.transfer?.toEntity?.name || '—'}</div>
          </div>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1.5 text-left w-10">Sl</th>
              <th className="border border-black px-2 py-1.5 text-left">Item Name</th>
              <th className="border border-black px-2 py-1.5 text-left w-24">Item Code</th>
              <th className="border border-black px-2 py-1.5 text-left w-36">Barcode</th>
              <th className="border border-black px-2 py-1.5 text-left w-32">Serial No</th>
              <th className="border border-black px-2 py-1.5 text-center w-12">Qty</th>
              <th className="border border-black px-2 py-1.5 text-center w-12">UoM</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((r, i) => (
              <tr key={i}>
                <td className="border border-black px-2 py-1 text-center text-xs">{r.sl}</td>
                <td className="border border-black px-2 py-1 font-medium">{r.itemName}</td>
                <td className="border border-black px-2 py-1 font-mono text-xs">{r.itemCode}</td>
                <td className="border border-black px-2 py-1 font-mono text-xs">{r.barcode}</td>
                <td className="border border-black px-2 py-1 font-mono text-xs">{r.serial}</td>
                <td className="border border-black px-2 py-1 text-center font-medium">{r.qty}</td>
                <td className="border border-black px-2 py-1 text-center text-xs">{r.uom}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={5} className="border border-black px-2 py-1.5 text-right">Total Quantity:</td>
              <td className="border border-black px-2 py-1.5 text-center">{totalQty}</td>
              <td className="border border-black px-2 py-1.5"></td>
            </tr>
          </tbody>
        </table>
        {receive.notes && (
          <div className="mt-4 border rounded p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Notes</div>
            <div className="text-sm mt-1">{receive.notes}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 mt-12">
          <div className="text-center">
            <div className="border-t border-black pt-1 mx-8">
              <div className="text-xs font-medium">Received By</div>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-1 mx-8">
              <div className="text-xs font-medium">Authorized Signature</div>
            </div>
          </div>
        </div>
        <div className="text-center text-[10px] text-muted-foreground mt-6 border-t pt-2">
          System-generated challan from DFCL-IT Inventory System · Generated on {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  )
}
