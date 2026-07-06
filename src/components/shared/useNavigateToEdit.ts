'use client'
import { useApp } from '@/lib/store'

// Helper hook to navigate to generic add/edit page
export function useNavigateToEdit() {
  const { setActive } = useApp()

  const navigateToAdd = (config: {
    slug: string
    title: string
    fields: any[]
    defaultValues?: Record<string, any>
    backTo: string
  }) => {
    sessionStorage.setItem('genericAddEditConfig', JSON.stringify(config))
    sessionStorage.removeItem('editingRecordId')
    setActive('generic-add-edit')
  }

  const navigateToEdit = (id: string, config: {
    slug: string
    title: string
    fields: any[]
    defaultValues?: Record<string, any>
    backTo: string
  }) => {
    sessionStorage.setItem('genericAddEditConfig', JSON.stringify(config))
    sessionStorage.setItem('editingRecordId', id)
    setActive('generic-add-edit')
  }

  return { navigateToAdd, navigateToEdit }
}
