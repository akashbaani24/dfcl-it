// Seed script - populate demo data for the inventory system
import { db } from '../src/lib/db'

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
  await db.employee.create({ data: { name: 'Rahim Uddin', employeeCode: 'EMP-001', designation: 'Sales Manager', phone: '+8801911111111', departmentId: depSales.id, entityId: hq.id } })
  await db.employee.create({ data: { name: 'Karim Hossain', employeeCode: 'EMP-002', designation: 'Purchase Officer', phone: '+8801922222222', departmentId: depPurchase.id, entityId: hq.id } })
  await db.employee.create({ data: { name: 'Salma Akter', employeeCode: 'EMP-003', designation: 'Accountant', phone: '+8801933333333', departmentId: depAccounts.id, entityId: hq.id } })

  // 4. UoM
  const pcs = await db.uoM.create({ data: { name: 'Pieces', shortCode: 'PCS' } })
  const box = await db.uoM.create({ data: { name: 'Box', shortCode: 'BOX' } })
  const set = await db.uoM.create({ data: { name: 'Set', shortCode: 'SET' } })

  // 5. Suppliers
  await db.supplier.create({ data: { name: 'Tech Distributors BD', shortCode: 'TDB', phone: '+8801555555555', email: 'sales@tdb.bd', address: 'Elephant Road, Dhaka', entityId: hq.id } })
  await db.supplier.create({ data: { name: 'Mobile World Ltd', shortCode: 'MWL', phone: '+8801666666666', email: 'info@mwl.bd', address: 'Nawabpur, Dhaka', entityId: hq.id } })

  // 6. Categories (multi-level)
  const mobile = await db.category.create({ data: { name: 'Mobile', shortCode: 'MOB' } })
  const computer = await db.category.create({ data: { name: 'Computer', shortCode: 'CMP' } })
  const samsungMobile = await db.category.create({ data: { name: 'Samsung Mobile', shortCode: 'SMS-MOB', parentId: mobile.id } })
  const appleMobile = await db.category.create({ data: { name: 'Apple Mobile', shortCode: 'APL-MOB', parentId: mobile.id } })
  const laptop = await db.category.create({ data: { name: 'Laptop', shortCode: 'LAP', parentId: computer.id } })
  const desktop = await db.category.create({ data: { name: 'Desktop', shortCode: 'DTP', parentId: computer.id } })
  const cpu = await db.category.create({ data: { name: 'CPU', shortCode: 'CPU', parentId: computer.id } })

  // 7. Items (with barcodes; some hasSerial true)
  const iphone15 = await db.item.create({ data: { name: 'iPhone 15 Pro 256GB', itemCode: 'APL-IP15P-256', barcode: '8901001000011', categoryId: appleMobile.id, uomId: pcs.id, hasSerial: true, description: 'Apple iPhone 15 Pro, 256GB, Titanium' } })
  const galaxyS24 = await db.item.create({ data: { name: 'Samsung Galaxy S24 Ultra', itemCode: 'SMS-S24U-512', barcode: '8901001000028', categoryId: samsungMobile.id, uomId: pcs.id, hasSerial: true, description: 'Samsung Galaxy S24 Ultra, 512GB' } })
  const macbook = await db.item.create({ data: { name: 'MacBook Air M3 13"', itemCode: 'APL-MBA-M3', barcode: '8901002000011', categoryId: laptop.id, uomId: pcs.id, hasSerial: true, description: 'MacBook Air M3, 13-inch, 8GB/256GB' } })
  const dellLaptop = await db.item.create({ data: { name: 'Dell Inspiron 15 5000', itemCode: 'DLL-INSP-15', barcode: '8901002000028', categoryId: laptop.id, uomId: pcs.id, hasSerial: true } })
  const hpDesktop = await db.item.create({ data: { name: 'HP Pavilion Desktop', itemCode: 'HP-PAV-DT', barcode: '8901003000011', categoryId: desktop.id, uomId: pcs.id, hasSerial: true } })
  const intelCPU = await db.item.create({ data: { name: 'Intel Core i7-13700', itemCode: 'INT-i7-13700', barcode: '8901004000011', categoryId: cpu.id, uomId: pcs.id, hasSerial: true } })
  const mouse = await db.item.create({ data: { name: 'Logitech Wireless Mouse', itemCode: 'LOG-MOUSE-WL', barcode: '8901005000011', categoryId: cpu.id, uomId: pcs.id, hasSerial: false } })
  const keyboard = await db.item.create({ data: { name: 'A4Tech Keyboard', itemCode: 'A4T-KB-001', barcode: '8901005000028', categoryId: cpu.id, uomId: pcs.id, hasSerial: false } })

  // 8. Item Serials for demo (some pre-existing stock at Warehouse)
  const serialsData = [
    { item: iphone15, serials: ['IP15P-A1B2C3', 'IP15P-D4E5F6', 'IP15P-G7H8I9'], entity: warehouse.id },
    { item: galaxyS24, serials: ['S24U-001', 'S24U-002', 'S24U-003', 'S24U-004', 'S24U-005'], entity: warehouse.id },
    { item: macbook, serials: ['MBA-M3-001', 'MBA-M3-002'], entity: branch1.id },
    { item: dellLaptop, serials: ['DLL-INSP-001', 'DLL-INSP-002', 'DLL-INSP-003'], entity: warehouse.id },
    { item: hpDesktop, serials: ['HP-PAV-001', 'HP-PAV-002'], entity: warehouse.id },
    { item: intelCPU, serials: ['I7-13700-001', 'I7-13700-002', 'I7-13700-003', 'I7-13700-004'], entity: warehouse.id },
  ]
  for (const s of serialsData) {
    for (const sn of s.serials) {
      await db.itemSerial.create({ data: { itemId: s.item.id, serialNumber: sn, entityId: s.entity, status: 'IN_STOCK' } })
      await db.stockTransaction.create({ data: { itemId: s.item.id, entityId: s.entity, type: 'OPENING', quantity: 1 } })
    }
  }
  await db.stockTransaction.create({ data: { itemId: mouse.id, entityId: warehouse.id, type: 'OPENING', quantity: 50 } })
  await db.stockTransaction.create({ data: { itemId: keyboard.id, entityId: warehouse.id, type: 'OPENING', quantity: 30 } })

  // 9. News ticker
  await db.newsTicker.create({ data: { message: 'Welcome to InventoryPro - Stock managed by Barcode & Serial Number', sortOrder: 1 } })
  await db.newsTicker.create({ data: { message: 'New stock arrived at Central Warehouse - please verify serials', sortOrder: 2 } })
  await db.newsTicker.create({ data: { message: 'Reminder: Approve pending purchase requisitions before EOD', sortOrder: 3 } })

  // 10. Some accounts entries
  await db.accountEntry.create({ data: { entryNo: 'EXP-0001', entityId: hq.id, type: 'EXPENSE', category: 'RENT', amount: 35000, method: 'BANK', description: 'Office rent for July' } })
  await db.accountEntry.create({ data: { entryNo: 'EXP-0002', entityId: hq.id, type: 'EXPENSE', category: 'UTILITIES', amount: 4800, method: 'CASH', description: 'Electricity bill' } })
  await db.accountEntry.create({ data: { entryNo: 'RCV-0001', entityId: hq.id, type: 'RECEIVE', category: 'SALES_PAYMENT', amount: 125000, method: 'BANK', description: 'Bulk sales payment received' } })

  console.log('Seed complete.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
