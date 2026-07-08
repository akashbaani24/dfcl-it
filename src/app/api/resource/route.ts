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
        // Internal Transfers access control:
        //   - Default (no filter param): show transfers where the user's
        //     entity is EITHER the source OR the destination. This is the
        //     "Transfers" page view — you see what you sent and what you
        //     will receive.
        //   - ?toEntity=1: show ONLY transfers where the user's entity is
        //     the DESTINATION (To Entity). Used by the Internal Receive
        //     page so destination entities only see transfers coming TO
        //     them — they cannot see transfers between other entities.
        //   - ?fromEntity=1: show ONLY transfers where the user's entity
        //     is the SOURCE (From Entity). Used by the Internal Transfers
        //     list page to show only outgoing transfers.
        const toOnly = searchParams.get('toEntity') === '1'
        const fromOnly = searchParams.get('fromEntity') === '1'
        if (toOnly) {
          where.toEntityId = { in: entityFilter }
        } else if (fromOnly) {
          where.fromEntityId = { in: entityFilter }
        } else {
          where.OR = [
            { fromEntityId: { in: entityFilter } },
            { toEntityId: { in: entityFilter } },
          ]
        }
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
      payload[cfg.autoNumberField] = await generateNumber(cfg.autoNumberPrefix, cfg.docType)
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

    let row
    try {
      row = await model.create({ data: payload, include: cfg.include })
    } catch (createErr: any) {
      // Self-healing: if the error is "column does not exist", it means the
      // production DB schema is out of date (e.g. we added `shippingEntityId`
      // to schema.prisma but haven't pushed the schema to Turso yet). Run
      // the auto-migration and retry once.
      const createMsg = createErr.message || ''
      if (createMsg.includes('does not exist in the current database') || createMsg.includes('no such column')) {
        console.error('[resource POST] column missing — running auto-migration and retrying...')
        try {
          await fetch(`${req.nextUrl.origin}/api/migrate?auto=1`)
        } catch (migErr: any) {
          console.error('[resource POST] auto-migration failed:', migErr.message)
        }
        // Retry the create after migration
        row = await model.create({ data: payload, include: cfg.include })
      } else {
        throw createErr
      }
    }
    return NextResponse.json(row)
  } catch (e: any) {
    // Log the full error + payload (minus line items) so we can diagnose
    // exactly which FK field is failing. The generic SQLite FK error doesn't
    // tell you which column is the problem, so this log is critical.
    console.error('[resource POST] create failed for slug=', slug)
    console.error('[resource POST] error:', e.message)
    console.error('[resource POST] error code:', e.code)
    console.error('[resource POST] error meta:', JSON.stringify(e.meta))
    try {
      const safeLog = { ...data }
      if (safeLog.items) safeLog.items = `[${Array.isArray(data.items?.create) ? data.items.create.length : 0} items]`
      console.error('[resource POST] payload keys:', Object.keys(data || {}))
      console.error('[resource POST] payload (truncated):', JSON.stringify(safeLog).slice(0, 500))
      // Log each FK field's value for debugging
      const fkFields = Object.keys(data || {}).filter(k => /Id$/.test(k) || k === 'refId')
      console.error('[resource POST] FK fields in payload:', fkFields.map(k => `${k}=${data[k] || 'undefined'}`).join(', '))
      // Log line item itemIds
      if (data?.items?.create) {
        console.error('[resource POST] line item itemIds:', data.items.create.map((it: any, i: number) => `[${i}] itemId=${it.itemId || 'MISSING'}`).join(', '))
      }
    } catch {}

    // If this is STILL a FK constraint error (pre-flight missed something),
    // do a POST-FAILURE diagnostic: re-check ALL FK fields and report
    // exactly which one is invalid. This gives the user a clear, actionable
    // message instead of the generic "FOREIGN KEY constraint failed".
    const msg = e.message || ''
    if (msg.includes('FOREIGN KEY constraint') || msg.includes('foreign key constraint') || msg.includes('ForeignKeyConstraint') || e.code === 'P2003') {
      // Re-check all FK references to find the culprit
      const diagnostic = await diagnoseFkFailure(slug, payload)
      console.error('[resource POST] post-failure diagnostic:', JSON.stringify(diagnostic))

      if (diagnostic.invalid.length > 0) {
        // Found the invalid FK(s) — report them clearly
        const details = diagnostic.invalid.map((d) => `${d.field}="${d.id}" does not exist in ${d.model}`).join('; ')
        return NextResponse.json({
          error: `রেফারেন্স ভুল: ${details}। অনুগ্রহ করে পেজ রিফ্রেশ করে আবার চেষ্টা করুন। (Reference error: ${details}. Please refresh and reselect.)`,
          slug,
          diagnostic,
        }, { status: 400 })
      }

      // All FKs are valid but create still failed — this might be a schema
      // issue (e.g. the shippingEntityId column was added without REFERENCES
      // but Prisma is checking it). Suggest running migration.
      return NextResponse.json({
        error: 'সব রেফারেন্স সঠিক কিন্তু তবুও ত্রুটি হচ্ছে। এটি ডাটাবেস স্কিমার সমস্যা হতে পারে। অনুগ্রহ করে /api/migrate ভিজিট করুন অথবা পেজ রিফ্রেশ করে আবার চেষ্টা করুন। (All references are valid but create still failed. This may be a database schema issue. Visit /api/migrate or refresh and retry.)',
        slug,
        diagnostic,
        fkValues: diagnostic.checked.map((d) => ({ field: d.field, id: d.id, exists: d.exists })),
        hint: 'If this persists, visit /api/migrate to ensure the database schema is up to date.',
      }, { status: 400 })
    }

    return NextResponse.json({ error: e.message, slug, hint: 'Check server logs for which FK field is invalid' }, { status: 500 })
  }
}

