// Cascading delete utilities — safely delete records that have foreign key relations
// Prevents "FOREIGN KEY constraint failed" errors
// Policy: If related transactions exist, BLOCK deletion and suggest deactivation instead
import { db } from '@/lib/db'

// ============ ENTITY ============

// Check if an entity has any related data that should block deletion
export async function checkEntityHasData(entityId: string): Promise<{ hasData: boolean; message: string }> {
  const [
    departments, employees, suppliers, itemSerials, stockTxs,
    reqs, purchases, sales, transfers, adjustments, accountEntries,
  ] = await Promise.all([
    db.department.count({ where: { entityId } }),
    db.employee.count({ where: { entityId } }),
    db.supplier.count({ where: { entityId } }),
    db.itemSerial.count({ where: { entityId } }),
    db.stockTransaction.count({ where: { entityId } }),
    db.purchaseRequisition.count({ where: { entityId } }),
    db.purchase.count({ where: { entityId } }),
    db.sales.count({ where: { entityId } }),
    db.internalTransfer.count({ where: { OR: [{ fromEntityId: entityId }, { toEntityId: entityId }] } }),
    db.adjustment.count({ where: { entityId } }),
    db.accountEntry.count({ where: { entityId } }),
  ])

  const total = departments + employees + suppliers + itemSerials + stockTxs + reqs + purchases + sales + transfers + adjustments + accountEntries

  if (total === 0) return { hasData: false, message: '' }

  const details: string[] = []
  if (departments > 0) details.push(`${departments} department(s)`)
  if (employees > 0) details.push(`${employees} employee(s)`)
  if (suppliers > 0) details.push(`${suppliers} supplier(s)`)
  if (itemSerials > 0) details.push(`${itemSerials} item serial(s)`)
  if (stockTxs > 0) details.push(`${stockTxs} stock transaction(s)`)
  if (reqs > 0) details.push(`${reqs} purchase requisition(s)`)
  if (purchases > 0) details.push(`${purchases} purchase(s)`)
  if (sales > 0) details.push(`${sales} sales order(s)`)
  if (transfers > 0) details.push(`${transfers} internal transfer(s)`)
  if (adjustments > 0) details.push(`${adjustments} adjustment(s)`)
  if (accountEntries > 0) details.push(`${accountEntries} account entrie(s)`)

  return {
    hasData: true,
    message: `এই Entity-র অধীনে লেনদেনকৃত ডাটা আছে: ${details.join(', ')}। এই Entity delete করা যাবে না। সর্বোচ্চ inactive করতে পারবেন।`,
  }
}

// Delete an entity only if no related data exists (otherwise throws)
export async function deleteEntityCascade(entityId: string) {
  const check = await checkEntityHasData(entityId)
  if (check.hasData) {
    throw new Error(check.message)
  }
  // Safe to delete — only clean up user-entity assignments (no transactional data)
  await db.userEntity.deleteMany({ where: { entityId } })
  // Clear parent reference from child entities
  await db.entity.updateMany({ where: { parentId: entityId }, data: { parentId: null } })
  await db.entity.delete({ where: { id: entityId } })
}

// ============ EMPLOYEE ============

// Check if an employee has any related data that should block deletion
export async function checkEmployeeHasData(employeeId: string): Promise<{ hasData: boolean; message: string }> {
  // Get the user account for this employee
  const user = await db.user.findUnique({ where: { employeeId } })

  // An employee is typically linked to a department, and the department is linked to an entity
  // The employee record itself may not have direct transactions, but their user account
  // may have created records. For now, we check if the employee has a user account.
  if (user) {
    return {
      hasData: true,
      message: `এই Employee-র একটি login account আছে (${user.userId})। Employee delete করার আগে প্রথমে login account delete করুন, অথবা employee-কে inactive করুন।`,
    }
  }
  return { hasData: false, message: '' }
}

// Delete an employee only if no related data exists (otherwise throws)
export async function deleteEmployeeCascade(employeeId: string) {
  const check = await checkEmployeeHasData(employeeId)
  if (check.hasData) {
    throw new Error(check.message)
  }
  await db.employee.delete({ where: { id: employeeId } })
}

// ============ DEPARTMENT ============

