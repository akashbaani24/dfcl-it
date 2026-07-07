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
    sql: 'ALTER TABLE Purchase ADD COLUMN shippingEntityId TEXT',
    reason: 'Stores which entity will receive the stock when a PurchaseReceive is approved. Falls back to entityId for legacy rows.',
  },
  {
    table: 'PurchaseItem',
    column: 'serials',
    sql: 'ALTER TABLE PurchaseItem ADD COLUMN serials TEXT',
    reason: 'Comma-separated serial numbers entered for this purchase line item.',
  },
  {
    table: 'Employee',
    column: 'photo',
    sql: 'ALTER TABLE Employee ADD COLUMN photo TEXT',
    reason: 'Base64 data URL of employee photo.',
  },
  {
    table: 'Purchase',
    column: 'attachments',
    sql: 'ALTER TABLE Purchase ADD COLUMN attachments TEXT',
    reason: 'JSON array of base64 data URLs (receipts, invoices, etc.).',
  },
  {
    table: 'AccountEntry',
    column: 'attachments',
    sql: 'ALTER TABLE AccountEntry ADD COLUMN attachments TEXT',
    reason: 'JSON array of base64 data URLs (bills, receipts, etc.).',
  },
  // Add future migrations here as needed.
]

// Tables that need to be created (not just columns added). These run
// BEFORE the column migrations. Each is idempotent (CREATE TABLE IF NOT EXISTS).
const TABLE_MIGRATIONS: Array<{ table: string; sql: string; indexes?: string[] }> = [
  {
    table: 'SequentialNumber',
    sql: `CREATE TABLE IF NOT EXISTS SequentialNumber (
      id TEXT PRIMARY KEY NOT NULL,
      docType TEXT NOT NULL,
      yymmdd TEXT NOT NULL,
      lastSeq INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    indexes: [
      'CREATE UNIQUE INDEX IF NOT EXISTS SequentialNumber_docType_yymmdd_idx ON SequentialNumber(docType, yymmdd)',
      'CREATE INDEX IF NOT EXISTS SequentialNumber_docType_idx ON SequentialNumber(docType)',
    ],
  },
]

export async function GET(req: NextRequest) {
  const auto = req.nextUrl.searchParams.get('auto') === '1'
  const results: Array<{ table: string; column: string; status: 'exists' | 'added' | 'failed'; error?: string }> = []

  // 1. Run table-creation migrations first (CREATE TABLE IF NOT EXISTS)
  for (const tm of TABLE_MIGRATIONS) {
    try {
      await db.$executeRawUnsafe(tm.sql)
      results.push({ table: tm.table, column: '(table)', status: 'exists' })
      // Create indexes
      if (tm.indexes) {
        for (const idx of tm.indexes) {
          try { await db.$executeRawUnsafe(idx) } catch {}
        }
      }
    } catch (e: any) {
      const msg = e.message || ''
      if (msg.includes('already exists')) {
        results.push({ table: tm.table, column: '(table)', status: 'exists' })
      } else {
        console.error(`[migrate] table creation failed for ${tm.table}:`, msg)
        results.push({ table: tm.table, column: '(table)', status: 'failed', error: msg })
      }
    }
  }

  // 2. Run column-addition migrations
  for (const migration of MIGRATIONS) {
    try {
      // Check if the column already exists using PRAGMA table_info
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