/**
 * Post-failure diagnostic: after a FK constraint error, re-check ALL FK
 * references in the payload and report which ones are valid/invalid.
 *
 * This is called when the pre-flight validation passed (all FKs were valid)
 * but the Prisma create still threw a FK error. This can happen due to:
 *   - Race conditions (record deleted between pre-flight and create)
 *   - Schema mismatches (column added without FK constraint)
 *   - Prisma internal behavior we don't fully understand
 *
 * Returns an object with:
 *   - checked: all FK fields that were checked, with their existence status
 *   - invalid: only the invalid ones (empty if all are valid)
 */
async function diagnoseFkFailure(slug: string, payload: any): Promise<{
  checked: Array<{ field: string; id: string; model: string; context: string; exists: boolean }>
  invalid: Array<{ field: string; id: string; model: string; context: string }>
}> {
  const checked: Array<{ field: string; id: string; model: string; context: string; exists: boolean }> = []
  const invalid: Array<{ field: string; id: string; model: string; context: string }> = []

  function collect(obj: any, context: string) {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => collect(item, `${context}[${i}]`))
      return
    }
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value && (/Id$/.test(key) || key === 'refId')) {
        const modelName = fkFieldToModel(key)
        if (modelName) {
          checked.push({ field: key, id: value, model: modelName, context, exists: false })
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        collect(value, `${context}.${key}`)
      } else if (Array.isArray(value)) {
        collect(value, `${context}.${key}`)
      }
    }
  }

  collect(payload, slug)

  // Check each reference in PARALLEL (same N+1 fix as validateFkReferences).
  await Promise.all(checked.map(async (ref) => {
    try {
      // @ts-expect-error dynamic model access
      const m = db[ref.model]
      if (!m || !m.findUnique) {
        ref.exists = true // can't check, assume valid
        return
      }
      const row = await m.findUnique({ where: { id: ref.id }, select: { id: true } })
      ref.exists = !!row
      if (!row) {
        invalid.push({ field: ref.field, id: ref.id, model: ref.model, context: ref.context })
      }
    } catch (e: any) {
      console.error('[diagnoseFkFailure] error checking', ref, e.message)
      ref.exists = true // can't check, assume valid
    }
  }))

  return { checked, invalid }
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

  if (refs.length === 0) return null

  // Verify each reference exists in the DB — run all checks in PARALLEL
  // instead of sequentially. Previously this was an N+1 `for...await` loop
  // where each findUnique waited for the previous one; with N FK fields that
  // meant N sequential round-trips to Turso. Promise.all fans them out so the
  // total latency is ~1 round-trip (bounded by the slowest single query).
  const results = await Promise.all(refs.map(async (ref) => {
    try {
      // @ts-expect-error dynamic model access
      const m = db[ref.model]
      if (!m || !m.findUnique) return null // can't check, assume valid
      const row = await m.findUnique({ where: { id: ref.id }, select: { id: true } })
      return row ? null : ref // return the ref if it does NOT exist
    } catch (e: any) {
      // If the model lookup fails for some reason, skip pre-flight and let Prisma handle it
      console.error('[validateFkReferences] skip', ref, e.message)
      return null
    }
  }))
  const failed = results.find((r) => r !== null)
  if (failed) {
    return `${failed.field}="${failed.id}" does not exist in ${failed.model} (at ${failed.context}). ` +
           `Please refresh the page and reselect the ${failed.field.replace(/Id$/, '').toLowerCase()}.`
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
