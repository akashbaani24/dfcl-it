'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/PageHeader'
import { list } from '@/lib/api'
import { Building2, Boxes, ShoppingCart, BadgeDollarSign, ScanLine, AlertCircle } from 'lucide-react'

export function Dashboard() {
  const { setActive } = useApp()
  const [stats, setStats] = useState({ entities: 0, items: 0, purchases: 0, sales: 0, serials: 0, pendingApprovals: 0 })

  useEffect(() => {
    Promise.all([
      list('entities'),
      list('items'),
      list('purchases'),
      list('sales'),
      list('item-serials'),
    ]).then(([e, i, p, s, is]) => {
      const pending = (p as any[]).filter((x) => x.status === 'PENDING').length
      setStats({
        entities: (e as any[]).length,
        items: (i as any[]).length,
        purchases: (p as any[]).length,
        sales: (s as any[]).length,
        serials: (is as any[]).filter((x) => x.status === 'IN_STOCK').length,
        pendingApprovals: pending,
      })
    }).catch(() => {})
  }, [])

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">Quick snapshot of your inventory system</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('entities')}>
          <CardContent className="p-4">
            <Building2 className="h-5 w-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{stats.entities}</div>
            <div className="text-xs text-muted-foreground">Entities</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('items')}>
          <CardContent className="p-4">
            <Boxes className="h-5 w-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{stats.items}</div>
            <div className="text-xs text-muted-foreground">Items</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('purchases')}>
          <CardContent className="p-4">
            <ShoppingCart className="h-5 w-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{stats.purchases}</div>
            <div className="text-xs text-muted-foreground">Purchases</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('sales')}>
          <CardContent className="p-4">
            <BadgeDollarSign className="h-5 w-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{stats.sales}</div>
            <div className="text-xs text-muted-foreground">Sales Orders</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('item-serials')}>
          <CardContent className="p-4">
            <ScanLine className="h-5 w-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{stats.serials}</div>
            <div className="text-xs text-muted-foreground">Serials In Stock</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('purchases')}>
          <CardContent className="p-4">
            <AlertCircle className="h-5 w-5 text-amber-600 mb-2" />
            <div className="text-2xl font-bold text-amber-700">{stats.pendingApprovals}</div>
            <div className="text-xs text-muted-foreground">Pending Approvals</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Module Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <button onClick={() => setActive('entities')} className="text-left p-3 rounded-md border hover:bg-accent">
              <div className="font-medium">Company Setup</div>
              <div className="text-xs text-muted-foreground mt-0.5">Entities, departments, items, suppliers</div>
            </button>
            <button onClick={() => setActive('purchases')} className="text-left p-3 rounded-md border hover:bg-accent">
              <div className="font-medium">Purchase Module</div>
              <div className="text-xs text-muted-foreground mt-0.5">Requisition, Purchase, Return</div>
            </button>
            <button onClick={() => setActive('stock-all')} className="text-left p-3 rounded-md border hover:bg-accent">
              <div className="font-medium">Inventory Module</div>
              <div className="text-xs text-muted-foreground mt-0.5">Stock, Transfer, Adjustment</div>
            </button>
            <button onClick={() => setActive('sales')} className="text-left p-3 rounded-md border hover:bg-accent">
              <div className="font-medium">Sales Module</div>
              <div className="text-xs text-muted-foreground mt-0.5">Sales, Delivery, Return, Refund</div>
            </button>
            <button onClick={() => setActive('accounts-expenses')} className="text-left p-3 rounded-md border hover:bg-accent">
              <div className="font-medium">Accounts Module</div>
              <div className="text-xs text-muted-foreground mt-0.5">Daily expenses & receive</div>
            </button>
            <button onClick={() => setActive('reports-stock')} className="text-left p-3 rounded-md border hover:bg-accent">
              <div className="font-medium">Reports</div>
              <div className="text-xs text-muted-foreground mt-0.5">Stock, purchase, sales, accounts</div>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How Serial Tracking Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Each item that has <strong>"hasSerial"</strong> flag enabled (like phones, laptops, CPUs) is tracked individually by the serial number printed on the product body.</p>
            <p>When you create a <strong>Purchase</strong> with approval, the system generates <code className="bg-accent px-1 rounded">ItemSerial</code> entries for each serial entered — and you can later see exactly which serials are in stock, which are sold, and which are returned.</p>
            <p>For non-serial items (like accessories), only quantity-based stock is maintained.</p>
            <p>Barcodes are also generated per item — you can scan barcodes at purchase and at sales.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
