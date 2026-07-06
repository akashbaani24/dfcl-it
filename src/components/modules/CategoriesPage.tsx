'use client'
import { ResourcePage, Col } from '@/components/shared/ResourcePage'
import { FieldDef } from '@/components/shared/FormDialog'
import { useEffect, useState, useCallback } from 'react'
import { list, create } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Plus, Folder, FolderOpen, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export function CategoriesPage() {
  const [cats, setCats] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [subDialogOpen, setSubDialogOpen] = useState(false)
  const [subParent, setSubParent] = useState<any>(null)
  const [subName, setSubName] = useState('')
  const [subCode, setSubCode] = useState('')
  const [subSaving, setSubSaving] = useState(false)

  const loadCats = useCallback(() => {
    list('categories').then((r) => setCats(r as any[])).catch(() => {})
  }, [])

  useEffect(() => { loadCats() }, [loadCats, refreshKey])

  // Separate top-level categories and sub-categories
  const topCategories = cats.filter((c) => !c.parentId)
  const getSubCategories = (parentId: string) => cats.filter((c) => c.parentId === parentId)

  // Fields for "Add Category" — NO parent field, NO root option
  const fields: FieldDef[] = [
    { name: 'name', label: 'Category Name', required: true, placeholder: 'e.g. Mobile, Computer, Electronics' },
    { name: 'shortCode', label: 'Short Code', required: true, placeholder: 'e.g. MOB, CMP, ELC' },
    { name: 'isActive', label: 'Active', type: 'switch', default: true },
  ]

  // Open sub-category dialog
  const openSubDialog = (parent: any) => {
    setSubParent(parent)
    setSubName('')
    setSubCode('')
    setSubDialogOpen(true)
  }

  // Save sub-category
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

  return (
    <div>
      <ResourcePage
        slug="categories"
        title="Category & Sub-Category"
        description="Create categories (Mobile, Computer). Then click '+ Sub' on any category to add sub-categories (Samsung Mobile, Laptop)."
        fields={fields}
        columns={[
          { key: 'name', label: 'Category Name' },
          { key: 'shortCode', label: 'Short Code' },
          { key: 'parentId', label: 'Type', render: (r) => r.parent?.name ? `Sub of: ${r.parent.name}` : 'Category' },
          { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
        ]}
        addLabel="Add Category"
        onDataChange={() => setRefreshKey((k) => k + 1)}
      />

      {/* Sub-category tree view + add sub buttons */}
      {topCategories.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Category Tree (click + Sub to add sub-category)</h3>
          <div className="border rounded-lg overflow-hidden">
            {topCategories.map((cat) => {
              const subs = getSubCategories(cat.id)
              return (
                <div key={cat.id} className="border-b last:border-b-0">
                  {/* Parent category row */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">({cat.shortCode})</span>
                      {subs.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{subs.length} sub</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => openSubDialog(cat)}
                    >
                      <Plus className="h-3 w-3" /> Sub
                    </Button>
                  </div>
                  {/* Sub-categories */}
                  {subs.length > 0 && (
                    <div className="pl-8">
                      {subs.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2 p-2 border-t border-slate-100">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm">{sub.name}</span>
                          <span className="text-xs text-muted-foreground">({sub.shortCode})</span>
                          <span className={`text-xs ${sub.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {sub.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sub-category creation dialog */}
      {subDialogOpen && subParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSubDialogOpen(false)}>
          <div className="bg-card rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Plus className="h-4 w-4" />
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
