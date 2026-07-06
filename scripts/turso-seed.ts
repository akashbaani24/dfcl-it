// Push SQL schema + seed data to Turso
import { createClient } from '@libsql/client'
import fs from 'fs'
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth-server'
import { ALL_MODULES } from '../src/lib/auth'

const TURSO_URL = 'libsql://dfcl-it-akash9090.aws-ap-south-1.turso.io'
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MzAyNTUzNTYsImlhdCI6MTc4MzM0MDE1NiwiaWQiOiIwMTlmMzcyMC1jNDAxLTczNTYtYWFkZS0yZGE3ZTJkZTBkYTMiLCJraWQiOiI5QVVJRC12LWQ0ZmJUUXkyNFJUcGcwZWhNTndfSi1FSDBVWWIwUElQNzBNIiwicmlkIjoiYmY0MmI1OWYtMmZkOC00OGQzLTgzYWEtZjBlMTAxYmUzYzUwIn0.6ex67WzHJadwkpEaaldQsx5U8Ct9qI-rYyEJjcaza0eMAKcP8U4Lkq49SJws1AvOSk8cqRDjOqnM45z--Ia5Dg'

const sql = fs.readFileSync('/tmp/schema.sql', 'utf-8')

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
})

function splitSql(sqlText: string): string[] {
  // Remove comment lines first
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

async function pushSchema() {
  console.log('=== Pushing schema ===')
  const statements = splitSql(sql)
  console.log(`Total statements: ${statements.length}`)
  let ok = 0, skipped = 0, failed = 0
  for (const stmt of statements) {
    try {
      await client.execute(stmt)
      ok++
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        skipped++
      } else {
        console.error('FAILED:', stmt.substring(0, 80), '→', e.message.substring(0, 100))
        failed++
      }
    }
  }
  console.log(`✅ Schema pushed: ${ok} created, ${skipped} already existed, ${failed} failed`)

  // Verify
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  console.log(`\n=== Tables in Turso (${tables.rows.length}) ===`)
  for (const row of tables.rows) {
    console.log(' -', row.name)
  }
}

