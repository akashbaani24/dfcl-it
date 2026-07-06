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
  // Select only specific fields for LIST queries (reduces payload size)
  // If not set, includes all fields + relations
  listSelect?: Record<string, boolean>
}

export const RESOURCES: Record<string, ResourceConfig> = {
  // Company Setup
  'entities': {
    model: 'entity',
    include: { parent: true },
    listSelect: { id: true, name: true, shortCode: true, parentId: true, address: true, phone: true, email: true, isActive: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
  },
  'departments': {
    model: 'department',
    listSelect: { id: true, name: true, shortCode: true, entityId: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
  },
  'employees': {
    model: 'employee',
    include: {
      department: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
      user: { select: { id: true, userId: true, role: true } },
    },
    listSelect: { id: true, name: true, employeeCode: true, designation: true, phone: true, email: true, departmentId: true, entityId: true, isActive: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
  },
  'uoms': {
    model: 'uoM',
    listSelect: { id: true, name: true, shortCode: true, isActive: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
  },
  'suppliers': {
    model: 'supplier',
    include: { entity: { select: { id: true, name: true } } },
    listSelect: { id: true, name: true, shortCode: true, phone: true, email: true, address: true, entityId: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
  },
  'categories': {
    model: 'category',
    include: { parent: { select: { id: true, name: true } } },
    listSelect: { id: true, name: true, shortCode: true, parentId: true, isActive: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
  },
  'items': {
    model: 'item',
    include: { category: { select: { id: true, name: true, parent: { select: { name: true } } } }, uom: { select: { id: true, shortCode: true } } },
    listSelect: { id: true, name: true, itemCode: true, barcode: true, categoryId: true, uomId: true, hasSerial: true, description: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
  },
  'item-serials': {
    model: 'itemSerial',
    include: {
      item: { select: { id: true, name: true, itemCode: true } },
      entity: { select: { id: true, name: true } },
    },
    listSelect: { id: true, itemId: true, serialNumber: true, barcode: true, entityId: true, status: true, purchaseId: true, saleId: true, createdAt: true, updatedAt: true },
    writable: true, updatable: true, deletable: true,
  },
  'news-ticker': {
    model: 'newsTicker',
    writable: true, updatable: true, deletable: true,
  },
  // Purchase
  'purchase-requisitions': {
    model: 'purchaseRequisition',
    include: {
      entity: { select: { id: true, name: true } },
      items: { select: { id: true, itemId: true, quantity: true } },
    },
    listSelect: { id: true, reqNo: true, entityId: true, requestDate: true, requiredDate: true, requestedBy: true, notes: true, status: true, approvedBy: true, approvedAt: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'reqNo', autoNumberPrefix: 'PR',
  },
  'purchases': {
    model: 'purchase',
    include: {
      entity: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      items: { select: { id: true, itemId: true, quantity: true, unitPrice: true, totalPrice: true } },
    },
    listSelect: { id: true, purchaseNo: true, entityId: true, supplierId: true, requisitionId: true, purchaseDate: true, invoiceNo: true, totalAmount: true, status: true, approvedBy: true, approvedAt: true, notes: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'purchaseNo', autoNumberPrefix: 'PO',
  },
  'purchase-returns': {
    model: 'purchaseReturn',
    include: {
      purchase: { select: { id: true, purchaseNo: true } },
      items: { select: { id: true, itemId: true, quantity: true } },
    },
    listSelect: { id: true, returnNo: true, purchaseId: true, returnDate: true, reason: true, totalAmount: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'returnNo', autoNumberPrefix: 'PRT',
  },
  // Inventory
  'internal-transfers': {
    model: 'internalTransfer',
    include: {
      fromEntity: { select: { id: true, name: true } },
      toEntity: { select: { id: true, name: true } },
      items: { select: { id: true, itemId: true, quantity: true } },
    },
    listSelect: { id: true, transferNo: true, fromEntityId: true, toEntityId: true, transferDate: true, status: true, receivedAt: true, notes: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'transferNo', autoNumberPrefix: 'IT',
  },
  'adjustments': {
    model: 'adjustment',
    include: {
      entity: { select: { id: true, name: true } },
      items: { select: { id: true, itemId: true, quantity: true } },
    },
    listSelect: { id: true, adjustNo: true, entityId: true, adjustDate: true, type: true, reason: true, status: true, approvedBy: true, approvedAt: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'adjustNo', autoNumberPrefix: 'ADJ',
  },
  'stock-transactions': {
    model: 'stockTransaction',
    include: {
      item: { select: { id: true, name: true, itemCode: true } },
      entity: { select: { id: true, name: true } },
    },
    listSelect: { id: true, itemId: true, entityId: true, type: true, quantity: true, refType: true, refId: true, serials: true, createdAt: true },
  },
  // Sales
  'sales': {
    model: 'sales',
    include: {
      entity: { select: { id: true, name: true } },
      items: { select: { id: true, itemId: true, quantity: true, unitPrice: true, totalPrice: true } },
    },
    listSelect: { id: true, salesNo: true, entityId: true, customerName: true, customerPhone: true, customerAddress: true, salesDate: true, deliveryDate: true, totalAmount: true, paidAmount: true, status: true, deliveryStatus: true, notes: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'salesNo', autoNumberPrefix: 'SO',
  },
  'sales-returns': {
    model: 'salesReturn',
    include: {
      sales: { select: { id: true, salesNo: true } },
      items: { select: { id: true, itemId: true, quantity: true } },
    },
    listSelect: { id: true, returnNo: true, salesId: true, returnDate: true, reason: true, totalAmount: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'returnNo', autoNumberPrefix: 'SR',
  },
  'sales-refunds': {
    model: 'salesRefund',
    include: {
      sales: { select: { id: true, salesNo: true } },
      return: { select: { id: true, returnNo: true } },
    },
    listSelect: { id: true, refundNo: true, salesId: true, returnId: true, refundDate: true, amount: true, method: true, notes: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'refundNo', autoNumberPrefix: 'RF',
  },
  // Accounts
  'account-entries': {
    model: 'accountEntry',
    include: { entity: { select: { id: true, name: true } } },
    listSelect: { id: true, entryNo: true, entityId: true, type: true, category: true, amount: true, date: true, description: true, method: true, refType: true, refId: true, createdAt: true },
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
