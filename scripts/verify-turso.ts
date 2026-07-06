// Verify Turso has all data
import { createClient } from '@libsql/client'

async function main() {
  const client = createClient({
    url: 'libsql://dfcl-it-akash9090.aws-ap-south-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MzAyNTUzNTYsImlhdCI6MTc4MzM0MDE1NiwiaWQiOiIwMTlmMzcyMC1jNDAxLTczNTYtYWFkZS0yZGE3ZTJkZTBkYTMiLCJraWQiOiI5QVVJRC12LWQ0ZmJUUXkyNFJUcGcwZWhNTndfSi1FSDBVWWIwUElQNzBNIiwicmlkIjoiYmY0MmI1OWYtMmZkOC00OGQzLTgzYWEtZjBlMTAxYmUzYzUwIn0.6ex67WzHJadwkpEaaldQsx5U8Ct9qI-rYyEJjcaza0eMAKcP8U4Lkq49SJws1AvOSk8cqRDjOqnM45z--Ia5Dg',
  })

  const checks = [
    { table: 'Entity', label: 'Entities' },
    { table: 'Department', label: 'Departments' },
    { table: 'Employee', label: 'Employees' },
    { table: 'UoM', label: 'Units of Measure' },
    { table: 'Supplier', label: 'Suppliers' },
    { table: 'NewsTicker', label: 'News Tickers' },
    { table: 'AccountEntry', label: 'Account Entries' },
    { table: 'User', label: 'Users' },
    { table: 'Permission', label: 'Permissions' },
    { table: 'UserEntity', label: 'User-Entity Assignments' },
  ]

  console.log('=== Turso Database Verification ===\n')
  let total = 0
  for (const c of checks) {
    const r = await client.execute(`SELECT COUNT(*) as count FROM "${c.table}"`)
    const count = Number((r.rows[0] as any).count)
    total += count
    console.log(`  ${c.label.padEnd(25)} : ${count}`)
  }
  console.log(`\n  ${'TOTAL RECORDS'.padEnd(25)} : ${total}`)

  // Show admin user
  console.log('\n=== Admin User ===')
  const users = await client.execute("SELECT userId, role, isActive FROM User")
  for (const row of users.rows) {
    console.log(`  - ${row.userId} (${row.role}) - ${row.isActive ? 'Active' : 'Inactive'}`)
  }
}

main()
