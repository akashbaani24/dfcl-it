// Auto-migration endpoint — adds missing columns to the production database.
//
// WHY THIS EXISTS
// ---------------
// On Vercel, we can't run `prisma db push` interactively. When we add a new
// column to schema.prisma (like `shippingEntityId` on Purchase), the local
// SQLite gets it via `prisma db push`, but the production Turso DB doesn't
// until someone manually pushes the schema. This endpoint lets the app
// self-heal: it checks for known columns and adds them via raw SQL if missing.
//
// USAGE
// -----
//   GET /api/migrate           → checks which migrations are needed, runs them
//   GET /api/migrate?auto=1    → same, but called automatically by the app
//
// This is idempotent — safe to call multiple times. SQLite's ALTER TABLE
// ADD COLUMN will error with "duplicate column name" if it already exists,
// which we catch and ignore.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// List of migrations to check/run. Each migration is a tuple of
// (tableName, columnName, alterSql). We check if the column exists first
// using PRAGMA table_info, so we only run ALTER TABLE when needed.
type Migration = {
  table: string
  column: string
  // The ALTER TABLE statement to add the column if missing
  sql: string
  // Human-readable description of why this column exists
  reason: string
}

const MIGRATIONS: Migration[] = [
  {
    table: 'Purchase',
    column: 'shippingEntityId',
    // Add the column WITHOUT a REFERENCES constraint first. SQLite doesn't
    // support adding FK constraints via ALTER TABLE ADD COLUMN reliably
    // across all versions, so we add it as plain TEXT. Prisma's generated
    // client will still send the value, and SQLite will store it. The FK
    // enforcement happens at the Prisma level (pre-flight validation).
    sql: 'ALTER TABLE Purchase ADD COLUMN shippingEntityId TEXT',
    reason: 'Stores which entity will receive the stock when a PurchaseReceive is approved. Falls back to entityId for legacy rows.',
  },
  // Add future migrations here as needed.
]

export async function GET(req: NextRequest) {
  const auto = req.nextUrl.searchParams.get('auto') === '1'
  const results: Array<{ table: string; column: string; status: 'exists' | 'added' | 'failed'; error?: string }> = []

  for (const migration of MIGRATIONS) {
    try {
      // Check if the column already exists using PRAGMA table_info
      // This returns rows like: { name: 'id', type: 'TEXT', ... }
      const columns: any[] = await db.$queryRawUnsafe(
        `PRAGMA table_info(${migration.table})`
      )
      const colNames = columns.map((c: any) => c.name)
      const exists = colNames.includes(migration.column)

      if (exists) {
        results.push({ table: migration.table, column: migration.column, status: 'exists' })
        continue
      }

      // Column is missing — add it
      await db.$executeRawUnsafe(migration.sql)
      results.push({ table: migration.table, column: migration.column, status: 'added' })
    } catch (e: any) {
      // If the error is "duplicate column name", the column already exists —
      // treat as success. Otherwise log the real error.
      const msg = e.message || ''
      if (msg.includes('duplicate column name') || msg.includes('already exists')) {
        results.push({ table: migration.table, column: migration.column, status: 'exists' })
      } else {
        console.error(`[migrate] failed for ${migration.table}.${migration.column}:`, msg)
        results.push({ table: migration.table, column: migration.column, status: 'failed', error: msg })
      }
    }
  }

  const added = results.filter((r) => r.status === 'added').length
  const failed = results.filter((r) => r.status === 'failed').length
  const existed = results.filter((r) => r.status === 'exists').length

  console.log(`[migrate] ${auto ? '(auto) ' : ''}complete: ${existed} existed, ${added} added, ${failed} failed`)

  return NextResponse.json({
    ok: failed === 0,
    summary: { existed, added, failed, total: results.length },
    migrations: results,
  })
}
