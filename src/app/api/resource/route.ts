// Generic resource CRUD API
// GET    /api/resource?slug=entities                    -> list
// GET    /api/resource?slug=entities&id=xxx             -> get one
// POST   /api/resource { slug, data }                   -> create
// PATCH  /api/resource { slug, id, data }               -> update
// DELETE /api/resource?slug=entities&id=xxx             -> delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { RESOURCES, generateNumber, buildWhere } from '@/lib/resources'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const id = searchParams.get('id')
  const search = searchParams.get('search') || undefined
  if (!slug || !RESOURCES[slug]) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 })
  }
  const cfg = RESOURCES[slug]
  // @ts-expect-error dynamic model access
  const model = db[cfg.model]
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
      } else {
        where.name = { contains: search }
      }
    }
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
    await model.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
