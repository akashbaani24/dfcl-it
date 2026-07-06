'use client'
import { useEffect, useState, useCallback } from 'react'
import { FieldDef } from '@/components/shared/FormDialog'
import { list, create, update, remove } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Plus, Pencil, Trash2, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { usePerm, ExportButtons } from '@/components/shared/Perms'
import { SearchInput } from '@/components/shared/SearchInput'
import { PageHeader, EmptyState } from '@/components/shared/PageHeader'
import { FormDialog } from '@/components/shared/FormDialog'
import { Skeleton } from '@/components/ui/skeleton'

export function CategoriesPage() {
  const perm = usePerm('categories')
  const [cats, setCats] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  // Sub-category dialog
  const [subDialogOpen, setSubDialogOpen] = useState(false)
  const [subParent, setSubParent] = useState<any>(null)
  const [subName, setSubName] = useState('')
  const [subCode, setSubCode] = useState('')
  const [subSaving, setSubSaving] = useState(false)

  const loadCats = useCallback(async () => {
    setLoading(true)
    try {
      const r = await list('categories')
      setCats(r as any[])
      // Auto-expand all parents
      const parents = (r as any[]).filter((c) => !c.parentId).map((c) => c.id)
      setExpandedParents(new Set(parents))
    } catch (e: any) {
      toast.error(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCats() }, [loadCats, refreshKey])

  useEffect(() => {
    if (!q) { setFiltered(cats); return }
    const ql = q.toLowerCase()
    const matching = new Set<string>()
    for (const c of cats) {
      if (JSON.stringify(c).toLowerCase().includes(ql)) {
        matching.add(c.id)
        if (c.parentId) matching.add(c.parentId)
      }
    }
    setFiltered(cats.filter((c) => matching.has(c.id)))
  }, [q, cats])

  const topCategories = filtered.filter((c) => !c.parentId)
  const getSubCategories = (parentId: string) => filtered.filter((c) => c.parentId === parentId)

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Fields for "Add/Edit Category"
  const fields: FieldDef[] = [
    { name: 'name', label: 'Category Name', required: true, placeholder: 'e.g. Mobile, Computer' },
    { name: 'shortCode', label: 'Short Code', required: true, placeholder: 'e.g. MOB, CMP' },
    { name: 'isActive', label: 'Active', type: 'switch', default: true },
  ]

  const onAdd = () => { setEditing(null); setOpenDialog(true) }
  const onEdit = (row: any) => { setEditing(row); setOpenDialog(true) }
  const onDelete = async (row: any) => {
    const subs = getSubCategories(row.id)
    const msg = subs.length > 0
      ? `এই Category-র অধীনে ${subs.length} টি sub-category আছে। আগে সেগুলো মুছুন।`
      : 'Are you sure to delete this category?'
    if (subs.length > 0) {
      toast.error(msg, { duration: 5000 })
      return
    }
    if (!confirm(msg)) return
    try {
      await remove('categories', row.id)
      toast.success('Deleted')
      setRefreshKey((k) => k + 1)
    } catch (e: any) {
      let m = e.message
      try { const p = JSON.parse(m); if (p.error) m = p.error } catch {}
      toast.error(m, { duration: 6000 })
    }
  }

  const onSubmit = async (data: any) => {
    if (editing) {
      await update('categories', editing.id, data)
      toast.success('Updated')
    } else {
      await create('categories', data)
      toast.success('Created')
    }
    setRefreshKey((k) => k + 1)
  }

  // Sub-category handlers
  const openSubDialog = (parent: any) => {
    setSubParent(parent)
    setSubName('')
    setSubCode('')
    setSubDialogOpen(true)
  }

  const saveSubCategory = async () => {
    if (!subName || !subCode || !subParent) {
      toast.error('Name and Short Code required')
      return
    }
    setSubSaving(true)
    try {
      await create('categories', {
        name: subName,
        shortCode: subCode,
        parentId: subParent.id,
        isActive: true,
      })
      toast.success(`Sub-category "${subName}" created under "${subParent.name}"`)
      setSubDialogOpen(false)
      setRefreshKey((k) => k + 1)
    } catch (e: any) {
      toast.error(e.message || 'Failed to create sub-category')
    } finally {
      setSubSaving(false)
    }
  }

  // Export
  const exportRows = cats.map((c, i) => ({
    serial: i + 1,
    category: c.parentId ? getSubCategories(c.parentId).length > 0 ? '' : (cats.find((p) => p.id === c.parentId)?.name || '') : c.name,
    subCategory: c.parentId ? c.name : '',
    shortCode: c.shortCode,
    status: c.isActive ? 'Active' : 'Inactive',
  }))
  const exportColumns = [
    { key: 'serial', label: 'SL' },
    { key: 'category', label: 'Category' },
    { key: 'subCategory', label: 'Sub-Category' },
    { key: 'shortCode', label: 'Short Code' },
    { key: 'status', label: 'Status' },
  ]

  let serial = 0

  return (
    <div>
      <PageHeader
        title="Category & Sub-Category"
        description="Create categories (Mobile, Computer). Then click '+ Sub' on any category to add sub-categories."
        onAdd={perm.canCreate ? onAdd : undefined}
        addLabel="Add Category"
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search categories..." />
        <ExportButtons module="categories" title="Categories" rows={exportRows} columns={exportColumns} />
      </div>

      {loading ? (
        <Card><CardContent className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent></Card>
      ) : topCategories.length === 0 ? (
        <EmptyState title="No categories yet" hint={perm.canCreate ? 'Add a category to get started' : undefined} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center">SL</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub-Category</TableHead>
                    <TableHead className="w-28">Short Code</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="text-right w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCategories.map((cat) => {
                    serial++
                    const subs = getSubCategories(cat.id)
                    const isExpanded = q ? true : expandedParents.has(cat.id)
                    return (
                      <>
                        {/* Parent category row */}
                        <TableRow key={cat.id} className="bg-slate-50/50 font-medium">
                          <TableCell className="text-center text-xs text-muted-foreground">{serial}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {subs.length > 0 && (
                                <button onClick={() => toggleExpand(cat.id)} className="hover:bg-slate-200 rounded p-0.5">
                                  {isExpanded
                                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                </button>
                              )}
                              <span className="font-semibold">{cat.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                          <TableCell className="font-mono text-xs">{cat.shortCode}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded ${cat.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                              {cat.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {perm.canCreate && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Add Sub-Category" onClick={() => openSubDialog(cat)}>
                                <FolderPlus className="h-3.5 w-3.5 text-blue-600" />
                              </Button>
                            )}
                            {perm.canEdit && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cat)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {perm.canDelete && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(cat)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Sub-category rows */}
                        {isExpanded && subs.map((sub) => {
                          serial++
                          return (
                            <TableRow key={sub.id} className="bg-blue-50/30">
                              <TableCell className="text-center text-xs text-muted-foreground">{serial}</TableCell>
                              <TableCell className="pl-8 text-muted-foreground">↳</TableCell>
                              <TableCell className="font-medium">{sub.name}</TableCell>
                              <TableCell className="font-mono text-xs">{sub.shortCode}</TableCell>
                              <TableCell>
                                <span className={`text-xs px-2 py-0.5 rounded ${sub.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                  {sub.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {perm.canEdit && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(sub)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {perm.canDelete && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(sub)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <FormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        title={editing ? 'Edit Category' : 'Add Category'}
        fields={fields}
        initial={editing || {}}
        onSubmit={onSubmit}
      />

      {/* Sub-category creation dialog */}
      {subDialogOpen && subParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSubDialogOpen(false)}>
          <div className="bg-card rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Add Sub-Category
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Under: <strong>{subParent.name}</strong> ({subParent.shortCode})
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Sub-Category Name *</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder={`e.g. Samsung ${subParent.name}`}
                  className="w-full mt-1 h-10 px-3 border rounded-lg bg-background text-sm focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium">Short Code *</label>
                <input
                  type="text"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  placeholder="e.g. SMS-MOB"
                  className="w-full mt-1 h-10 px-3 border rounded-lg bg-background text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setSubDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveSubCategory} disabled={subSaving}>
                {subSaving ? 'Creating...' : 'Create Sub-Category'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
