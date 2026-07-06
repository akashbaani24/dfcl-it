// Generic resource CRUD API
// GET    /api/resource?slug=entities                    -> list
// GET    /api/resource?slug=entities&id=xxx             -> get one
// POST   /api/resource { slug, data }                   -> create
// PATCH  /api/resource { slug, id, data }               -> update
// DELETE /api/resource?slug=entities&id=xxx             -> delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { RESOURCES, generateNumber, buildWhere } from '@/lib/resources'
import { getCurrentUser, getUserEntityIds } from '@/lib/auth-server'
import {
  deleteEntityCascade, deleteEmployeeCascade, deleteDepartmentCascade,
  deleteItemCascade, deleteUserCascade, deleteCategoryCascade, deleteSupplierCascade,
} from '@/lib/cascade-delete'

// Resources that have an entityId field (need entity filtering for non-admin)
const ENTITY_FILTERED_RESOURCES = new Set([
  'entities', 'departments', 'employees', 'suppliers',
  'purchase-requisitions', 'purchases', 'purchase-returns',
  'internal-transfers', 'adjustments', 'stock-transactions',
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
      const [rows, total] = await Promise.all([
        model.findMany({
          where,
          include: cfg.include,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
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
    const rows = await model.findMany({ where, include: cfg.include, orderBy: { createdAt: 'desc' } })
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
    const payload = { ...data }
    if (cfg.autoNumberField && cfg.autoNumberPrefix && !payload[cfg.autoNumberField]) {
      payload[cfg.autoNumberField] = await generateNumber(cfg.autoNumberPrefix)
    }
    const row = await model.create({ data: payload, include: cfg.include })
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
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
    const row = await model.update({ where: { id }, data, include: cfg.include })
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
