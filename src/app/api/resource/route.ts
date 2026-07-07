// Generic resource CRUD API
// GET    /api/resource?slug=entities                    -> list
// GET    /api/resource?slug=entities&id=xxx             -> get one
// POST   /api/resource { slug, data }                   -> create
// PATCH  /api/resource { slug, id, data }               -> update
// DELETE /api/resource?slug=entities&id=xxx             -> delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { RESOURCES, generateNumber, buildWhere, sanitizePayload } from '@/lib/resources'
import { getCurrentUser, getUserEntityIds } from '@/lib/auth-server'
import {
  deleteEntityCascade, deleteEmployeeCascade, deleteDepartmentCascade,
  deleteItemCascade, deleteUserCascade, deleteCategoryCascade, deleteSupplierCascade,
} from '@/lib/cascade-delete'

// Resources that have an entityId field (need entity filtering for non-admin)
const ENTITY_FILTERED_RESOURCES = new Set([
  'entities', 'departments', 'employees', 'suppliers',
  'purchase-requisitions', 'purchases', 'purchase-returns', 'purchase-receives',
  'internal-transfers', 'internal-receives', 'adjustments', 'stock-transactions',
  'sales', 'sales-returns', 'sales-refunds',
  'account-entries', 'item-serials',
])

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const id = searchParams.get('id')
  const search = searchParams.get('search') || undefined
  // Pagination params
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '0', 10) // 0 = no limit (backward compat)
  const paginated = searchParams.get('paginate') === '1'

  if (!slug || !RESOURCES[slug]) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 })
  }
  const cfg = RESOURCES[slug]
  // @ts-expect-error dynamic model access
  const model = db[cfg.model]

  // Entity access control — only fetch user if this resource needs entity filtering
  let entityFilter: string[] | null = null
  if (ENTITY_FILTERED_RESOURCES.has(slug)) {
    const currentUser = await getCurrentUser()
    if (currentUser && currentUser.role !== 'ADMIN') {
      entityFilter = await getUserEntityIds(currentUser.id)
    }
  }

  try {
    if (id) {
      const row = await model.findUnique({ where: { id }, include: cfg.include })
      if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(row)
    }
    const where = buildWhere(Object.fromEntries(searchParams))
    if (search) {
      if (slug === 'items') {
        where.OR = [
          { name: { contains: search } },
          { itemCode: { contains: search } },
          { barcode: { contains: search } },
        ]
      } else if (slug === 'entities') {
        where.OR = [{ name: { contains: search } }, { shortCode: { contains: search } }]
      } else if (slug === 'employees') {
        where.OR = [{ name: { contains: search } }, { employeeCode: { contains: search } }]
      } else if (slug === 'item-serials') {
        where.OR = [{ serialNumber: { contains: search } }, { barcode: { contains: search } }]
      } else {
        where.name = { contains: search }
      }
    }

    // Apply entity filter for non-admin users
    if (entityFilter && entityFilter.length > 0 && ENTITY_FILTERED_RESOURCES.has(slug)) {
      if (slug === 'entities') {
        where.id = { in: entityFilter }
      } else if (slug === 'internal-transfers') {
        where.OR = [
          { fromEntityId: { in: entityFilter } },
          { toEntityId: { in: entityFilter } },
        ]
      } else {
        where.entityId = { in: entityFilter }
      }
    } else if (entityFilter && entityFilter.length === 0 && ENTITY_FILTERED_RESOURCES.has(slug)) {
      // Non-admin with no entity assignments — return empty
      if (paginated) {
        return NextResponse.json({ data: [], total: 0, page, limit, totalPages: 0 })
      }
      return NextResponse.json([])
    }

    // If pagination is requested, return paginated response with metadata
    if (paginated && limit > 0) {
      const skip = (page - 1) * limit
      // Use listSelect for lighter payload when available
      const queryOptions: any = {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }
      if (cfg.listSelect) {
        queryOptions.select = { ...cfg.listSelect, ...cfg.include }
      } else {
        queryOptions.include = cfg.include
      }
      const [rows, total] = await Promise.all([
        model.findMany(queryOptions),
        model.count({ where }),
      ])
      return NextResponse.json({
        data: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    }

    // Default: return all (backward compatible with existing UI)
    const queryOptions: any = {
      where,
      orderBy: { createdAt: 'desc' },
    }
    if (cfg.listSelect) {
      queryOptions.select = { ...cfg.listSelect, ...cfg.include }
    } else {
      queryOptions.include = cfg.include
    }
    const rows = await model.findMany(queryOptions)
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug, data } = body
  if (!slug || !RESOURCES[slug]) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 })
  }
  const cfg = RESOURCES[slug]
  if (!cfg.writable) {
    return NextResponse.json({ error: 'Not writable' }, { status: 403 })
  }
  // Entity access control on create
  const currentUser = await getCurrentUser()
  if (currentUser && currentUser.role !== 'ADMIN') {
    const entityIds = await getUserEntityIds(currentUser.id)
    if (entityIds && ENTITY_FILTERED_RESOURCES.has(slug)) {
      const dataEntityId = data.entityId || data.fromEntityId
      if (dataEntityId && !entityIds.includes(dataEntityId)) {
        return NextResponse.json({ error: 'You do not have access to this entity' }, { status: 403 })
      }
    }
  }
  // @ts-expect-error dynamic model access
  const model = db[cfg.model]
  try {
    // Sanitize the payload: convert empty strings on FK-like fields to
    // undefined so SQLite doesn't throw "FOREIGN KEY constraint failed"
    // (which gives a confusing generic error). `undefined` makes Prisma
    // skip the field, which is the correct behavior for nullable columns
    // and produces a clearer "missing required field" error otherwise.
    const payload = sanitizePayload({ ...data })
    if (cfg.autoNumberField && cfg.autoNumberPrefix && !payload[cfg.autoNumberField]) {
      payload[cfg.autoNumberField] = await generateNumber(cfg.autoNumberPrefix)
    }

    // Pre-flight: validate that all FK references in the payload actually
    // exist in the database BEFORE attempting the create. This turns the
    // confusing "FOREIGN KEY constraint failed" error into a clear message
    // like "Item with id 'xyz' does not exist" — much easier to debug.
    const fkError = await validateFkReferences(slug, payload)
    if (fkError) {
      console.error('[resource POST] FK validation failed:', fkError)
      return NextResponse.json({ error: fkError, slug }, { status: 400 })
    }

    const row = await model.create({ data: payload, include: cfg.include })
    return NextResponse.json(row)
  } catch (e: any) {
    // Log the full error + payload (minus line items) so we can diagnose
    // exactly which FK field is failing. The generic SQLite FK error doesn't
    // tell you which column is the problem, so this log is critical.
    console.error('[resource POST] create failed for slug=', slug)
    console.error('[resource POST] error:', e.message)
    try {
      const safeLog = { ...data }
      if (safeLog.items) safeLog.items = `[${Array.isArray(data.items?.create) ? data.items.create.length : 0} items]`
      console.error('[resource POST] payload keys:', Object.keys(data || {}))
      console.error('[resource POST] payload (truncated):', JSON.stringify(safeLog).slice(0, 500))
    } catch {}
    return NextResponse.json({ error: e.message, slug, hint: 'Check server logs for which FK field is invalid' }, { status: 500 })
  }
}

