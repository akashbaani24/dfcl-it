'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/shared/PageHeader'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { KeyRound, CheckCircle2, XCircle, Eye, RefreshCw, MessageSquare, Loader2 } from 'lucide-react'
import { list, action } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

type ResetRequest = {
  id: string
  requestNo: string
  userId: string
  employeeName: string | null
  status: string
  message: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
}

export function PasswordResetRequestsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ResetRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'REJECTED'>('PENDING')

  // Resolve dialog state
  const [resolveOpen, setResolveOpen] = useState(false)
  const [activeRequest, setActiveRequest] = useState<ResetRequest | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [saving, setSaving] = useState(false)

  // Detail dialog (for already-resolved rows)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<ResetRequest | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = (await list('password-reset-requests' as any)) as any[]
      // Sort: PENDING first, then by createdAt desc
      const sorted = [...r].sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      setRows(sorted)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = filter === 'ALL' ? rows : rows.filter((r) => r.status === filter)

  const openResolve = (r: ResetRequest) => {
    setActiveRequest(r)
    setNewPassword('')
    setAdminMessage('')
    setResolveOpen(true)
  }

  const submitResolve = async () => {
    if (!activeRequest) return
    if (!newPassword.trim() && !adminMessage.trim()) {
      toast.error('Please enter a new password or a message for the user')
      return
    }
    if (newPassword.trim() && newPassword.trim().length < 4) {
      toast.error('Password must be at least 4 characters')
      return
    }
    setSaving(true)
    try {
      await action('resolve-password-reset', activeRequest.id, {
        newPassword: newPassword.trim() || undefined,
        message: adminMessage.trim() || undefined,
        adminUserId: user?.userId || 'admin',
      })
      toast.success('Request resolved — password updated and message sent to user')
      setResolveOpen(false)
      setActiveRequest(null)
      setNewPassword('')
      setAdminMessage('')
      load()
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const rejectRequest = async (r: ResetRequest) => {
    const reason = window.prompt('Reason for rejecting this request? (optional)')
    if (reason === null) return  // user cancelled
    try {
      await action('reject-password-reset', r.id, {
        message: reason || 'Request rejected by admin.',
        adminUserId: user?.userId || 'admin',
      })
      toast.success('Request rejected')
      load()
    } catch (e: any) {
      let msg = e.message
      try { const p = JSON.parse(msg); if (p.error) msg = p.error } catch {}
      toast.error(msg)
    }
  }

  const statusBadge = (s: string) => {
    if (s === 'PENDING') return <Badge status="PENDING" />
    if (s === 'RESOLVED') return <Badge status="DELIVERED" />
    if (s === 'REJECTED') return <Badge status="CANCELLED" />
    return <Badge status="CONVERTED" />
  }

  return (
    <div>
      <PageHeader
        title="Password Reset Requests"
        description="Users who forgot their password submit a request from the login page. Review and reset their password here."
        icon={KeyRound}
      />

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4">
        {(['PENDING', 'RESOLVED', 'REJECTED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {f}
            <span className="ml-1.5 opacity-70">
              ({f === 'ALL' ? rows.length : rows.filter((r) => r.status === f).length})
            </span>
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="ml-auto gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title={`No ${filter !== 'ALL' ? filter.toLowerCase() : ''} requests`}
              description="When a user submits a forgot-password request from the login page, it will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request No</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                    <TableCell className="font-medium">{r.userId}</TableCell>
                    <TableCell className="text-xs">
                      {r.employeeName || <span className="text-muted-foreground italic">Unknown user</span>}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(r.status === 'RESOLVED' || r.status === 'REJECTED') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDetailRow(r)
                              setDetailOpen(true)
                            }}
                            className="gap-1 h-8"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        )}
                        {r.status === 'PENDING' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openResolve(r)}
                              className="gap-1 h-8"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Resolve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rejectRequest(r)}
                              className="gap-1 h-8 text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ============ RESOLVE DIALOG ============ */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Resolve Password Reset
            </DialogTitle>
            <DialogDescription>
              Set a new password for the user and send them a message. The message will appear on their next login attempt.
            </DialogDescription>
          </DialogHeader>

          {activeRequest && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Request No:</span>
                  <span className="font-mono font-semibold">{activeRequest.requestNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-semibold">{activeRequest.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <span>{activeRequest.employeeName || <em className="text-amber-600">Unknown — verify User ID</em>}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">New Password</Label>
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave blank if you only want to send a message (e.g. &quot;Please contact me directly&quot;).
                </p>
              </div>

              <div>
                <Label className="text-xs">Message to User</Label>
                <Textarea
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder="e.g. 'Your password has been reset to: xyz123. Please change it after logging in.'"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  This message will be shown to the user on the login page when they enter their User ID.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitResolve} disabled={saving} className="gap-1">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Resolving...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Resolve &amp; Send</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DETAIL DIALOG (for resolved/rejected rows) ============ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Request Details
            </DialogTitle>
            <DialogDescription>
              {detailRow?.requestNo}
            </DialogDescription>
          </DialogHeader>

          {detailRow && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">User ID</p>
                  <p className="font-semibold">{detailRow.userId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Employee</p>
                  <p>{detailRow.employeeName || <em className="text-muted-foreground">Unknown</em>}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                  <p>{statusBadge(detailRow.status)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Resolved By</p>
                  <p>{detailRow.resolvedBy || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Submitted</p>
                  <p className="text-xs">{new Date(detailRow.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Resolved At</p>
                  <p className="text-xs">
                    {detailRow.resolvedAt ? new Date(detailRow.resolvedAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              {detailRow.message && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Admin Message</p>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
                    {detailRow.message}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