// Check if a department has any related data that should block deletion
export async function checkDepartmentHasData(departmentId: string): Promise<{ hasData: boolean; message: string }> {
  const employeeCount = await db.employee.count({ where: { departmentId } })
  if (employeeCount > 0) {
    return {
      hasData: true,
      message: `এই Department-এ ${employeeCount} জন employee আছে। Department delete করার আগে প্রথমে employees সরান বা inactive করুন।`,
    }
  }
  return { hasData: false, message: '' }
}

export async function deleteDepartmentCascade(departmentId: string) {
  const check = await checkDepartmentHasData(departmentId)
  if (check.hasData) {
    throw new Error(check.message)
  }
  await db.department.delete({ where: { id: departmentId } })
}

// ============ ITEM ============

// Check if an item has any related data that should block deletion
export async function checkItemHasData(itemId: string): Promise<{ hasData: boolean; message: string }> {
  const [
    serials, stockTxs, reqItems, purchaseItems, purchaseReturnItems,
    salesItems, salesReturnItems, transferItems, adjustmentItems,
  ] = await Promise.all([
    db.itemSerial.count({ where: { itemId } }),
    db.stockTransaction.count({ where: { itemId } }),
    db.purchaseRequisitionItem.count({ where: { itemId } }),
    db.purchaseItem.count({ where: { itemId } }),
    db.purchaseReturnItem.count({ where: { itemId } }),
    db.salesItem.count({ where: { itemId } }),
    db.salesReturnItem.count({ where: { itemId } }),
    db.internalTransferItem.count({ where: { itemId } }),
    db.adjustmentItem.count({ where: { itemId } }),
  ])

  const total = serials + stockTxs + reqItems + purchaseItems + purchaseReturnItems + salesItems + salesReturnItems + transferItems + adjustmentItems

  if (total === 0) return { hasData: false, message: '' }

  const details: string[] = []
  if (serials > 0) details.push(`${serials} serial number(s)`)
  if (stockTxs > 0) details.push(`${stockTxs} stock transaction(s)`)
  if (reqItems > 0) details.push(`${reqItems} purchase requisition item(s)`)
  if (purchaseItems > 0) details.push(`${purchaseItems} purchase item(s)`)
  if (purchaseReturnItems > 0) details.push(`${purchaseReturnItems} purchase return item(s)`)
  if (salesItems > 0) details.push(`${salesItems} sales item(s)`)
  if (salesReturnItems > 0) details.push(`${salesReturnItems} sales return item(s)`)
  if (transferItems > 0) details.push(`${transferItems} transfer item(s)`)
  if (adjustmentItems > 0) details.push(`${adjustmentItems} adjustment item(s)`)

  return {
    hasData: true,
    message: `এই Item-এর অধীনে লেনদেনকৃত ডাটা আছে: ${details.join(', ')}। এই Item delete করা যাবে না। সর্বোচ্চ inactive করতে পারবেন।`,
  }
}

export async function deleteItemCascade(itemId: string) {
  const check = await checkItemHasData(itemId)
  if (check.hasData) {
    throw new Error(check.message)
  }
  await db.item.delete({ where: { id: itemId } })
}

// ============ CATEGORY ============

export async function deleteCategoryCascade(categoryId: string) {
  const [childCount, itemCount] = await Promise.all([
    db.category.count({ where: { parentId: categoryId } }),
    db.item.count({ where: { categoryId } }),
  ])
  if (childCount > 0 || itemCount > 0) {
    const parts: string[] = []
    if (childCount > 0) parts.push(`${childCount} sub-category(s)`)
    if (itemCount > 0) parts.push(`${itemCount} item(s)`)
    throw new Error(`এই Category-র অধীনে ${parts.join(', ')} আছে। Category delete করা যাবে না। প্রথমে সেগুলো সরান বা inactive করুন।`)
  }
  await db.category.delete({ where: { id: categoryId } })
}

// ============ SUPPLIER ============

export async function deleteSupplierCascade(supplierId: string) {
  const purchaseCount = await db.purchase.count({ where: { supplierId } })
  if (purchaseCount > 0) {
    throw new Error(`এই Supplier-এর সাথে ${purchaseCount} টি purchase আছে। Supplier delete করা যাবে না। সর্বোচ্চ inactive করতে পারবেন।`)
  }
  await db.supplier.delete({ where: { id: supplierId } })
}

// ============ USER (login account) ============

export async function deleteUserCascade(userId: string) {
  await db.permission.deleteMany({ where: { userId } })
  await db.userEntity.deleteMany({ where: { userId } })
  await db.user.delete({ where: { id: userId } })
}
