// Resource registry - maps URL slug to Prisma model + includes config
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export type ResourceConfig = {
  model: keyof typeof db
  // Default includes for list/get queries
  include?: Record<string, any>
  // Fields used to generate auto numbers like PR-0001
  autoNumberField?: string
  autoNumberPrefix?: string
  // Allow create via this route
  writable?: boolean
  // Allow update via this route
  updatable?: boolean
  // Allow delete
  deletable?: boolean
}

export const RESOURCES: Record<string, ResourceConfig> = {
  // Company Setup
  'entities': {
    model: 'entity',
    include: { parent: true, children: true, departments: true, employees: true, suppliers: true },
    writable: true, updatable: true, deletable: true,
  },
  'departments': {
    model: 'department',
    include: { entity: true, employees: true },
    writable: true, updatable: true, deletable: true,
  },
  'employees': {
    model: 'employee',
    include: { department: true, entity: true },
    writable: true, updatable: true, deletable: true,
  },
  'uoms': {
    model: 'uoM',
    include: { items: true },
    writable: true, updatable: true, deletable: true,
  },
  'suppliers': {
    model: 'supplier',
    include: { entity: true },
    writable: true, updatable: true, deletable: true,
  },
  'categories': {
    model: 'category',
    include: { parent: true, children: true, items: true },
    writable: true, updatable: true, deletable: true,
  },
  'items': {
    model: 'item',
    include: { category: { include: { parent: true } }, uom: true, serials: true },
    writable: true, updatable: true, deletable: true,
  },
  'item-serials': {
    model: 'itemSerial',
    include: { item: true, entity: true },
    writable: true, updatable: true, deletable: true,
  },
  'news-ticker': {
    model: 'newsTicker',
    writable: true, updatable: true, deletable: true,
  },
  // Purchase
  'purchase-requisitions': {
    model: 'purchaseRequisition',
    include: { entity: true, items: { include: { item: true } } },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'reqNo', autoNumberPrefix: 'PR',
  },
  'purchases': {
    model: 'purchase',
    include: { entity: true, supplier: true, items: { include: { item: true } } },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'purchaseNo', autoNumberPrefix: 'PO',
  },
  'purchase-returns': {
    model: 'purchaseReturn',
    include: { purchase: true, items: { include: { item: true } } },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'returnNo', autoNumberPrefix: 'PRT',
  },
  // Inventory
  'internal-transfers': {
    model: 'internalTransfer',
    include: { fromEntity: true, toEntity: true, items: { include: { item: true } } },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'transferNo', autoNumberPrefix: 'IT',
  },
  'adjustments': {
    model: 'adjustment',
    include: { entity: true, items: { include: { item: true } } },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'adjustNo', autoNumberPrefix: 'ADJ',
  },
  'stock-transactions': {
    model: 'stockTransaction',
    include: { item: true, entity: true },
  },
  // Sales
  'sales': {
    model: 'sales',
    include: { entity: true, items: { include: { item: true } }, returns: true, refunds: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'salesNo', autoNumberPrefix: 'SO',
  },
  'sales-returns': {
    model: 'salesReturn',
    include: { sales: true, items: { include: { item: true } }, refunds: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'returnNo', autoNumberPrefix: 'SR',
  },
  'sales-refunds': {
    model: 'salesRefund',
    include: { sales: true, return: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'refundNo', autoNumberPrefix: 'RF',
  },
  // Accounts
  'account-entries': {
    model: 'accountEntry',
    include: { entity: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'entryNo', autoNumberPrefix: 'ACC',
  },
}

export async function generateNumber(prefix: string): Promise<string> {
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  // Use timestamp suffix for uniqueness within same day
  const ts = Date.now().toString().slice(-5)
  return `${prefix}-${ymd}-${ts}`
}

// Helper: build a where clause from query params
export function buildWhere(query: Record<string, any>): any {
  const where: any = {}
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue
    if (k === 'search') {
      // Search handled separately by caller
      continue
    }
    if (k === 'type' || k === 'status' || k === 'entityId' || k === 'supplierId' || k === 'itemId' || k === 'parentId' || k === 'categoryId') {
      where[k] = v
    }
  }
  return where
}
