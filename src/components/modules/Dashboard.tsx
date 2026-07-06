'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { list } from '@/lib/api'
import { usePrefetch, PREFETCH_DASHBOARD } from '@/lib/prefetch'
import { ShoppingCart, BadgeDollarSign, AlertCircle, Package, TrendingDown, TrendingUp } from 'lucide-react'

export function Dashboard() {
  const { setActive } = useApp()
  const { prefetchMultiple } = usePrefetch()
  const [stats, setStats] = useState({
    purchases: 0,
    sales: 0,
    pendingApprovals: 0,
    pendingDeliveries: 0,
    expenses: 0,
    receives: 0,
  })

  useEffect(() => {
    Promise.all([
      list('purchases'),
      list('sales'),
      list('account-entries', { type: 'EXPENSE' }),
      list('account-entries', { type: 'RECEIVE' }),
    ]).then(([p, s, exp, rcv]) => {
      setStats({
        purchases: (p as any[]).length,
        sales: (s as any[]).length,
        pendingApprovals: (p as any[]).filter((x) => x.status === 'PENDING').length,
        pendingDeliveries: (s as any[]).filter((x) => x.deliveryStatus === 'PENDING').length,
        expenses: (exp as any[]).length,
        receives: (rcv as any[]).length,
      })
    }).catch(() => {})

    // Prefetch common resources so navigation feels instant
    prefetchMultiple(PREFETCH_DASHBOARD)
  }, [prefetchMultiple])

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">Quick snapshot of your inventory system</p>
      </div>

      {/* Stat cards — only transactional data, no entity/item count */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
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
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('purchases')}>
          <CardContent className="p-4">
            <AlertCircle className="h-5 w-5 text-amber-600 mb-2" />
            <div className="text-2xl font-bold text-amber-700">{stats.pendingApprovals}</div>
            <div className="text-xs text-muted-foreground">Pending Approvals</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('sales-delivery')}>
          <CardContent className="p-4">
            <Package className="h-5 w-5 text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-700">{stats.pendingDeliveries}</div>
            <div className="text-xs text-muted-foreground">Pending Deliveries</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('accounts-expenses')}>
          <CardContent className="p-4">
            <TrendingDown className="h-5 w-5 text-rose-600 mb-2" />
            <div className="text-2xl font-bold text-rose-700">{stats.expenses}</div>
            <div className="text-xs text-muted-foreground">Expenses</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive('accounts-receive')}>
          <CardContent className="p-4">
            <TrendingUp className="h-5 w-5 text-emerald-600 mb-2" />
            <div className="text-2xl font-bold text-emerald-700">{stats.receives}</div>
            <div className="text-xs text-muted-foreground">Receives</div>
          </CardContent>
        </Card>
      </div>

      {/* Module Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module Quick Access</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
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
    </div>
  )
}
