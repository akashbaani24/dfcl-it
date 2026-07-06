'use client'
import { useAuth } from '@/lib/auth-store'
import { PermissionAction } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { exportToCSV, exportToPDF } from '@/lib/export'

// Hook to get permission helpers for a module
export function usePerm(module: string) {
  const { hasPerm } = useAuth()
  return {
    canView: hasPerm(module, 'canView' as PermissionAction),
    canCreate: hasPerm(module, 'canCreate' as PermissionAction),
    canEdit: hasPerm(module, 'canEdit' as PermissionAction),
    canDelete: hasPerm(module, 'canDelete' as PermissionAction),
    canUpdate: hasPerm(module, 'canUpdate' as PermissionAction),
    canExcel: hasPerm(module, 'canExcel' as PermissionAction),
    canPdf: hasPerm(module, 'canPdf' as PermissionAction),
  }
}

// Export buttons for non-ResourcePage list pages
export function ExportButtons({
  module,
  title,
  rows,
  columns,
}: {
  module: string
  title: string
  rows: any[]
  columns: { key: string; label: string }[]
}) {
  const { canExcel, canPdf } = usePerm(module)
  if (!canExcel && !canPdf) return null
  return (
    <div className="flex items-center gap-2 mb-3">
      {canExcel && (
        <Button variant="outline" size="sm" onClick={() => exportToCSV(title.replace(/\s+/g, '_'), rows, columns)} className="gap-1">
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </Button>
      )}
      {canPdf && (
        <Button variant="outline" size="sm" onClick={() => exportToPDF(title, rows, columns)} className="gap-1">
          <FileText className="h-4 w-4" /> PDF
        </Button>
      )}
    </div>
  )
}
