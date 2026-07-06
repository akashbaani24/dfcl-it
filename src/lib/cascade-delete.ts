// Cascading delete utilities — safely delete records that have foreign key relations
// Prevents "FOREIGN KEY constraint failed" errors by deleting children first
import { db } from '@/lib/db'

// Delete an entity and ALL its related data (departments, employees, suppliers, etc.)
export async function deleteEntityCascade(entityId: string) {
  // 1. Delete departments under this entity (employees must be deleted first)
  const departments = await db.department.findMany({ where: { entityId } })
  for (const dep of departments) {
    // Delete employees in this department
    const employees = await db.employee.findMany({ where: { departmentId: dep.id } })
    for (const emp of employees) {
      // Delete user + permissions + userEntities for this employee
      const user = await db.user.findUnique({ where: { employeeId: emp.id } })
      if (user) {
        await db.permission.deleteMany({ where: { userId: user.id } })
        await db.userEntity.deleteMany({ where: { userId: user.id } })
        await db.user.delete({ where: { id: user.id } })
      }
      await db.employee.delete({ where: { id: emp.id } })
    }
    await db.department.delete({ where: { id: dep.id } })
  }

  // 2. Delete suppliers under this entity
  await db.supplier.deleteMany({ where: { entityId } })

  // 3. Delete item serials held by this entity
  await db.itemSerial.deleteMany({ where: { entityId } })

  // 4. Delete stock transactions for this entity
  await db.stockTransaction.deleteMany({ where: { entityId } })

  // 5. Delete purchase requisitions for this entity (and their items)
  const reqs = await db.purchaseRequisition.findMany({ where: { entityId } })
  for (const r of reqs) {
    await db.purchaseRequisitionItem.deleteMany({ where: { requisitionId: r.id } })
    await db.purchaseRequisition.delete({ where: { id: r.id } })
  }

  // 6. Delete purchases for this entity (and their items + returns)
  const purchases = await db.purchase.findMany({ where: { entityId } })
  for (const p of purchases) {
    const returns = await db.purchaseReturn.findMany({ where: { purchaseId: p.id } })
    for (const r of returns) {
      await db.purchaseReturnItem.deleteMany({ where: { returnId: r.id } })
      await db.purchaseReturn.delete({ where: { id: r.id } })
    }
    await db.purchaseItem.deleteMany({ where: { purchaseId: p.id } })
    await db.purchase.delete({ where: { id: p.id } })
  }

  // 7. Delete sales for this entity (and their items + returns + refunds)
  const sales = await db.sales.findMany({ where: { entityId } })
  for (const s of sales) {
    const returns = await db.salesReturn.findMany({ where: { salesId: s.id } })
    for (const r of returns) {
      await db.salesReturnItem.deleteMany({ where: { returnId: r.id } })
      await db.salesRefund.deleteMany({ where: { returnId: r.id } })
      await db.salesReturn.delete({ where: { id: r.id } })
    }
    await db.salesRefund.deleteMany({ where: { salesId: s.id } })
    await db.salesItem.deleteMany({ where: { salesId: s.id } })
    await db.sales.delete({ where: { id: s.id } })
  }

  // 8. Delete internal transfers (as source or destination)
  await db.internalTransferItem.deleteMany({
    where: { transfer: { OR: [{ fromEntityId: entityId }, { toEntityId: entityId }] } }
  })
  await db.internalTransfer.deleteMany({
    where: { OR: [{ fromEntityId: entityId }, { toEntityId: entityId }] }
  })

  // 9. Delete adjustments for this entity
  const adjustments = await db.adjustment.findMany({ where: { entityId } })
  for (const a of adjustments) {
    await db.adjustmentItem.deleteMany({ where: { adjustmentId: a.id } })
    await db.adjustment.delete({ where: { id: a.id } })
  }

  // 10. Delete account entries for this entity
  await db.accountEntry.deleteMany({ where: { entityId } })

  // 11. Delete user-entity assignments
  await db.userEntity.deleteMany({ where: { entityId } })

  // 12. Clear parent reference from child entities (they become root)
  await db.entity.updateMany({ where: { parentId: entityId }, data: { parentId: null } })

  // Finally delete the entity itself
  await db.entity.delete({ where: { id: entityId } })
}

// Delete an employee and related user account
export async function deleteEmployeeCascade(employeeId: string) {
  const user = await db.user.findUnique({ where: { employeeId } })
  if (user) {
    await db.permission.deleteMany({ where: { userId: user.id } })
    await db.userEntity.deleteMany({ where: { userId: user.id } })
    await db.user.delete({ where: { id: user.id } })
  }
  await db.employee.delete({ where: { id: employeeId } })
}

// Delete a department and its employees (with their users)
export async function deleteDepartmentCascade(departmentId: string) {
  const employees = await db.employee.findMany({ where: { departmentId } })
  for (const emp of employees) {
    await deleteEmployeeCascade(emp.id)
  }
  await db.department.delete({ where: { id: departmentId } })
}

// Delete an item and its serials + stock transactions
export async function deleteItemCascade(itemId: string) {
  await db.itemSerial.deleteMany({ where: { itemId } })
  await db.stockTransaction.deleteMany({ where: { itemId } })
  // Remove from line items (purchase, sales, etc.) — set to null or delete
  await db.purchaseRequisitionItem.deleteMany({ where: { itemId } })
  await db.purchaseItem.deleteMany({ where: { itemId } })
  await db.purchaseReturnItem.deleteMany({ where: { itemId } })
  await db.salesItem.deleteMany({ where: { itemId } })
  await db.salesReturnItem.deleteMany({ where: { itemId } })
  await db.internalTransferItem.deleteMany({ where: { itemId } })
  await db.adjustmentItem.deleteMany({ where: { itemId } })
  await db.item.delete({ where: { id: itemId } })
}

// Delete a user and their permissions + entity assignments
export async function deleteUserCascade(userId: string) {
  await db.permission.deleteMany({ where: { userId } })
  await db.userEntity.deleteMany({ where: { userId } })
  await db.user.delete({ where: { id: userId } })
}

// Delete a category and reassign children/items to parent (or null)
export async function deleteCategoryCascade(categoryId: string) {
  // Get parent before deletion
  const cat = await db.category.findUnique({ where: { id: categoryId } })
  if (!cat) return
  // Reassign children to parent
  await db.category.updateMany({
    where: { parentId: categoryId },
    data: { parentId: cat.parentId || null }
  })
  // Reassign items to parent category
  await db.item.updateMany({
    where: { categoryId },
    data: { categoryId: cat.parentId || null }
  })
  await db.category.delete({ where: { id: categoryId } })
}

// Delete a supplier (purchases remain but with null supplier? No — block if has purchases)
export async function deleteSupplierCascade(supplierId: string) {
  const purchases = await db.purchase.findMany({ where: { supplierId } })
  if (purchases.length > 0) {
    throw new Error(`Cannot delete supplier: ${purchases.length} purchase(s) reference this supplier. Delete those purchases first.`)
  }
  await db.supplier.delete({ where: { id: supplierId } })
}