/**
 * Pre-flight FK validation: walk the sanitized payload and verify that
 * every FK-looking field (ending in `Id` or named `refId`) points to a row
 * that actually exists in the corresponding table.
 *
 * Map FK field name → Prisma model name. Most fields follow the convention
 * `xxxId` → model `xxx` (lowercased first letter). Special cases handled below.
 *
 * Returns a human-readable error string if any FK is invalid, or null if OK.
 */
async function validateFkReferences(slug: string, payload: any): Promise<string | null> {
  if (!payload || typeof payload !== 'object') return null

  // Walk the payload collecting all FK references
  const refs: Array<{ field: string; id: string; model: string; context: string }> = []

  function collect(obj: any, context: string) {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => collect(item, `${context}[${i}]`))
      return
    }
    for (const [key, value] of Object.entries(obj)) {
      // For nested create/update/connect wrappers like { items: { create: [...] } },
      // recurse into ALL object values (not just `items`), so we catch FK fields
      // inside line items (e.g. itemId inside items.create[]).
      if (typeof value === 'string' && value && (/Id$/.test(key) || key === 'refId')) {
        const modelName = fkFieldToModel(key)
        if (modelName) {
          refs.push({ field: key, id: value, model: modelName, context })
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recurse into nested objects (e.g. items: { create: [...] })
        collect(value, `${context}.${key}`)
      } else if (Array.isArray(value)) {
        // Recurse into arrays (handled at top of next call)
        collect(value, `${context}.${key}`)
      }
    }
  }

  collect(payload, slug)

  // Verify each reference exists in the DB
  for (const ref of refs) {
    try {
      // @ts-expect-error dynamic model access
      const m = db[ref.model]
      if (!m || !m.findUnique) continue
      const row = await m.findUnique({ where: { id: ref.id }, select: { id: true } })
      if (!row) {
        return `${ref.field}="${ref.id}" does not exist in ${ref.model} (at ${ref.context}). ` +
               `Please refresh the page and reselect the ${ref.field.replace(/Id$/, '').toLowerCase()}.`
      }
    } catch (e: any) {
      // If the model lookup fails for some reason, skip pre-flight and let Prisma handle it
      console.error('[validateFkReferences] skip', ref, e.message)
    }
  }
  return null
}