async function seed() {
  console.log('\n=== Seeding demo data via Prisma ===')
  console.log('Seeding...')

  const hq = await db.entity.create({
    data: {
      name: 'Main Head Office',
      shortCode: 'HQ',
      address: 'Plot 12, Gulshan 1, Dhaka',
      phone: '+8801711111111',
      email: 'hq@invco.bd',
    },
  })
  const branch1 = await db.entity.create({
    data: {
      name: 'Dhaka Showroom',
      shortCode: 'DHK-SR',
      parentId: hq.id,
      address: 'Banani 11, Dhaka',
      phone: '+8801722222222',
    },
  })
  const branch2 = await db.entity.create({
    data: {
      name: 'Chittagong Branch',
      shortCode: 'CTG-BR',
      parentId: hq.id,
      address: 'Agrabad CDA Ave, Chittagong',
      phone: '+8801733333333',
    },
  })
  const warehouse = await db.entity.create({
    data: {
      name: 'Central Warehouse',
      shortCode: 'WH-1',
      parentId: hq.id,
      address: 'Tejgaon I/A, Dhaka',
      phone: '+8801744444444',
    },
  })

  const depSales = await db.department.create({ data: { name: 'Sales', shortCode: 'SAL', entityId: hq.id } })
  const depPurchase = await db.department.create({ data: { name: 'Purchase', shortCode: 'PUR', entityId: hq.id } })
  const depAccounts = await db.department.create({ data: { name: 'Accounts', shortCode: 'ACC', entityId: hq.id } })
  await db.department.create({ data: { name: 'Store', shortCode: 'STR', entityId: warehouse.id } })

  const emp1 = await db.employee.create({ data: { name: 'Rahim Uddin', employeeCode: 'EMP-001', designation: 'Sales Manager', phone: '+8801911111111', departmentId: depSales.id, entityId: hq.id } })
  const emp2 = await db.employee.create({ data: { name: 'Karim Hossain', employeeCode: 'EMP-002', designation: 'Purchase Officer', phone: '+8801922222222', departmentId: depPurchase.id, entityId: hq.id } })
  await db.employee.create({ data: { name: 'Salma Akter', employeeCode: 'EMP-003', designation: 'Accountant', phone: '+8801933333333', departmentId: depAccounts.id, entityId: hq.id } })

  await db.uoM.create({ data: { name: 'Pieces', shortCode: 'PCS' } })
  await db.uoM.create({ data: { name: 'Box', shortCode: 'BOX' } })
  await db.uoM.create({ data: { name: 'Set', shortCode: 'SET' } })

  await db.supplier.create({ data: { name: 'Tech Distributors BD', shortCode: 'TDB', phone: '+8801555555555', email: 'sales@tdb.bd', address: 'Elephant Road, Dhaka', entityId: hq.id } })
  await db.supplier.create({ data: { name: 'Mobile World Ltd', shortCode: 'MWL', phone: '+8801666666666', email: 'info@mwl.bd', address: 'Nawabpur, Dhaka', entityId: hq.id } })

  await db.newsTicker.create({ data: { message: 'Welcome to DFCL-IT (Test System) - Stock managed by Barcode & Serial Number', sortOrder: 1 } })
  await db.newsTicker.create({ data: { message: 'Create categories & items from Company Setup menu', sortOrder: 2 } })
  await db.newsTicker.create({ data: { message: 'Assign entity access to users from Manage Permissions', sortOrder: 3 } })

  await db.accountEntry.create({ data: { entryNo: 'EXP-0001', entityId: hq.id, type: 'EXPENSE', category: 'RENT', amount: 35000, method: 'BANK', description: 'Office rent for July' } })
  await db.accountEntry.create({ data: { entryNo: 'EXP-0002', entityId: hq.id, type: 'EXPENSE', category: 'UTILITIES', amount: 4800, method: 'CASH', description: 'Electricity bill' } })
  await db.accountEntry.create({ data: { entryNo: 'RCV-0001', entityId: hq.id, type: 'RECEIVE', category: 'SALES_PAYMENT', amount: 125000, method: 'BANK', description: 'Bulk sales payment received' } })

  // Admin user
  const admin = await db.user.create({
    data: {
      userId: 'admin',
      password: hashPassword('admin123'),
      employeeId: emp1.id,
      role: 'ADMIN',
      isActive: true,
    },
  })
  for (const m of ALL_MODULES) {
    await db.permission.create({
      data: {
        userId: admin.id,
        module: m.key,
        canView: true, canCreate: true, canEdit: true, canDelete: true,
        canUpdate: true, canExcel: true, canPdf: true,
      },
    })
  }
  for (const e of [hq, branch1, branch2, warehouse]) {
    await db.userEntity.create({ data: { userId: admin.id, entityId: e.id } })
  }

  // Sales user
  const salesUser = await db.user.create({
    data: {
      userId: 'sales',
      password: hashPassword('sales123'),
      employeeId: emp2.id,
      role: 'USER',
      isActive: true,
    },
  })
  const salesPerms: Record<string, any> = {
    'dashboard': { canView: true, canExcel: true, canPdf: true },
    'sales': { canView: true, canCreate: true, canEdit: true, canExcel: true, canPdf: true },
    'sales-delivery': { canView: true, canUpdate: true },
    'sales-returns': { canView: true, canCreate: true },
    'sales-refunds': { canView: true, canCreate: true },
    'stock-all': { canView: true },
    'stock-mine': { canView: true },
    'reports-sales': { canView: true, canExcel: true, canPdf: true },
    'reports-stock': { canView: true },
    'reports-serial': { canView: true },
    'items': { canView: true },
  }
  for (const [module, flags] of Object.entries(salesPerms)) {
    await db.permission.create({
      data: {
        userId: salesUser.id,
        module,
        canView: !!flags.canView,
        canCreate: !!flags.canCreate,
        canEdit: !!flags.canEdit,
        canDelete: !!flags.canDelete,
        canUpdate: !!flags.canUpdate,
        canExcel: !!flags.canExcel,
        canPdf: !!flags.canPdf,
      },
    })
  }
  await db.userEntity.create({ data: { userId: salesUser.id, entityId: branch1.id } })

  console.log('✅ Seed complete!')
  console.log('  Admin: admin / admin123 (all entities, all permissions)')
  console.log('  Sales: sales / sales123 (Dhaka Showroom only, limited)')
}

async function main() {
  await pushSchema()
  await seed()
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
