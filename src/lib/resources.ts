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
  // Document type for the new sequential number format (PUR-YYMMDD-01-0000001).
  // When set, generateNumber() calls /api/doc-number?type=<docType> instead
  // of using the old prefix-based format.
  docType?: string
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
  'account-types': {
    model: 'accountType',
    listSelect: { id: true, name: true, type: true, isActive: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
  },
  'bank-infos': {
    model: 'bankInfo',
    listSelect: { id: true, bankName: true, accountName: true, accountNumber: true, branch: true, routingNumber: true, swiftCode: true, isActive: true, createdAt: true },
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
    autoNumberField: 'reqNo', autoNumberPrefix: 'PRQ',
    docType: 'PURCHASE_REQUISITION',  // PRQ-YYMMDD-09-0000001
  },
  'purchases': {
    model: 'purchase',
    include: {
      entity: { select: { id: true, name: true } },
      shippingEntity: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
    },
    listSelect: { id: true, purchaseNo: true, entityId: true, shippingEntityId: true, supplierId: true, requisitionId: true, purchaseDate: true, invoiceNo: true, totalAmount: true, status: true, approvedBy: true, approvedAt: true, notes: true, createdBy: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'purchaseNo', autoNumberPrefix: 'PUR',
    docType: 'PURCHASE',  // PUR-YYMMDD-01-0000001
  },
  'purchase-returns': {
    model: 'purchaseReturn',
    include: {
      purchase: { select: { id: true, purchaseNo: true } },
      items: { select: { id: true, itemId: true, quantity: true } },
    },
    listSelect: { id: true, returnNo: true, purchaseId: true, returnDate: true, reason: true, totalAmount: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'returnNo', autoNumberPrefix: 'PURTN',
    docType: 'PURCHASE_RETURN',  // PURTN-YYMMDD-02-0000001
  },
  'purchase-receives': {
    model: 'purchaseReceive',
    include: {
      purchase: { select: { id: true, purchaseNo: true } },
      entity: { select: { id: true, name: true } },
      items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
    },
    listSelect: { id: true, receiveNo: true, purchaseId: true, entityId: true, receiveDate: true, status: true, approvedBy: true, approvedAt: true, notes: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'receiveNo', autoNumberPrefix: 'PRV',
    docType: 'PURCHASE_RECEIVE',  // PRV-YYMMDD-010-0000001
  },
  // Inventory
  'internal-transfers': {
    model: 'internalTransfer',
    include: {
      fromEntity: { select: { id: true, name: true } },
      toEntity: { select: { id: true, name: true } },
      items: {
        include: {
          item: { select: { id: true, name: true, itemCode: true, uom: { select: { shortCode: true } } } },
        },
      },
    },
    listSelect: { id: true, transferNo: true, fromEntityId: true, toEntityId: true, transferDate: true, status: true, receivedAt: true, notes: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'transferNo', autoNumberPrefix: 'IT',
    docType: 'INTERNAL_TRANSFER',  // IT-YYMMDD-03-0000001
  },
  'internal-receives': {
    model: 'internalReceive',
    include: {
      // Include the full transfer with both fromEntity and toEntity so the
      // Internal Receive page can show "From Entity" in the summary table.
      transfer: {
        select: {
          id: true,
          transferNo: true,
          fromEntity: { select: { id: true, name: true } },
          toEntity: { select: { id: true, name: true } },
        },
      },
      entity: { select: { id: true, name: true } },
      items: { include: { item: { select: { id: true, name: true, itemCode: true, uom: { select: { shortCode: true } } } } } },
    },
    listSelect: { id: true, receiveNo: true, transferId: true, entityId: true, receiveDate: true, status: true, notes: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'receiveNo', autoNumberPrefix: 'IR',
    docType: 'INTERNAL_RECEIVE',  // IR-YYMMDD-04-0000001
  },
  'adjustments': {
    model: 'adjustment',
    include: {
      entity: { select: { id: true, name: true } },
      items: {
        include: {
          item: { select: { id: true, name: true, itemCode: true, uom: { select: { shortCode: true } } } },
        },
      },
    },
    listSelect: { id: true, adjustNo: true, entityId: true, adjustDate: true, type: true, reason: true, status: true, approvedBy: true, approvedAt: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'adjustNo', autoNumberPrefix: 'ADJ',
    docType: 'ADJUSTMENT',  // ADJ-YYMMDD-05-0000001
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
    autoNumberField: 'salesNo', autoNumberPrefix: 'SL',
    docType: 'SALES',  // SL-YYMMDD-06-0000001
  },
  'sales-returns': {
    model: 'salesReturn',
    include: {
      sales: { select: { id: true, salesNo: true } },
      items: { select: { id: true, itemId: true, quantity: true } },
    },
    listSelect: { id: true, returnNo: true, salesId: true, returnDate: true, reason: true, totalAmount: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'returnNo', autoNumberPrefix: 'SLRTN',
    docType: 'SALES_RETURN',  // SLRTN-YYMMDD-07-0000001
  },
  'sales-refunds': {
    model: 'salesRefund',
    include: {
      sales: { select: { id: true, salesNo: true } },
      return: { select: { id: true, returnNo: true } },
    },
    listSelect: { id: true, refundNo: true, salesId: true, returnId: true, refundDate: true, amount: true, method: true, notes: true, createdAt: true },
    writable: true, updatable: true, deletable: true,
    autoNumberField: 'refundNo', autoNumberPrefix: 'SLRF',
    docType: 'SALES_REFUND',  // SLRF-YYMMDD-08-0000001
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

// Generate a document number. If `docType` is provided, uses the new
// sequential format (PUR-YYMMDD-01-0000001) via the /api/doc-number
// endpoint. Otherwise falls back to the old prefix-based format.
//
// NOTE: This function runs server-side (in the API route). We can't call
// /api/doc-number via fetch (that would be a loop), so we import the
// DOC_CONFIG and use the db directly.
export async function generateNumber(prefix: string, docType?: string): Promise<string> {
  if (docType) {
    // New sequential format
    const { DOC_CONFIG } = await import('@/app/api/doc-number/route')
    const cfg = DOC_CONFIG[docType]
    if (!cfg) {
      throw new Error(`Unknown docType: ${docType}`)
    }

    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const yymmdd = `${yy}${mm}${dd}`

    // Atomically get the next sequence number
    const existing = await db.sequentialNumber.findUnique({
      where: { docType_yymmdd: { docType, yymmdd } },
    })

    let nextSeq: number
    if (existing) {
      nextSeq = existing.lastSeq + 1
      await db.sequentialNumber.update({
        where: { id: existing.id },
        data: { lastSeq: nextSeq },
      })
    } else {
      nextSeq = 1
      await db.sequentialNumber.create({
        data: { docType, yymmdd, lastSeq: nextSeq },
      })
    }

    const seqPadded = String(nextSeq).padStart(7, '0')
    return `${cfg.prefix}-${yymmdd}-${cfg.typeCode}-${seqPadded}`
  }

  // Old format (fallback) — used by AccountEntry which doesn't have a
  // docType yet
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
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

/**
 * Recursively sanitize a Prisma payload by converting empty strings (`''`)
 * to `undefined` for any field that looks like a foreign key.
 *
 * WHY THIS EXISTS
 * ---------------
 * SQLite (with `PRAGMA foreign_keys = ON`) rejects INSERTs/UPDATEs where a
 * foreign-key column is set to an empty string `''` because no parent row
 * has `id = ''`. Prisma passes `''` through verbatim, so the database throws
 * `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed` — a confusing error
 * because it doesn't tell you which column is the problem.
 *
 * The ComboBox component sometimes sets values to `''` when a user toggles
 * a selection off. If that empty value reaches Prisma, the write fails.
 *
 * This helper walks the payload (including nested `items.create` / `items.update`
 * arrays used by Purchase / Sales / Transfer etc.) and converts `''` to
 * `undefined` for any field whose name ends in `Id` (or `entityId`,
 * `shippingEntityId`, `supplierId`, `itemId`, `parentId`, etc.). `undefined`
 * tells Prisma "skip this field" — the column will either be left at its DB
 * default (for nullable columns) or Prisma will throw a clearer "missing
 * required field" error for non-nullable columns, which is much easier to
 * diagnose than the generic FK constraint failure.
 *
 * This is a defensive backstop. Client-side validation should still catch
 * missing required FK fields first — but if it ever slips through, the API
 * will fail gracefully instead of corrupting the database.
 *
 * ADDITIONAL SAFETY: also nulls out whitespace-only strings (`'   '`) on
 * FK-like fields, since those would also fail FK validation. And also
 * strips empty strings on `refId` (which doesn't end in `Id` but is a
 * common FK-like polymorphic field in this schema).
 */
export function sanitizePayload<T extends Record<string, any>>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload
  const out: Record<string, any> = Array.isArray(payload) ? [] : {}

  for (const [key, value] of Object.entries(payload)) {
    // Empty/whitespace string on an FK-looking field → undefined
    if (typeof value === 'string' && value.trim() === '' && isFkLike(key)) {
      out[key] = undefined
      continue
    }
    // Recurse into plain objects (e.g. nested create/update wrappers)
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      out[key] = sanitizePayload(value)
      continue
    }
    // Recurse into arrays of objects (e.g. items: { create: [{...}, {...}] })
    if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item === 'object' && !(item instanceof Date) ? sanitizePayload(item) : item
      )
      continue
    }
    out[key] = value
  }
  return out as T
}

function isFkLike(fieldName: string): boolean {
  // Match any field ending in "Id" (case-sensitive) — covers entityId,
  // shippingEntityId, supplierId, itemId, categoryId, purchaseId,
  // fromEntityId, toEntityId, saleId, returnId, refundId, transferId,
  // receiveId, parentId, departmentId, employeeId, userId, etc.
  // Also catches `refId` (polymorphic FK used by StockTransaction, etc.).
  return /Id$/.test(fieldName) || fieldName === 'refId'
}