/**
 * Map an FK field name to its Prisma model name.
 * e.g. entityId → entity, supplierId → supplier, shippingEntityId → shippingEntity (special),
 * itemId → item, etc.
 */
function fkFieldToModel(field: string): string | null {
  // Special cases (composite / non-standard). null means "skip pre-flight
  // for this field" — used when the field is polymorphic or context-dependent.
  const specials: Record<string, string | null> = {
    shippingEntityId: 'entity',
    fromEntityId: 'entity',
    toEntityId: 'entity',
    purchaseItemId: 'purchaseItem',
    saleId: 'sales',
    salesId: 'sales',
    returnId: null,        // ambiguous: salesReturn or purchaseReturn
    refundId: 'salesRefund',
    transferId: 'internalTransfer',
    receiveId: null,       // ambiguous: purchaseReceive or internalReceive
    refId: null,           // polymorphic — skip pre-flight
    parentId: null,        // ambiguous: entity self-ref or category self-ref
    categoryId: 'category',
    departmentId: 'department',
    employeeId: 'employee',
    userId: 'user',
    uomId: 'uoM',
    supplierId: 'supplier',
    entityId: 'entity',
    itemId: 'item',
    purchaseId: 'purchase',
    requisitionId: 'purchaseRequisition',
  }
  if (field in specials) return specials[field]
  // Generic: xxxId → xxx (lowercase first char)
  if (/Id$/.test(field)) {
    const base = field.slice(0, -2)
    return base.charAt(0).toLowerCase() + base.slice(1)
  }
  return null
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { slug, id, data } = body
  if (!slug || !RESOURCES[slug] || !id) {
    return NextResponse.json({ error: 'Missing slug or id' }, { status: 400 })
  }
  const cfg = RESOURCES[slug]
  if (!cfg.updatable) {
    return NextResponse.json({ error: 'Not updatable' }, { status: 403 })
  }
  // @ts-expect-error dynamic model access
  const model = db[cfg.model]
  try {
    // Same sanitization as POST: empty strings on FK fields → undefined.
    const sanitizedData = sanitizePayload({ ...data })
    const row = await model.update({ where: { id }, data: sanitizedData, include: cfg.include })
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const id = searchParams.get('id')
  if (!slug || !RESOURCES[slug] || !id) {
    return NextResponse.json({ error: 'Missing slug or id' }, { status: 400 })
  }
  const cfg = RESOURCES[slug]
  if (!cfg.deletable) {
    return NextResponse.json({ error: 'Not deletable' }, { status: 403 })
  }
  // @ts-expect-error dynamic model access
  const model = db[cfg.model]
  try {
    // Use cascade delete for resources with foreign key relations
    switch (slug) {
      case 'entities':
        await deleteEntityCascade(id)
        break
      case 'departments':
        await deleteDepartmentCascade(id)
        break
      case 'employees':
        await deleteEmployeeCascade(id)
        break
      case 'items':
        await deleteItemCascade(id)
        break
      case 'categories':
        await deleteCategoryCascade(id)
        break
      case 'suppliers':
        await deleteSupplierCascade(id)
        break
      default:
        // For other resources, try direct delete
        await model.delete({ where: { id } })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    // Return 409 Conflict for constraint errors (data exists, can't delete)
    const msg = e.message || 'Failed to delete'
    if (msg.includes('delete করা যাবে না') || msg.includes('delete করার আগে') || msg.includes('FOREIGN KEY')) {
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
