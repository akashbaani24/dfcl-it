// Drop all tables + push schema fresh + seed
import { createClient } from '@libsql/client'
import fs from 'fs'

const TURSO_URL = 'libsql://dfcl-it-akash9090.aws-ap-south-1.turso.io'
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MzAyNTUzNTYsImlhdCI6MTc4MzM0MDE1NiwiaWQiOiIwMTlmMzcyMC1jNDAxLTczNTYtYWFkZS0yZGE3ZTJkZTBkYTMiLCJraWQiOiI5QVVJRC12LWQ0ZmJUUXkyNFJUcGcwZWhNTndfSi1FSDBVWWIwUElQNzBNIiwicmlkIjoiYmY0MmI1OWYtMmZkOC00OGQzLTgzYWEtZjBlMTAxYmUzYzUwIn0.6ex67WzHJadwkpEaaldQsx5U8Ct9qI-rYyEJjcaza0eMAKcP8U4Lkq49SJws1AvOSk8cqRDjOqnM45z--Ia5Dg'

const sql = fs.readFileSync('/tmp/schema.sql', 'utf-8')
const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

function splitSql(sqlText: string): string[] {
  const lines = sqlText.split('\n').filter((l) => !l.trim().startsWith('--'))
  const cleaned = lines.join('\n')
  const statements: string[] = []
  let current = ''
  let inString = false
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    current += ch
    if (ch === "'") inString = !inString
    if (ch === ';' && !inString) {
      const stmt = current.trim()
      if (stmt) statements.push(stmt)
      current = ''
    }
  }
  return statements
}

async function main() {
  // Step 1: Drop all existing tables
  console.log('=== Step 1: Drop all existing tables ===')
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'")
  for (const row of tables.rows) {
    const name = row.name as string
    console.log(`  Dropping ${name}...`)
    await client.execute(`DROP TABLE IF EXISTS "${name}"`)
  }
  console.log(`Dropped ${tables.rows.length} tables`)

  // Step 2: Push schema
  console.log('\n=== Step 2: Push schema ===')
  const statements = splitSql(sql)
  console.log(`Total statements: ${statements.length}`)
  let ok = 0, failed = 0
  for (const stmt of statements) {
    try {
      await client.execute(stmt)
      ok++
    } catch (e: any) {
      console.error('FAILED:', stmt.substring(0, 80), '→', e.message.substring(0, 100))
      failed++
    }
  }
  console.log(`✅ ${ok} succeeded, ${failed} failed`)

  // Step 3: Verify
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  console.log(`\n=== Tables created (${result.rows.length}) ===`)
  for (const row of result.rows) {
    console.log(' -', row.name)
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
