'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ComboBox } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, KeyRound, ShieldCheck, Trash2 } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { list, getOne, update, create } from '@/lib/api'
import { toast } from 'sonner'
import { PermissionAction } from '@/lib/auth'

export function EmployeeEditPage() {
  const { permissionUserId, setPermissionUserId, setActive } = useApp()
  const { hasPerm } = useAuth()
  const canEdit = hasPerm('employees', 'canEdit' as PermissionAction)
  const canManageLogin = hasPerm('employees', 'canUpdate' as PermissionAction)

  // We use a special store value to know which employee to edit
  // If no editingId, this is a new employee
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    employeeCode: '',
    designation: '',
    phone: '',
    email: '',
    photo: '' as string | null,
    entityId: '',
    departmentId: '',
    isActive: true,
  })
  const [entities, setEntities] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Login dialog state
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginForm, setLoginForm] = useState({ userId: '', password: '', role: 'USER' })
  const [userLogin, setUserLogin] = useState<any>(null)
  const [loginSaving, setLoginSaving] = useState(false)

  useEffect(() => {
    // Get editingId from sessionStorage (set by EmployeesPage when clicking edit)
    const id = sessionStorage.getItem('editingEmployeeId')
    if (id) {
      setEditingId(id)
      sessionStorage.removeItem('editingEmployeeId')
    }
  }, [])

  useEffect(() => {
    list('entities').then((r) => setEntities(r as any[])).catch(() => {})
    list('departments').then((r) => setDepartments(r as any[])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!editingId) {
      setLoading(false)
      return
    }
    getOne('employees', editingId).then((r: any) => {
      setForm({
        name: r.name || '',
        employeeCode: r.employeeCode || '',
        designation: r.designation || '',
        phone: r.phone || '',
        email: r.email || '',
        photo: r.photo || null,
        entityId: r.entityId || '',
        departmentId: r.departmentId || '',
        isActive: r.isActive ?? true,
      })
      setUserLogin(r.user || null)
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load employee')
      setLoading(false)
    })
  }, [editingId])

  const save = async () => {
    if (!form.name || !form.employeeCode) {
      toast.error('Name and Employee Code are required')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await update('employees', editingId, form)
        toast.success('Employee updated')
      } else {
        const created = await create('employees', form)
        toast.success('Employee created')
        if (created?.id) setEditingId(created.id)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => {
    setActive('employees')
  }

  // Login management
  const openLoginDialog = () => {
    setLoginForm({
      userId: userLogin?.userId || form.employeeCode.toLowerCase(),
      password: '',
      role: userLogin?.role || 'USER',
    })
    setLoginOpen(true)
  }

  const saveLogin = async () => {
    if (!loginForm.userId) {
      toast.error('User ID is required')
      return
    }
    // Password is required for new logins; optional for existing (leave blank to keep)
    if (!userLogin && !loginForm.password) {
      toast.error('Password is required for new login')
      return
    }
    setLoginSaving(true)
    try {
      if (userLogin) {
        // Update existing login — include userId (now editable), password
        // (only if provided), and role
        const patchBody: any = {
          id: userLogin.id,
          userId: loginForm.userId,
          role: loginForm.role,
        }
        if (loginForm.password) {
          patchBody.password = loginForm.password
        }
        const r = await fetch('/api/auth/register', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
        toast.success('Login updated')
        // Refresh user login to reflect the new userId
        const emp: any = await getOne('employees', editingId!)
        setUserLogin(emp?.user || null)
      } else if (editingId) {
        const r = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: editingId, userId: loginForm.userId, password: loginForm.password, role: loginForm.role }),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
        toast.success(`Login created: ${loginForm.userId}`)
        // Refresh user login
        const emp: any = await getOne('employees', editingId)
        setUserLogin(emp?.user || null)
      }
      setLoginOpen(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoginSaving(false)
    }
  }

  const handleManagePermissions = () => {
    if (!userLogin) {
      toast.error('Create a login first')
      return
    }
    setPermissionUserId(userLogin.id)
    setActive('manage-permissions')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading employee...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {editingId ? 'Edit Employee' : 'Add Employee'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {editingId ? `Editing: ${form.name || '...'}` : 'Create a new employee record'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Employee form (2/3 width) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Employee Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className="mt-1"
                  disabled={!canEdit && !!editingId}
                />
              </div>
              <div>
                <Label className="text-xs">Employee Code *</Label>
                <Input
                  value={form.employeeCode}
                  onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                  placeholder="EMP-001"
                  className="mt-1"
                  disabled={!canEdit && !!editingId}
                />
              </div>
              <div>
                <Label className="text-xs">Designation</Label>
                <Input
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  placeholder="e.g. Sales Manager"
                  className="mt-1"
                  disabled={!canEdit && !!editingId}
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+8801..."
                  className="mt-1"
                  disabled={!canEdit && !!editingId}
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-1"
                  disabled={!canEdit && !!editingId}
                />
              </div>
              {/* Photo upload */}
              <div className="sm:col-span-2">
                <Label className="text-xs">Photo</Label>
                <div className="mt-1">
                  <FileUpload
                    value={form.photo}
                    onChange={(v) => setForm({ ...form, photo: v as string | null })}
                    label="Upload Photo"
                    accept="image/*"
                    maxSizeMB={2}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Entity</Label>
                <div className="mt-1">
                  <ComboBox
                    value={form.entityId || '__NONE__'}
                    onChange={(v) => setForm({ ...form, entityId: v === '__NONE__' ? '' : v })}
                    options={[
                      { value: '__NONE__', label: '— No Entity —' },
                      ...entities.map((e) => ({ value: e.id, label: e.name, sublabel: e.shortCode })),
                    ]}
                    placeholder="Select entity"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <div className="mt-1">
                  <ComboBox
                    value={form.departmentId || '__NONE__'}
                    onChange={(v) => setForm({ ...form, departmentId: v === '__NONE__' ? '' : v })}
                    options={[
                      { value: '__NONE__', label: '— No Department —' },
                      ...departments.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                    placeholder="Select department"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Active</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                    disabled={!canEdit && !!editingId}
                  />
                  <span className="text-xs text-muted-foreground">{form.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={goBack}>Cancel</Button>
              {canEdit && (
                <Button onClick={save} disabled={saving} className="gap-1">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : (editingId ? 'Update Employee' : 'Create Employee')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Login + Permissions (1/3 width) */}
        {editingId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Login & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Login status */}
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Login Account</div>
                {userLogin ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{userLogin.userId}</div>
                      <div className="text-xs text-muted-foreground">{userLogin.role}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Active</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No login account</div>
                )}
              </div>

              {canManageLogin && (
                <>
                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={openLoginDialog}>
                    <KeyRound className="h-4 w-4" />
                    {userLogin ? 'Edit Login' : 'Create Login'}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleManagePermissions}>
                    <ShieldCheck className="h-4 w-4" />
                    Manage Permissions
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Login dialog */}
      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setLoginOpen(false)}>
          <div className="bg-card rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {userLogin ? 'Edit Login' : 'Create Login'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              For: <strong>{form.name}</strong> ({form.employeeCode})
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">User ID</Label>
                <Input
                  value={loginForm.userId}
                  onChange={(e) => setLoginForm({ ...loginForm, userId: e.target.value })}
                  className="mt-1"
                />
                {userLogin && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    ⚠️ Changing the User ID will update the login username. The user will need to use the new User ID to sign in.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Password {userLogin && '(leave blank to keep)'}</Label>
                <Input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <div className="mt-1">
                  <ComboBox
                    value={loginForm.role}
                    onChange={(v) => setLoginForm({ ...loginForm, role: v })}
                    options={[
                      { value: 'USER', label: 'User' },
                      { value: 'ADMIN', label: 'Admin' },
                    ]}
                    placeholder="Select role"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setLoginOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveLogin} disabled={loginSaving}>
                {loginSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
