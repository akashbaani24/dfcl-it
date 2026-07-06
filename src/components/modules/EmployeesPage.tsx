'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2, KeyRound, ShieldCheck, FileSpreadsheet, FileText, UserCircle } from 'lucide-react'
import { list, create, update, remove } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import { PermissionAction, ALL_MODULES, PERMISSION_ACTIONS } from '@/lib/auth'
import { exportToCSV, exportToPDF } from '@/lib/export'
import { FormDialog, FieldDef } from '@/components/shared/FormDialog'

const columns = (hasUser: (r: any) => boolean): any[] => [
  { key: 'employeeCode', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'departmentId', label: 'Department', render: (r: any) => r.department?.name || '—' },
  { key: 'entityId', label: 'Entity', render: (r: any) => r.entity?.name || '—' },
  { key: 'phone', label: 'Phone' },
  {
    key: 'userLogin', label: 'Login',
    render: (r: any) => r.user
      ? <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-flex items-center gap-1"><KeyRound className="h-3 w-3" />{r.user.userId} ({r.user.role})</span>
      : <span className="text-xs text-muted-foreground">No login</span>
  },
  { key: 'isActive', label: 'Status', render: (r: any) => r.isActive ? 'Active' : 'Inactive' },
]

export function EmployeesPage() {
  const { hasPerm } = useAuth()
  const canCreate = hasPerm('employees', 'canCreate' as PermissionAction)
  const canEdit = hasPerm('employees', 'canEdit' as PermissionAction)
  const canDelete = hasPerm('employees', 'canDelete' as PermissionAction)
  const canExcel = hasPerm('employees', 'canExcel' as PermissionAction)
  const canPdf = hasPerm('employees', 'canPdf' as PermissionAction)
  // permission to manage logins & permissions is gated by canUpdate on 'employees'
  const canManageLogin = hasPerm('employees', 'canUpdate' as PermissionAction)

  const [entities, setEntities] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  // Login dialog state
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginEmployee, setLoginEmployee] = useState<any>(null)
  const [loginForm, setLoginForm] = useState({ userId: '', password: '', role: 'USER' })
  const [loginSaving, setLoginSaving] = useState(false)

  // Permissions dialog state
  const [permOpen, setPermOpen] = useState(false)
  const [permUser, setPermUser] = useState<any>(null)
  const [permMatrix, setPermMatrix] = useState<Record<string, any>>({})
  const [permSaving, setPermSaving] = useState(false)

  const fields: FieldDef[] = [
    { name: 'name', label: 'Employee Name', required: true },
    { name: 'employeeCode', label: 'Employee Code', required: true, placeholder: 'EMP-001' },
    { name: 'designation', label: 'Designation', placeholder: 'e.g. Sales Manager' },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },
    {
      name: 'entityId', label: 'Entity', type: 'select', required: true,
      options: entities.map((e) => ({ value: e.id, label: e.name })),
    },
    {
      name: 'departmentId', label: 'Department', type: 'select', required: true,
      options: departments.map((d) => ({ value: d.id, label: `${d.name} (${d.entity?.shortCode || ''})` })),
    },
    { name: 'isActive', label: 'Active', type: 'switch', default: true },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await list('employees', q ? { search: q } : undefined)
      setRows(r as any[])
      setFiltered(r as any[])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('departments').then((r) => setDepartments(r as any[])).catch(() => {})
    load()
  }, [load])

  const onAdd = () => { setEditing(null); setOpen(true) }
  const onEdit = (row: any) => { setEditing(row); setOpen(true) }
  const onDelete = async (row: any) => {
    if (!confirm('Delete this employee? Their login (if any) will remain until separately removed.')) return
    try {
      await remove('employees', row.id)
      toast.success('Deleted')
      load()
    } catch (e: any) { toast.error(e.message) }
  }
  const onSubmit = async (data: any) => {
    if (editing) {
      await update('employees', editing.id, data)
      toast.success('Updated')
    } else {
      await create('employees', data)
      toast.success('Created')
    }
    load()
  }

  // Login management
  const openLoginDialog = (emp: any) => {
    setLoginEmployee(emp)
    setLoginForm({
      userId: emp.user?.userId || emp.employeeCode.toLowerCase(),
      password: '',
      role: emp.user?.role || 'USER',
    })
    setLoginOpen(true)
  }
  const saveLogin = async () => {
    if (!loginEmployee) return
    if (!loginForm.userId || !loginForm.password) { toast.error('User ID & password required'); return }
    setLoginSaving(true)
    try {
      if (loginEmployee.user) {
        // Update existing
        const r = await fetch('/api/auth/register', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: loginEmployee.user.id, password: loginForm.password, role: loginForm.role }),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
        toast.success('Login updated')
      } else {
        // Create new
        const r = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: loginEmployee.id, userId: loginForm.userId, password: loginForm.password, role: loginForm.role }),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
        toast.success(`Login created: ${loginForm.userId}`)
      }
      setLoginOpen(false)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoginSaving(false)
    }
  }

  // Permissions matrix
  const openPermDialog = async (emp: any) => {
    if (!emp.user) { toast.error('Create a login first'); return }
    setPermUser(emp.user)
    try {
      const r = await fetch(`/api/auth/permissions?userId=${emp.user.id}`)
      const d = await r.json()
      const matrix: Record<string, any> = {}
      for (const m of ALL_MODULES) {
        const existing = d.find((p: any) => p.module === m.key)
        matrix[m.key] = existing || {
          canView: false, canCreate: false, canEdit: false, canDelete: false, canUpdate: false, canExcel: false, canPdf: false,
        }
      }
      setPermMatrix(matrix)
      setPermOpen(true)
    } catch (e: any) { toast.error(e.message) }
  }
  const togglePerm = (module: string, action: string, val: boolean) => {
    setPermMatrix((m) => ({ ...m, [module]: { ...m[module], [action]: val } }))
  }
  const toggleRowAll = (module: string, val: boolean) => {
    setPermMatrix((m) => ({
      ...m,
      [module]: {
        canView: val, canCreate: val, canEdit: val, canDelete: val, canUpdate: val, canExcel: val, canPdf: val,
      },
    }))
  }
  const toggleColAll = (action: string, val: boolean) => {
    setPermMatrix((m) => {
      const next = { ...m }
      for (const k of Object.keys(next)) next[k] = { ...next[k], [action]: val }
      return next
    })
  }
  const savePermissions = async () => {
    if (!permUser) return
    setPermSaving(true)
    try {
      const permissions = Object.entries(permMatrix).map(([module, flags]) => ({ module, ...flags }))
      const r = await fetch('/api/auth/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: permUser.id, permissions }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      toast.success('Permissions saved')
      setPermOpen(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setPermSaving(false)
    }
  }

  // Group modules by section for matrix display
  const sections = Array.from(new Set(ALL_MODULES.map((m) => m.section)))

  // Export
  const exportColumns = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'entity', label: 'Entity' },
    { key: 'userId', label: 'Login ID' },
    { key: 'role', label: 'Role' },
    { key: 'isActive', label: 'Active' },
  ]
  const buildExportRows = () => filtered.map((r) => ({
    employeeCode: r.employeeCode,
    name: r.name,
    designation: r.designation,
    phone: r.phone,
    email: r.email,
    department: r.department?.name,
    entity: r.entity?.name,
    userId: r.user?.userId,
    role: r.user?.role,
    isActive: r.isActive ? 'Yes' : 'No',
  }))

  return (
    <div>
      <PageHeader
        title="Employee Setup"
        description="Employees assigned to entities and departments. Create login & manage menu permissions per user."
        onAdd={canCreate ? onAdd : undefined}
        addLabel="Add Employee"
        onSearch={(v) => setQ(v)}
      />
      <div className="flex items-center gap-2 mb-3">
        {canExcel && (
          <Button variant="outline" size="sm" onClick={() => exportToCSV('Employees', buildExportRows(), exportColumns)} className="gap-1">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        )}
        {canPdf && (
          <Button variant="outline" size="sm" onClick={() => exportToPDF('Employees Report', buildExportRows(), exportColumns)} className="gap-1">
            <FileText className="h-4 w-4" /> PDF
          </Button>
        )}
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No employees found" hint={canCreate ? 'Add a new employee to get started' : undefined} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit || canDelete || canManageLogin) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, i) => (
                    <TableRow key={row.id || i}>
                      <TableCell className="font-mono text-xs">{row.employeeCode}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.designation || '—'}</TableCell>
                      <TableCell>{row.department?.name || '—'}</TableCell>
                      <TableCell>{row.entity?.name || '—'}</TableCell>
                      <TableCell>{row.phone || '—'}</TableCell>
                      <TableCell>
                        {row.user
                          ? <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-flex items-center gap-1"><KeyRound className="h-3 w-3" />{row.user.userId} ({row.user.role})</span>
                          : <span className="text-xs text-muted-foreground">No login</span>}
                      </TableCell>
                      <TableCell>{row.isActive ? 'Active' : 'Inactive'}</TableCell>
                      {(canEdit || canDelete || canManageLogin) && (
                        <TableCell className="text-right whitespace-nowrap">
                          {canManageLogin && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title={row.user ? 'Edit Login' : 'Create Login'} onClick={() => openLoginDialog(row)}>
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                              {row.user && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Manage Permissions" onClick={() => openPermDialog(row)}>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(row)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        fields={fields}
        initial={editing || {}}
        onSubmit={onSubmit}
      />

      {/* Login creation/edit dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {loginEmployee?.user ? 'Edit Login' : 'Create Login'}
            </DialogTitle>
            <DialogDescription>
              For employee: <strong>{loginEmployee?.name}</strong> ({loginEmployee?.employeeCode})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">User ID (login)</Label>
              <Input
                value={loginForm.userId}
                onChange={(e) => setLoginForm({ ...loginForm, userId: e.target.value })}
                placeholder="e.g. rahim or EMP-001"
                className="mt-1"
                disabled={!!loginEmployee?.user}
              />
              {loginEmployee?.user && <p className="text-[10px] text-muted-foreground mt-1">User ID cannot be changed after creation.</p>}
            </div>
            <div>
              <Label className="text-xs">Password {loginEmployee?.user && '(leave blank to keep current)'}</Label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={loginForm.role} onValueChange={(v) => setLoginForm({ ...loginForm, role: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User (limited by permissions)</SelectItem>
                  <SelectItem value="ADMIN">Admin (full access)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Admin role bypasses all permission checks.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoginOpen(false)}>Cancel</Button>
            <Button onClick={saveLogin} disabled={loginSaving}>{loginSaving ? 'Saving...' : 'Save Login'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions matrix dialog */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Menu Permissions — {permUser?.userId}
            </DialogTitle>
            <DialogDescription>
              Tick the actions each module is allowed for this user. Admin role bypasses all checks.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="min-w-[200px]">Module</TableHead>
                  {PERMISSION_ACTIONS.map((a) => (
                    <TableHead key={a.key} className="text-center w-16">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[11px]">{a.label}</span>
                        <Checkbox
                          checked={ALL_MODULES.every((m) => permMatrix[m.key]?.[a.key])}
                          onCheckedChange={(v) => toggleColAll(a.key, !!v)}
                        />
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center w-16">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px]">All</span>
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
                  <>
                    <TableRow key={`sec-${sec}`} className="bg-muted/40">
                      <TableCell colSpan={PERMISSION_ACTIONS.length + 2} className="text-xs font-semibold text-muted-foreground py-1.5">
                        {sec}
                      </TableCell>
                    </TableRow>
                    {ALL_MODULES.filter((m) => m.section === sec).map((m) => (
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
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermOpen(false)}>Cancel</Button>
            <Button onClick={savePermissions} disabled={permSaving}>{permSaving ? 'Saving...' : 'Save Permissions'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
