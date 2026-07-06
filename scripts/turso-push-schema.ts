// Push SQL schema to Turso using @libsql/client
import { createClient } from '@libsql/client'
import fs from 'fs'

const TURSO_URL = 'libsql://dfcl-it-akash9090.aws-ap-south-1.turso.io'
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJWaFVWakhrekVmR19keTV6Vkt1d193Iiwib3JnX2lkIjoxMDAwMTg0MDY3fQ.h8-1QyAULP2YU9Q16D89lCg63H_FGJ2Nbn8LRWhdwyPqkiLV1C9loS8GZAfY1nF3RmfMSdPLiVTRDQH-em8FDQ'

const sql = fs.readFileSync('/tmp/schema.sql', 'utf-8')

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
})

// Split by semicolons but ignore those inside strings
function splitSql(sqlText: string): string[] {
  const statements: string[] = []
  let current = ''
  let inString = false
  for (let i = 0; i < sqlText.length; i++) {
    const ch = sqlText[i]
    current += ch
    if (ch === "'") inString = !inString
    if (ch === ';' && !inString) {
      const stmt = current.trim()
      if (stmt && !stmt.startsWith('--')) statements.push(stmt)
      current = ''
    }
  }
  return statements
}

async function main() {
  const statements = splitSql(sql)
  console.log(`Executing ${statements.length} SQL statements...`)
  let ok = 0, failed = 0
  for (const stmt of statements) {
    try {
      await client.execute(stmt)
      ok++
    } catch (e: any) {
      // Skip "table already exists" errors
      if (e.message.includes('already exists')) {
        ok++
      } else {
        console.error('FAILED:', stmt.substring(0, 80), '→', e.message.substring(0, 100))
        failed++
      }
    }
  }
  console.log(`Done: ${ok} succeeded, ${failed} failed`)

  // Verify tables
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  console.log('\n=== Tables in Turso DB ===')
  for (const row of tables.rows) {
    console.log(' -', row.name)
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
