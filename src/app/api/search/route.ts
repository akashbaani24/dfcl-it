// Fast typeahead search endpoint for AsyncComboBox.
//
// Returns ONLY the fields needed for a dropdown option (id, label, sublabel)
// — never the full record. This keeps payloads tiny (~1-2KB for 20 results)
// so the round-trip is fast even on slow networks.
//
// Usage:
//   GET /api/search?slug=items&q=lap&limit=20
//   → [{ id, label, sublabel }, ...]
//
// Why a separate endpoint (instead of /api/resource)?
//   1. /api/resource returns full records with relations — heavy payload.
//   2. /api/resource doesn't have a "search across multiple fields" path
//      for every resource — this endpoint centralizes that logic.
//   3. This endpoint sets aggressive cache headers (1s) so the browser
//      and CDN can dedupe rapid keystrokes.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserEntityIds } from '@/lib/auth-server'

// Per-slug search config: which fields to search, what to return as label/sublabel
type SearchConfig = {
  model: keyof typeof db
  // Fields to search with OR + contains (case-insensitive in SQLite by default)
  searchFields: string[]
  // Field to use as the dropdown label (main text)
  labelField: string
  // Field to use as the sublabel (small text on the right, e.g. itemCode)
  sublabelField?: string
  // Optional entity filter (for non-admin scoping)
  entityFiltered?: boolean
}

const SEARCH_CONFIG: Record<string, SearchConfig> = {
  'items': {
    model: 'item',
    searchFields: ['name', 'itemCode', 'barcode'],
    labelField: 'name',
    sublabelField: 'itemCode',
  },
  'entities': {
    model: 'entity',
    searchFields: ['name', 'shortCode'],
    labelField: 'name',
    sublabelField: 'shortCode',
  },
  'suppliers': {
    model: 'supplier',
    searchFields: ['name', 'shortCode', 'phone'],
    labelField: 'name',
    sublabelField: 'shortCode',
  },
  'employees': {
    model: 'employee',
    searchFields: ['name', 'employeeCode', 'phone'],
    labelField: 'name',
    sublabelField: 'employeeCode',
    entityFiltered: true,
  },
  'categories': {
    model: 'category',
    searchFields: ['name'],
    labelField: 'name',
  },
  'uoms': {
    model: 'uoM',
    searchFields: ['name', 'shortCode'],
    labelField: 'name',
    sublabelField: 'shortCode',
  },
  'departments': {
    model: 'department',
    searchFields: ['name', 'shortCode'],
    labelField: 'name',
    sublabelField: 'shortCode',
    entityFiltered: true,
  },
  'customers': {
    model: 'customer',
    searchFields: ['name', 'phone'],
    labelField: 'name',
    sublabelField: 'phone',
  },
  'account-types': {
    model: 'accountType',
    searchFields: ['name', 'shortCode'],
    labelField: 'name',
    sublabelField: 'shortCode',
  },
  'bank-infos': {
    model: 'bankInfo',
    searchFields: ['bankName', 'accountName', 'accountNumber'],
    labelField: 'bankName',
    sublabelField: 'accountNumber',
  },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100) // cap at 100

  if (!slug || !SEARCH_CONFIG[slug]) {
    return NextResponse.json({ error: 'Unknown search slug' }, { status: 400 })
  }

  const cfg = SEARCH_CONFIG[slug]
  // @ts-expect-error dynamic model access
  const model = db[cfg.model]

  // Build the where clause
  const where: any = {}

  // Apply search query across all configured search fields
  if (q) {
    where.OR = cfg.searchFields.map((field) => ({
      [field]: { contains: q },
    }))
  }

  // Entity access control for non-admin users
  if (cfg.entityFiltered) {
    const currentUser = await getCurrentUser()
    if (currentUser && currentUser.role !== 'ADMIN') {
      const entityIds = await getUserEntityIds(currentUser.id)
      if (entityIds.length === 0) {
        return NextResponse.json([])
      }
      where.entityId = { in: entityIds }
    }
  }

  try {
    // Select only the fields we need — keeps the SQL query and payload tiny
    const select: any = { id: true }
    select[cfg.labelField] = true
    if (cfg.sublabelField) select[cfg.sublabelField] = true

    const rows = await model.findMany({
      where,
      select,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    // Map to { id, label, sublabel }
    const results = rows.map((r: any) => ({
      id: r.id,
      label: r[cfg.labelField] || '',
      sublabel: cfg.sublabelField ? (r[cfg.sublabelField] || '') : undefined,
    }))

    // Set a 1-second cache header so rapid keystrokes (200ms debounce) can
    // dedupe on the browser side via the fetch cache.
    const res = NextResponse.json(results)
    res.headers.set('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=5')
    return res
  } catch (e: any) {
    console.error('[search] error for slug=', slug, e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
