'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { list, action, getOne } from '@/lib/api'
import { toast } from 'sonner'
import { Eye, CheckCircle2, Printer, X } from 'lucide-react'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'

export function InternalTransfersPage() {
  const perm = usePerm('internal-transfers')
  const { setActive } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)
  const [challan, setChallan] = useState<any>(null)
  // Receivers = users at the To Entity who can receive this transfer.
  // Fetched when viewing a PENDING transfer. Auto-refreshes every 10s so
  // newly-created users appear without manual refresh.
  const [receivers, setReceivers] = useState<any[]>([])
  const [receiversLoading, setReceiversLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    // Show only transfers where THIS entity is involved (either as source
    // or destination). Non-admin users see only their entity's transfers;
    // admins see all. This is the default OR filter (no toEntity/fromEntity
    // param).
    try { setRows(await list('internal-transfers') as any[]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    // After creating a transfer, the entry page stores its id in
    // sessionStorage so we can auto-open the challan here.
    const challanId = sessionStorage.getItem('showChallanForTransfer')
    if (challanId) {
      sessionStorage.removeItem('showChallanForTransfer')
      // Fetch full transfer and open challan
      getOne('internal-transfers', challanId).then((r: any) => {
        setChallan(r)
      }).catch(() => {})
    }
  }, [load])

  useEffect(() => {
    if (!q) { setFiltered(rows); return }
    const ql = q.toLowerCase()
    setFiltered(rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql)))
  }, [q, rows])

  const startNew = () => {
    setActive('internal-transfer-entry')
  }

  // Open challan for a transfer (fetches full detail with items + item relation)
  const openChallan = async (row: any) => {
    try {
      const full = await getOne('internal-transfers', row.id) as any
      setChallan(full)
    } catch {
      setChallan(row)  // fallback to list row
    }
  }

  // Fetch users at the To Entity who have receive rights (canCreate on
  // 'internal-receive' module). Called when viewing a PENDING transfer.
  // Also auto-refreshes every 10 seconds while the view dialog is open and
  // the transfer is still PENDING — so newly-created users appear without
  // manual refresh.
  const fetchReceivers = useCallback(async (toEntityId: string) => {
    setReceiversLoading(true)
    try {
      const res = await fetch(`/api/entity-receivers?entityId=${toEntityId}`)
      if (res.ok) {
        const data = await res.json()
        setReceivers(data)
      } else {
        setReceivers([])
      }
    } catch {
      setReceivers([])
    } finally {
      setReceiversLoading(false)
    }
  }, [])

  // When `viewing` changes, fetch receivers if the transfer is PENDING
  useEffect(() => {
    if (!viewing || viewing.status !== 'PENDING' || !viewing.toEntityId) {
      setReceivers([])
      return
    }
    fetchReceivers(viewing.toEntityId)
    // Auto-refresh every 10 seconds so newly-added users show up automatically
    const interval = setInterval(() => {
      fetchReceivers(viewing.toEntityId)
    }, 10000)
    return () => clearInterval(interval)
  }, [viewing, fetchReceivers])

  const receive = async (id: string) => {
    if (!confirm('Mark this transfer as received? Stock will be moved to destination entity.')) return
    try {
      await action('receive-transfer', id)
      toast.success('Transfer received. Stock moved.')
      load()
      setViewing(null)
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Internal Transfers"
        description="Move stock between entities. Source entity releases, destination receives."
        onAdd={perm.canCreate ? startNew : undefined}
        addLabel="New Transfer"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search transfers..." />
        <ExportButtons
          module="internal-transfers"
          title="Internal Transfers"
          rows={rows.map((r) => ({
            transferNo: r.transferNo,
            date: new Date(r.transferDate).toLocaleDateString(),
            from: r.fromEntity?.name,
            to: r.toEntity?.name,
            status: r.status,
          }))}
          columns={[
            { key: 'transferNo', label: 'Transfer No' },
            { key: 'date', label: 'Date' },
            { key: 'from', label: 'From' },
            { key: 'to', label: 'To' },
            { key: 'status', label: 'Status' },
          ]}
        />
      </div>
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No transfers" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer No</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.transferNo}</TableCell>
                    <TableCell>{r.fromEntity?.name}</TableCell>
                    <TableCell>{r.toEntity?.name}</TableCell>
                    <TableCell>{new Date(r.transferDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      {r.status === 'PENDING' && perm.canUpdate && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => receive(r.id)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer {viewing?.transferNo}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">From:</span> {viewing?.fromEntity?.name}</div>
            <div><span className="text-muted-foreground">To:</span> {viewing?.toEntity?.name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing?.transferDate && new Date(viewing.transferDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Status:</span> {viewing?.status}</div>
          </div>

          {/* Pending receivers section — shows which users at the To Entity
              have receive rights. Only shown for PENDING transfers. */}
          {viewing?.status === 'PENDING' && (
            <div className="mt-3 border rounded-md bg-amber-50/50 p-3">
              <div className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                Pending Receive — Awaiting action at {viewing?.toEntity?.name}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                The following users have receive rights at this entity and can accept this transfer:
              </div>
              {receiversLoading ? (
                <div className="text-xs text-muted-foreground animate-pulse">Loading receivers...</div>
              ) : receivers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {receivers.map((r: any) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1.5 text-xs bg-white border border-amber-200 px-2 py-1 rounded-md"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                      <span className="font-medium">{r.employeeName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">({r.userId})</span>
                      {r.role === 'ADMIN' && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">ADMIN</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
                  No User Available
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-2">
                {receivers.length > 0
                  ? 'This list auto-updates every 10 seconds. If a new user is granted receive rights, they will appear here automatically.'
                  : 'Assign a user to this entity with receive rights — they will appear here automatically within 10 seconds.'}
              </div>
            </div>
          )}
          <div className="border rounded-md mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Barcodes</TableHead>
                  <TableHead>Serial Numbers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.items?.length > 0 ? (
                  viewing.items.map((it: any, idx: number) => {
                    // Parse the "barcode|serial,barcode|serial" format
                    // into separate barcode and serial arrays
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
                          <div className="font-medium">{it.item?.name || '—'}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                        </TableCell>
                        <TableCell className="font-medium">{it.quantity}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{it.item?.uom?.shortCode || '—'}</TableCell>
                        <TableCell>
                          {barcodes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {barcodes.map((bc: string, i: number) => (
                                <span key={i} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {bc}
                                </span>
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
                                <span key={i} className="text-[10px] font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                  {sn}
                                </span>
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
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                      No items in this transfer
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => openChallan(viewing)} className="gap-1">
              <Printer className="h-4 w-4" /> Print Challan
            </Button>
            {viewing?.status === 'PENDING' && perm.canUpdate && (
              <Button onClick={() => receive(viewing.id)} className="gap-1">
                <CheckCircle2 className="h-4 w-4" /> Mark Received
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Challan — full-screen overlay */}
      {challan && (
        <TransferChallan transfer={challan} onClose={() => setChallan(null)} />
      )}
    </div>
  )
}

/**
 * Printable Transfer Challan — shows as a full-screen overlay with a
 * print-friendly layout. Includes:
 *   - Header: company name (from From Entity), challan title, transfer no, date
 *   - From / To entities
 *   - Table: Sl, Item Name, Item Code, Barcode, Serial Number, Qty, UoM
 *   - Footer: signature lines for sender and receiver
 *
 * The serials field stores units as "barcode|serial" comma-separated.
 * We parse this to display barcode and serial in separate columns.
 */
function TransferChallan({ transfer, onClose }: { transfer: any; onClose: () => void }) {
  // Parse the serials field for each item into an array of { barcode, serial }
  const parseUnits = (serials: string | null | undefined): Array<{ barcode: string; serial: string }> => {
    if (!serials) return []
    return serials.split(',').map((unit: string) => {
      const parts = unit.split('|')
      return {
        barcode: parts[0] || '',
        serial: parts[1] || '',
      }
    })
  }

  // Build a flat list of all units across all items for the challan table.
  // Each row = one unit (so barcodes/serials are listed individually).
  const allRows: Array<{
    sl: number
    itemName: string
    itemCode: string
    barcode: string
    serial: string
    qty: number
    uom: string
  }> = []
  let sl = 1
  for (const it of (transfer.items || [])) {
    const units = parseUnits(it.serials)
    const uom = it.item?.uom?.shortCode || ''
    const itemName = it.item?.name || '—'
    const itemCode = it.item?.itemCode || ''
    if (units.length > 0) {
      // One row per unit (each with its own barcode + serial)
      for (const u of units) {
        allRows.push({
          sl: sl++,
          itemName,
          itemCode,
          barcode: u.barcode,
          serial: u.serial,
          qty: 1,
          uom,
        })
      }
    } else {
      // No barcodes/serials — one row with the total qty
      allRows.push({
        sl: sl++,
        itemName,
        itemCode,
        barcode: '—',
        serial: '—',
        qty: it.quantity,
        uom,
      })
    }
  }

  const totalQty = allRows.reduce((s, r) => s + r.qty, 0)
  const transferDate = transfer.transferDate ? new Date(transfer.transferDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto print:relative print:overflow-visible">
      {/* Toolbar — hidden when printing */}
      <div className="sticky top-0 bg-white border-b px-4 py-2 flex items-center justify-between print:hidden">
        <h2 className="text-sm font-semibold">Transfer Challan — {transfer.transferNo}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Challan content — print-friendly */}
      <div className="p-8 max-w-[800px] mx-auto print:p-0 print:max-w-none">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-2xl font-bold">{transfer.fromEntity?.name || '—'}</h1>
          <h2 className="text-lg font-semibold mt-1">Stock Transfer Challan</h2>
          <div className="flex justify-between text-sm mt-2">
            <span><b>Challan No:</b> {transfer.transferNo}</span>
            <span><b>Date:</b> {transferDate}</span>
          </div>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border rounded p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">From (Source Entity)</div>
            <div className="text-base font-medium mt-1">{transfer.fromEntity?.name}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">To (Destination Entity)</div>
            <div className="text-base font-medium mt-1">{transfer.toEntity?.name}</div>
          </div>
        </div>

        {/* Items table */}
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
              <tr key={i} className="hover:bg-slate-50">
                <td className="border border-black px-2 py-1 text-center text-xs">{r.sl}</td>
                <td className="border border-black px-2 py-1 font-medium">{r.itemName}</td>
                <td className="border border-black px-2 py-1 font-mono text-xs">{r.itemCode}</td>
                <td className="border border-black px-2 py-1 font-mono text-xs">{r.barcode}</td>
                <td className="border border-black px-2 py-1 font-mono text-xs">{r.serial}</td>
                <td className="border border-black px-2 py-1 text-center font-medium">{r.qty}</td>
                <td className="border border-black px-2 py-1 text-center text-xs">{r.uom}</td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={5} className="border border-black px-2 py-1.5 text-right">Total Quantity:</td>
              <td className="border border-black px-2 py-1.5 text-center">{totalQty}</td>
              <td className="border border-black px-2 py-1.5"></td>
            </tr>
          </tbody>
        </table>

        {/* Notes */}
        {transfer.notes && (
          <div className="mt-4 border rounded p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Notes</div>
            <div className="text-sm mt-1">{transfer.notes}</div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-4 mt-12">
          <div className="text-center">
            <div className="border-t border-black pt-1 mx-8">
              <div className="text-xs font-medium">Sender Signature</div>
              <div className="text-[10px] text-muted-foreground">(From: {transfer.fromEntity?.name})</div>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-1 mx-8">
              <div className="text-xs font-medium">Receiver Signature</div>
              <div className="text-[10px] text-muted-foreground">(To: {transfer.toEntity?.name})</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-muted-foreground mt-6 border-t pt-2">
          This is a system-generated challan from DFCL-IT Inventory System · Generated on {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  )
}
