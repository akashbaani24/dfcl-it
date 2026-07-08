// Shared auth constants & types — safe to import from client and server
// (Server-only utilities are in auth-server.ts)

// All modules available for permission matrix
export const ALL_MODULES: { key: string; label: string; section: string }[] = [
  { key: 'dashboard', label: 'Dashboard', section: 'Dashboard' },
  // Company Setup
  { key: 'entities', label: 'Entity', section: 'Company Setup' },
  { key: 'departments', label: 'Department', section: 'Company Setup' },
  { key: 'employees', label: 'Employee', section: 'Company Setup' },
  { key: 'uoms', label: 'Unit of Measure', section: 'Company Setup' },
  { key: 'suppliers', label: 'Supplier', section: 'Company Setup' },
  { key: 'categories', label: 'Category', section: 'Company Setup' },
  { key: 'items', label: 'Item', section: 'Company Setup' },
  { key: 'item-serials', label: 'Item Serial Numbers', section: 'Company Setup' },
  { key: 'news-ticker', label: 'News Ticker', section: 'Company Setup' },
  { key: 'login-settings', label: 'Login Image Settings', section: 'Company Setup' },
  { key: 'account-types', label: 'Account Type Setup', section: 'Company Setup' },
  { key: 'bank-infos', label: 'Bank Info', section: 'Company Setup' },
  // Purchase
  { key: 'purchase-requisitions', label: 'Purchase Requisition', section: 'Purchase' },
  { key: 'purchases', label: 'Purchase', section: 'Purchase' },
  { key: 'purchase-approvals', label: 'Purchase Approval', section: 'Purchase' },
  { key: 'purchase-returns', label: 'Purchase Return', section: 'Purchase' },
  { key: 'purchase-receive', label: 'Purchase Receive', section: 'Purchase' },
  // Inventory
  { key: 'stock-all', label: 'All Entity Stock', section: 'Inventory' },
  { key: 'stock-mine', label: 'My Entity Stock', section: 'Inventory' },
  { key: 'internal-transfers', label: 'Internal Transfer', section: 'Inventory' },
  { key: 'internal-receive', label: 'Internal Receive', section: 'Inventory' },
  { key: 'adjustments', label: 'Adjustment', section: 'Inventory' },
  { key: 'adjustment-approval', label: 'Adjustment Approval', section: 'Inventory' },
  // Sales
  { key: 'sales', label: 'Sales', section: 'Sales' },
  { key: 'sales-delivery', label: 'Sales Delivery', section: 'Sales' },
  { key: 'sales-returns', label: 'Sales Return', section: 'Sales' },
  { key: 'sales-refunds', label: 'Sales Refund', section: 'Sales' },
  // Accounts
  { key: 'accounts-expenses', label: 'Daily Expenses', section: 'Accounts' },
  { key: 'accounts-receive', label: 'Daily Receive', section: 'Accounts' },
  // Reports
  { key: 'reports-stock', label: 'Stock Report', section: 'Reports' },
  { key: 'reports-purchase', label: 'Purchase Report', section: 'Reports' },
  { key: 'reports-sales', label: 'Sales Report', section: 'Reports' },
  { key: 'reports-accounts', label: 'Accounts Report', section: 'Reports' },
  { key: 'reports-serial', label: 'Serial Status Report', section: 'Reports' },
  // Tools
  { key: 'barcode-print', label: 'Barcode Print', section: 'Tools' },
  { key: 'qr-code-print', label: 'QR Code Print', section: 'Tools' },
  // Admin
  { key: 'manage-permissions', label: 'Manage Permissions', section: 'Admin' },
]

export const PERMISSION_ACTIONS = [
  { key: 'canView', label: 'View' },
  { key: 'canCreate', label: 'Create' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
  { key: 'canUpdate', label: 'Update' },
  { key: 'canExcel', label: 'Excel' },
  { key: 'canPdf', label: 'PDF' },
] as const

export type PermissionAction = typeof PERMISSION_ACTIONS[number]['key']

// Check if user has a specific permission on a module (client-side helper)
export function hasPermission(
  user: { role: string; permissions: any[] } | null,
  module: string,
  action: PermissionAction
): boolean {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  const p = user.permissions.find((perm) => perm.module === module)
  if (!p) return false
  return !!p[action]
}
