'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/shared/PageHeader'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { ALL_MODULES, PERMISSION_ACTIONS } from '@/lib/auth'
import { list } from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, ShieldCheck, Building2, Search, KeyRound } from 'lucide-react'

export function ManagePermissionsPage() {
  const { permissionUserId, setPermissionUserId, setActive } = useApp()
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allEntities, setAllEntities] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [permMatrix, setPermMatrix] = useState<Record<string, any>>({})
  const [assignedEntities, setAssignedEntities] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Load all employees (with user relation) + all entities
  useEffect(() => {
    list('employees').then((r) => {
      setAllUsers((r as any[]).filter((e) => e.user))
    }).catch(() => {})
    list('entities').then((r) => setAllEntities(r as any[])).catch(() => {})
  }, [])

  // When permissionUserId is set (from employee page), auto-select that user
  useEffect(() => {
    if (permissionUserId) {
      setSelectedUserId(permissionUserId)
    }
  }, [permissionUserId])

  // Load permissions + entity assignments when user changes
  useEffect(() => {
    if (!selectedUserId) {
      setPermMatrix({})
      setAssignedEntities([])
      return
    }
    setLoading(true)
    Promise.all([
      fetch(`/api/auth/permissions?userId=${selectedUserId}`).then((r) => r.json()),
      fetch(`/api/auth/entities?userId=${selectedUserId}`).then((r) => r.json()),
    ]).then(([perms, ents]) => {
      const matrix: Record<string, any> = {}
      for (const m of ALL_MODULES) {
        const existing = perms.find((p: any) => p.module === m.key)
        matrix[m.key] = existing || {
          canView: false, canCreate: false, canEdit: false, canDelete: false, canUpdate: false, canExcel: false, canPdf: false,
        }
      }
      setPermMatrix(matrix)
      setAssignedEntities(ents.map((e: any) => e.entityId))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedUserId])

  const selectedUser = allUsers.find((u) => u.user?.id === selectedUserId)
  const sections = Array.from(new Set(ALL_MODULES.map((m) => m.section)))

  const togglePerm = (module: string, action: string, val: boolean) => {
    setPermMatrix((m) => ({ ...m, [module]: { ...m[module], [action]: val } }))
  }
  const toggleRowAll = (module: string, val: boolean) => {
    setPermMatrix((m) => ({
      ...m,
      [module]: { canView: val, canCreate: val, canEdit: val, canDelete: val, canUpdate: val, canExcel: val, canPdf: val },
    }))
  }
  const toggleColAll = (action: string, val: boolean) => {
    setPermMatrix((m) => {
      const next = { ...m }
      for (const k of Object.keys(next)) next[k] = { ...next[k], [action]: val }
      return next
    })
  }
  const toggleEntity = (entityId: string, val: boolean) => {
    setAssignedEntities((prev) => val ? [...prev, entityId] : prev.filter((id) => id !== entityId))
  }

  const saveAll = async () => {
    if (!selectedUserId) return
    setSaving(true)
    try {
      // Save permissions
      const permissions = Object.entries(permMatrix).map(([module, flags]) => ({ module, ...flags }))
      const r1 = await fetch('/api/auth/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, permissions }),
      })
      if (!r1.ok) { const d = await r1.json(); throw new Error(d.error) }
      // Save entity assignments
      const r2 = await fetch('/api/auth/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, entityIds: assignedEntities }),
      })
      if (!r2.ok) { const d = await r2.json(); throw new Error(d.error) }
      toast.success('Permissions & entity access saved')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => {
    setPermissionUserId(null)
    setActive('employees')
  }

  const filteredUsers = allUsers.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.user?.userId?.toLowerCase().includes(q) || u.employeeCode?.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Manage User Permissions
          </h1>
          <p className="text-sm text-muted-foreground">Assign menu rights & entity access for each user</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: user list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><KeyRound className="h-4 w-4" /> Select User</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user..." className="pl-8 h-9" />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.user?.id}
                  onClick={() => setSelectedUserId(u.user?.id)}
                  className={`w-full text-left px-3 py-2 border-b hover:bg-accent transition-colors ${selectedUserId === u.user?.id ? 'bg-primary/10' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.user?.userId} · {u.employeeCode}</div>
                    </div>
                    <Badge status={u.user?.role === 'ADMIN' ? 'APPROVED' : 'PENDING'} />
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No users with login found.<br />Create a login from Employee page first.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: permissions + entities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">
              {selectedUser ? (
                <span>Permissions for: {selectedUser.name} ({selectedUser.user?.userId})</span>
              ) : (
                <span className="text-muted-foreground">← Select a user to manage permissions</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedUserId ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Select a user from the left panel to view and edit their permissions.
              </div>
            ) : loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
            ) : selectedUser?.user?.role === 'ADMIN' ? (
              <div className="py-8 text-center">
                <Badge status="APPROVED" />
                <p className="text-sm mt-2">This is an <strong>Admin</strong> user — they have full access to all modules and all entities. No permission changes needed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Entity Assignment */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4" /> Entity Access
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">Select which entities this user can access. They will only see and work with data for these entities.</p>
                  <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                    {allEntities.map((e) => (
                      <label key={e.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={assignedEntities.includes(e.id)}
                          onCheckedChange={(v) => toggleEntity(e.id, !!v)}
                        />
                        <span>{e.name} ({e.shortCode})</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Permission Matrix */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Menu Permissions</h3>
                  <p className="text-xs text-muted-foreground mb-2">Tick the actions each module is allowed for this user.</p>
                  <div className="overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead className="min-w-[180px]">Module</TableHead>
                          {PERMISSION_ACTIONS.map((a) => (
                            <TableHead key={a.key} className="text-center w-14">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px]">{a.label}</span>
                                <Checkbox
                                  checked={ALL_MODULES.every((m) => permMatrix[m.key]?.[a.key])}
                                  onCheckedChange={(v) => toggleColAll(a.key, !!v)}
                                />
                              </div>
                            </TableHead>
                          ))}
                          <TableHead className="text-center w-14">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px]">All</span>
                              <Checkbox
                                checked={ALL_MODULES.every((m) => Object.values(permMatrix[m.key] || {}).every(Boolean))}
                                onCheckedChange={(v) => ALL_MODULES.forEach((m) => toggleRowAll(m.key, !!v))}
                              />
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sections.map((sec) => (
                          <SectionRows
                            key={sec}
                            section={sec}
                            permMatrix={permMatrix}
                            togglePerm={togglePerm}
                            toggleRowAll={toggleRowAll}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={goBack}>Cancel</Button>
                  <Button onClick={saveAll} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Permissions & Entity Access'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SectionRows({ section, permMatrix, togglePerm, toggleRowAll }: {
  section: string
  permMatrix: Record<string, any>
  togglePerm: (m: string, a: string, v: boolean) => void
  toggleRowAll: (m: string, v: boolean) => void
}) {
  const modules = ALL_MODULES.filter((m) => m.section === section)
  return (
    <>
      <TableRow className="bg-muted/40">
        <TableCell colSpan={PERMISSION_ACTIONS.length + 2} className="text-xs font-semibold text-muted-foreground py-1.5">
          {section}
        </TableCell>
      </TableRow>
      {modules.map((m) => (
        <TableRow key={m.key}>
          <TableCell className="text-sm">{m.label}</TableCell>
          {PERMISSION_ACTIONS.map((a) => (
            <TableCell key={a.key} className="text-center">
              <Checkbox
                checked={!!permMatrix[m.key]?.[a.key]}
                onCheckedChange={(v) => togglePerm(m.key, a.key, !!v)}
              />
            </TableCell>
          ))}
          <TableCell className="text-center">
            <Checkbox
              checked={Object.values(permMatrix[m.key] || {}).every(Boolean)}
              onCheckedChange={(v) => toggleRowAll(m.key, !!v)}
            />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
