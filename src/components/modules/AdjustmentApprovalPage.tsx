'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { list, action, getOne } from '@/lib/api'
import { toast } from 'sonner'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { SearchInput } from '@/components/shared/SearchInput'
import { Textarea } from '@/components/ui/textarea'

// ===== APPROVAL LIST PAGE =====
export function AdjustmentApprovalPage() {
  const { setActive } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Date panel
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const all = await list('adjustments') as any[]
      // Show ONLY PENDING — approved/rejected are removed from this list
      setRows(all.filter((r: any) => r.status === 'PENDING'))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let result = rows
    if (fromDate) result = result.filter(r => new Date(r.adjustDate) >= new Date(fromDate + 'T00:00:00.000Z'))
    if (toDate) result = result.filter(r => new Date(r.adjustDate) <= new Date(toDate + 'T23:59:59.999Z'))
    if (q) {
      const ql = q.toLowerCase()
      result = result.filter((r: any) => JSON.stringify(r).toLowerCase().includes(ql))
    }
    setFiltered(result)
  }, [q, rows, fromDate, toDate])

  const openView = (row: any) => {
    sessionStorage.setItem('approvingAdjustmentId', row.id)
    setActive('adjustment-approval-view')
  }

  return (
    <div>
      <PageHeader title="Adjustment Approval" description="Review and approve/reject pending stock adjustments" />

      {/* Date Panel */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div>
          <Label className="text-xs font-semibold">From</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-36 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-xs font-semibold">To</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-36 text-xs mt-0.5" />
        </div>
        {(fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate('') }} className="mt-4">
            Clear
          </Button>
        )}
        <SearchInput value={q} onChange={setQ} placeholder="Search..." />
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No pending adjustments" hint="All adjustments have been processed" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjust No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => openView(r)}>
                    <TableCell className="font-mono text-sm">{r.adjustNo}</TableCell>
                    <TableCell>{new Date(r.adjustDate).toLocaleDateString()}</TableCell>
                    <TableCell>{r.entity?.name}</TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${r.type === 'INCREASE' ? 'bg-green-100 text-green-700' : r.type === 'DECREASE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.reason || '—'}</TableCell>
                    <TableCell>{r.items?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openView(r) }}>
                        View
                      </Button>
                    </TableCell>
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

