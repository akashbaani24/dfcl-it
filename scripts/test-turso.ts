// Test new Turso token
import { createClient } from '@libsql/client'

async function main() {
  const TURSO_URL = 'libsql://dfcl-it-akash9090.aws-ap-south-1.turso.io'
  const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MzAyNTUzNTYsImlhdCI6MTc4MzM0MDE1NiwiaWQiOiIwMTlmMzcyMC1jNDAxLTczNTYtYWFkZS0yZGE3ZTJkZTBkYTMiLCJraWQiOiI5QVVJRC12LWQ0ZmJUUXkyNFJUcGcwZWhNTndfSi1FSDBVWWIwUElQNzBNIiwicmlkIjoiYmY0MmI1OWYtMmZkOC00OGQzLTgzYWEtZjBlMTAxYmUzYzUwIn0.6ex67WzHJadwkpEaaldQsx5U8Ct9qI-rYyEJjcaza0eMAKcP8U4Lkq49SJws1AvOSk8cqRDjOqnM45z--Ia5Dg'

  console.log('=== Testing connection ===')
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  try {
    const r = await client.execute('SELECT 1 as test')
    console.log('✅ SUCCESS! Connection works.')
    console.log('Result:', r.rows[0])
  } catch (e: any) {
    console.log('❌ FAILED:', e.message)
    return
  }

  // Check existing tables
  console.log('\n=== Existing tables ===')
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  for (const row of tables.rows) {
    console.log(' -', row.name)
  }
}

main()
