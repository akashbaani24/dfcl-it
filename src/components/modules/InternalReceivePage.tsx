'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { list, action } from '@/lib/api'
import { toast } from 'sonner'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { CheckCircle2, Eye, PackageCheck, ArrowLeftRight } from 'lucide-react'

export function InternalReceivePage() {
  const perm = usePerm('internal-receive')
  const [receives, setReceives] = useState<any[]>([])
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])

  // Receive dialog
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [activeTransfer, setActiveTransfer] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // View dialog
  const [viewing, setViewing] = useState<any>(null)

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

  const openReceiveForm = async (transfer: any) => {
    try {
      const res = await fetch(`/api/resource?slug=internal-transfers&id=${transfer.id}`)
      if (!res.ok) throw new Error(await res.text())
      const full = await res.json()
      setActiveTransfer(full)
      setNotes('')
      setReceiveOpen(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const save = async () => {
    if (!activeTransfer) return
    setSaving(true)
    try {
      const r = await action('receive-internal-transfer', activeTransfer.id, { notes })
      toast.success(`Created ${r.receiveNo}. Stock moved.`)
      setReceiveOpen(false)
      setActiveTransfer(null)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
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

      {/* Receive / confirm dialog */}
      <Dialog open={receiveOpen} onOpenChange={(v) => { setReceiveOpen(v); if (!v) { setActiveTransfer(null); setNotes('') } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Transfer {activeTransfer?.transferNo}</DialogTitle>
            <DialogDescription>
              Verify the items and serial numbers below match what was physically received, then confirm. Stock will be moved from <b>{activeTransfer?.fromEntity?.name}</b> to <b>{activeTransfer?.toEntity?.name}</b>.
            </DialogDescription>
          </DialogHeader>

          {activeTransfer && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm bg-muted/40 p-3 rounded-md">
              <div><span className="text-muted-foreground">From:</span> {activeTransfer.fromEntity?.name}</div>
              <div><span className="text-muted-foreground">To:</span> {activeTransfer.toEntity?.name}</div>
              <div><span className="text-muted-foreground">Date:</span> {new Date(activeTransfer.transferDate).toLocaleDateString()}</div>
            </div>
          )}

          <div className="border rounded-md overflow-x-auto mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Item</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="min-w-[260px]">Serial Numbers (verify)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTransfer?.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{it.item?.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                    </TableCell>
                    <TableCell className="font-medium">{it.quantity}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {it.serials ? (
                        <span className="break-all">{it.serials}</span>
                      ) : (
                        <span className="text-muted-foreground">— (bulk item)</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
              placeholder="Optional notes about this receive..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !perm.canCreate}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Confirm Receive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Barcodes</TableHead>
                  <TableHead>Serials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{it.item?.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                    </TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell className="font-mono text-[10px] max-w-[220px] whitespace-normal break-all">{it.barcodes || '—'}</TableCell>
                    <TableCell className="font-mono text-[10px]">{it.serials || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