// ===== APPROVAL VIEW PAGE (opens as full page) =====
export function AdjustmentApprovalViewPage() {
  const { setActive } = useApp()
  const [adjustment, setAdjustment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const id = sessionStorage.getItem('approvingAdjustmentId')
    if (!id) {
      toast.error('No adjustment selected')
      setActive('adjustment-approval')
      return
    }
    sessionStorage.removeItem('approvingAdjustmentId')
    getOne('adjustments', id)
      .then((r: any) => { setAdjustment(r); setLoading(false) })
      .catch(() => { toast.error('Failed to load'); setActive('adjustment-approval') })
  }, [setActive])

  const approve = async () => {
    if (!adjustment) return
    setProcessing(true)
    try {
      await action('approve-adjustment', adjustment.id, { approver: 'admin' })
      toast.success('Adjustment approved — stock updated')
      setActive('adjustment-approval')
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg)
    } finally { setProcessing(false) }
  }

  const reject = async () => {
    if (!adjustment) return
    setProcessing(true)
    try {
      await action('reject-adjustment', adjustment.id, { approver: 'admin' })
      toast.success('Adjustment rejected')
      setActive('adjustment-approval')
    } catch (e: any) { toast.error(e.message) }
    finally { setProcessing(false) }
  }

  const parseItem = (it: any) => {
    let adjustType = '—'
    let barcode = '—'
    let serial = '—'
    if (it.serials && it.serials.includes('ADJTYPE:')) {
      const parts = it.serials.split('|')
      const typePart = parts.find(p => p.startsWith('ADJTYPE:'))
      if (typePart) adjustType = typePart.split(':')[1]
      const dataParts = parts.filter(p => !p.startsWith('ADJTYPE:') && !p.startsWith('EFFECT:'))
      if (dataParts.length > 0) {
        const data = dataParts.join('').split(',')
        barcode = data[0] || '—'
        serial = data[1] || '—'
      }
    } else if (it.serials) {
      barcode = it.serials.split(',')[0] || '—'
      serial = it.serials.split(',')[1] || '—'
      if (adjustment?.type === 'INCREASE') adjustType = 'EXCESS'
      else if (adjustment?.type === 'DECREASE') adjustType = 'SHORTAGE'
    }
    return { adjustType, barcode, serial }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">Loading...</p></div>
  if (!adjustment) return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">Not found</p></div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={() => setActive('adjustment-approval')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Adjustment Approval — {adjustment.adjustNo}</h1>
      </div>

      <div className="border-2 border-black rounded-lg bg-white max-w-4xl mx-auto">
        <div className="text-center py-3 border-b-2 border-black">
          <h2 className="text-lg font-bold">Adjustment Approval</h2>
        </div>

        <div className="grid grid-cols-2 gap-0 border-b-2 border-black">
          <div className="p-3 border-r-2 border-black">
            <Label className="text-xs font-bold">Entity (Default)</Label>
            <div className="mt-1 flex items-center gap-2 h-10 px-3 border rounded-md bg-slate-50">
              <span className="text-sm font-medium">{adjustment.entity?.name || '—'}</span>
            </div>
          </div>
          <div className="p-3">
            <Label className="text-xs font-bold">Adjust Date</Label>
            <div className="mt-1 flex items-center h-10 px-3 border rounded-md bg-slate-50">
              <span className="text-sm">{new Date(adjustment.adjustDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="p-3 border-b-2 border-black">
          <Label className="text-xs font-bold">Adjust Reason</Label>
          <Textarea value={adjustment.reason || '—'} readOnly className="mt-1 bg-slate-50" rows={2} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-100 border-b-2 border-black">
              <tr>
                <th className="px-2 py-2 text-center font-bold text-xs w-8 border-r border-slate-300">Sl</th>
                <th className="px-2 py-2 text-left font-bold text-xs border-r border-slate-300">Item Name</th>
                <th className="px-2 py-2 text-left font-bold text-xs w-28 border-r border-slate-300">Barcode</th>
                <th className="px-2 py-2 text-left font-bold text-xs w-28 border-r border-slate-300">Serial</th>
                <th className="px-2 py-2 text-center font-bold text-xs w-16 border-r border-slate-300">Qty</th>
                <th className="px-2 py-2 text-left font-bold text-xs w-16 border-r border-slate-300">UoM</th>
                <th className="px-2 py-2 text-left font-bold text-xs w-28 border-r border-slate-300">Adjust type</th>
              </tr>
            </thead>
            <tbody>
              {adjustment.items?.map((it: any, idx: number) => {
                const parsed = parseItem(it)
                return (
                  <tr key={it.id} className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-center text-xs text-muted-foreground border-r border-slate-200">{idx + 1}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200">
                      <div className="text-xs font-medium">{it.item?.name || '—'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{it.item?.itemCode}</div>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs border-r border-slate-200">{parsed.barcode}</td>
                    <td className="px-2 py-1.5 font-mono text-xs border-r border-slate-200">{parsed.serial}</td>
                    <td className="px-2 py-1.5 text-center text-xs font-medium border-r border-slate-200">{it.quantity}</td>
                    <td className="px-2 py-1.5 text-xs border-r border-slate-200">{it.item?.uom?.shortCode || '—'}</td>
                    <td className="px-2 py-1.5 text-xs border-r border-slate-200">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${parsed.adjustType === 'EXCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {parsed.adjustType}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between p-3 border-t-2 border-black">
          <Button variant="destructive" onClick={reject} disabled={processing} className="gap-1">
            <XCircle className="h-4 w-4" /> Reject
          </Button>
          <Button onClick={approve} disabled={processing} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Approved
          </Button>
        </div>
      </div>
    </div>
  )
}
