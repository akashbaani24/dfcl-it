'use client'
import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'

type Ticker = { id: string; message: string; isActive: boolean; sortOrder: number }

export function NewsTicker() {
  const [items, setItems] = useState<Ticker[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    fetch('/api/resource?slug=news-ticker')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setItems(d.filter((t) => t.isActive))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (items.length === 0) return
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000)
    return () => clearInterval(t)
  }, [items.length])

  if (items.length === 0) return null
  return (
    <div className="bg-primary text-primary-foreground text-sm py-1.5 px-3 flex items-center gap-2 overflow-hidden">
      <Megaphone className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium shrink-0">Notice:</span>
      <div className="flex-1 overflow-hidden whitespace-nowrap">
        <span key={idx} className="inline-block animate-[ticker_0.5s_ease-in-out]">
          {items[idx]?.message}
        </span>
      </div>
    </div>
  )
}
