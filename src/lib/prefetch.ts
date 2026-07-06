'use client'
import { useEffect, useRef } from 'react'
import { list } from '@/lib/api'

// Prefetch a resource list (call when user hovers a nav item)
// Data goes into the in-memory cache in api.ts, so when user actually clicks,
// the data is already available → instant page load
export function usePrefetch() {
  const prefetched = useRef<Set<string>>(new Set())

  const prefetch = (slug: string, params?: Record<string, string>) => {
    const key = `${slug}|${JSON.stringify(params || {})}`
    if (prefetched.current.has(key)) return
    prefetched.current.add(key)
    // Fire and forget — result goes into cache
    list(slug as any, params).catch(() => {})
  }

  const prefetchMultiple = (slugs: string[]) => {
    for (const s of slugs) prefetch(s)
  }

  return { prefetch, prefetchMultiple }
}

// Common resource combinations to prefetch on dashboard
export const PREFETCH_DASHBOARD = [
  'entities', 'departments', 'employees', 'suppliers', 'categories', 'items', 'uoms',
  'purchases', 'sales', 'news-ticker',
]
