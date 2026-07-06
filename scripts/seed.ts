// Seed script - populate demo data for the inventory system
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth-server'
import { ALL_MODULES } from '../src/lib/auth'

async function main() {
  console.log('Seeding...')

  // 1. Entities (multi-level)
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

  // 2. Departments
  const depSales = await db.department.create({ data: { name: 'Sales', shortCode: 'SAL', entityId: hq.id } })
  const depPurchase = await db.department.create({ data: { name: 'Purchase', shortCode: 'PUR', entityId: hq.id } })
  const depAccounts = await db.department.create({ data: { name: 'Accounts', shortCode: 'ACC', entityId: hq.id } })
  await db.department.create({ data: { name: 'Store', shortCode: 'STR', entityId: warehouse.id } })

  // 3. Employees
  const emp1 = await db.employee.create({ data: { name: 'Rahim Uddin', employeeCode: 'EMP-001', designation: 'Sales Manager', phone: '+8801911111111', departmentId: depSales.id, entityId: hq.id } })
  const emp2 = await db.employee.create({ data: { name: 'Karim Hossain', employeeCode: 'EMP-002', designation: 'Purchase Officer', phone: '+8801922222222', departmentId: depPurchase.id, entityId: hq.id } })
  await db.employee.create({ data: { name: 'Salma Akter', employeeCode: 'EMP-003', designation: 'Accountant', phone: '+8801933333333', departmentId: depAccounts.id, entityId: hq.id } })

  // 4. UoM
  const pcs = await db.uoM.create({ data: { name: 'Pieces', shortCode: 'PCS' } })
  await db.uoM.create({ data: { name: 'Box', shortCode: 'BOX' } })
  await db.uoM.create({ data: { name: 'Set', shortCode: 'SET' } })

  // 5. Suppliers
  await db.supplier.create({ data: { name: 'Tech Distributors BD', shortCode: 'TDB', phone: '+8801555555555', email: 'sales@tdb.bd', address: 'Elephant Road, Dhaka', entityId: hq.id } })
  await db.supplier.create({ data: { name: 'Mobile World Ltd', shortCode: 'MWL', phone: '+8801666666666', email: 'info@mwl.bd', address: 'Nawabpur, Dhaka', entityId: hq.id } })

  // NOTE: Categories, Sub-Categories, Items, Serials — admin will create from scratch
  // (No pre-seeded category data)

  // 6. News ticker
  await db.newsTicker.create({ data: { message: 'Welcome to InventoryPro - Stock managed by Barcode & Serial Number', sortOrder: 1 } })
  await db.newsTicker.create({ data: { message: 'Create categories & items from Company Setup menu', sortOrder: 2 } })
  await db.newsTicker.create({ data: { message: 'Assign entity access to users from Manage Permissions', sortOrder: 3 } })

  // 7. Some accounts entries
  await db.accountEntry.create({ data: { entryNo: 'EXP-0001', entityId: hq.id, type: 'EXPENSE', category: 'RENT', amount: 35000, method: 'BANK', description: 'Office rent for July' } })
  await db.accountEntry.create({ data: { entryNo: 'EXP-0002', entityId: hq.id, type: 'EXPENSE', category: 'UTILITIES', amount: 4800, method: 'CASH', description: 'Electricity bill' } })
  await db.accountEntry.create({ data: { entryNo: 'RCV-0001', entityId: hq.id, type: 'RECEIVE', category: 'SALES_PAYMENT', amount: 125000, method: 'BANK', description: 'Bulk sales payment received' } })

  // 8. Admin user (full permissions, all entities)
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
  // Admin: assign ALL entities
  for (const e of [hq, branch1, branch2, warehouse]) {
    await db.userEntity.create({ data: { userId: admin.id, entityId: e.id } })
  }

  // 9. Sales user (limited permissions, assigned to Dhaka Showroom only)
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
  // Sales user: assign only Dhaka Showroom
  await db.userEntity.create({ data: { userId: salesUser.id, entityId: branch1.id } })

  console.log('Seed complete.')
  console.log('  Admin login:    admin / admin123  (all entities, all permissions)')
  console.log('  Sales login:    sales / sales123  (Dhaka Showroom only, limited permissions)')
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
