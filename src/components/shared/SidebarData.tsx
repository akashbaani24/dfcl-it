import {
  Building2, Boxes, ShoppingCart, Package, Receipt, BarChart3, LayoutDashboard,
  Users, Layers, Scale, Truck, Barcode, Megaphone,
  ClipboardList, FileCheck2, Undo2,
  Warehouse, MapPin, ArrowLeftRight, Sliders,
  BadgeDollarSign, PackageCheck, RotateCcw,
  TrendingDown, TrendingUp,
  FileBarChart, ClipboardCheck, Tags, ScanLine,
  Image as ImageIcon,
  Printer,
} from 'lucide-react'
import { ModuleKey } from '@/lib/store'

type Item = { key: ModuleKey; label: string; icon: any }
type Section = { title: string; icon: any; items: Item[]; defaultOpen?: boolean }

export const SECTIONS: Section[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [{ key: 'dashboard', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    title: 'Company Setup',
    icon: Building2,
    defaultOpen: true,
    items: [
      { key: 'entities', label: 'Entity (Multi-level)', icon: Building2 },
      { key: 'departments', label: 'Department', icon: Boxes },
      { key: 'employees', label: 'Employee', icon: Users },
      { key: 'uoms', label: 'Unit of Measure', icon: Scale },
      { key: 'suppliers', label: 'Supplier', icon: Truck },
      { key: 'categories', label: 'Category / Sub-Category', icon: Layers },
      { key: 'items', label: 'Item (Barcode + Serial)', icon: Barcode },
      { key: 'item-serials', label: 'Item Serial Numbers', icon: ScanLine },
      { key: 'news-ticker', label: 'News Ticker', icon: Megaphone },
  { key: 'login-settings', label: 'Login Image Settings', icon: ImageIcon },
  { key: 'account-types', label: 'Account Type Setup', icon: Tags },
  { key: 'bank-infos', label: 'Bank Info', icon: Tags },
    ],
  },
  {
    title: 'Purchase',
    icon: ShoppingCart,
    items: [
      { key: 'purchase-requisitions', label: 'Purchase Requisition', icon: ClipboardList },
      { key: 'purchases', label: 'Purchase', icon: ShoppingCart },
      { key: 'purchase-approvals', label: 'Purchase Approval', icon: FileCheck2 },
      { key: 'purchase-returns', label: 'Purchase Return', icon: Undo2 },
      { key: 'purchase-receive', label: 'Purchase Receive', icon: PackageCheck },
    ],
  },
  {
    title: 'Inventory',
    icon: Package,
    items: [
      { key: 'stock-all', label: 'All Entity Stock', icon: Warehouse },
      { key: 'stock-mine', label: 'My Entity Stock', icon: MapPin },
      { key: 'internal-transfers', label: 'Internal Transfer', icon: ArrowLeftRight },
      { key: 'internal-receive', label: 'Internal Receive', icon: PackageCheck },
      { key: 'adjustments', label: 'Adjustment & Approval', icon: Sliders },
    ],
  },
  {
    title: 'Sales',
    icon: Receipt,
    items: [
      { key: 'sales', label: 'Sales', icon: BadgeDollarSign },
      { key: 'sales-delivery', label: 'Sales Order Delivery', icon: PackageCheck },
      { key: 'sales-returns', label: 'Sales Return', icon: RotateCcw },
      { key: 'sales-refunds', label: 'Sales Refund', icon: Receipt },
    ],
  },
  {
    title: 'Accounts',
    icon: Receipt,
    items: [
      { key: 'accounts-expenses', label: 'Daily Expenses', icon: TrendingDown },
      { key: 'accounts-receive', label: 'Daily Receive', icon: TrendingUp },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    items: [
      { key: 'reports-stock', label: 'Stock Report', icon: FileBarChart },
      { key: 'reports-purchase', label: 'Purchase Report', icon: ClipboardCheck },
      { key: 'reports-sales', label: 'Sales Report', icon: Tags },
      { key: 'reports-accounts', label: 'Accounts Report', icon: BarChart3 },
      { key: 'reports-serial', label: 'Serial Status Report', icon: ScanLine },
    ],
  },
  {
    title: 'Tools',
    items: [
      { key: 'barcode-print', label: 'Barcode Print', icon: Printer },
    ],
  },
]
