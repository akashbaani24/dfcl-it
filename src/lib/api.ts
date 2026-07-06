'use client'
// Simple fetch helpers for resource API with in-memory caching
import { RESOURCES } from '@/lib/resources'

const API = '/api/resource'

// Simple in-memory cache with TTL (5 seconds default — short to stay fresh, long enough to dedupe rapid calls)
type CacheEntry = { data: any; expires: number }
const cache = new Map<string, CacheEntry>()
const DEFAULT_TTL = 5000 // 5 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCached<T>(key: string, data: T, ttl = DEFAULT_TTL) {
  cache.set(key, { data, expires: Date.now() + ttl })
}

// Invalidate cache for a slug (call after create/update/delete)
export function invalidateCache(slug: string) {
  for (const key of cache.keys()) {
    if (key.includes(`slug=${slug}`)) cache.delete(key)
  }
}

export async function list<T = any>(slug: keyof typeof RESOURCES, params?: Record<string, string>, ttl?: number): Promise<T[]> {
  const qs = new URLSearchParams({ slug, ...(params || {}) }).toString()
  const cacheKey = `${API}?${qs}`
  const cached = getCached<T[]>(cacheKey)
  if (cached) return cached
  const r = await fetch(cacheKey)
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  setCached(cacheKey, data, ttl)
  return data
}

export async function getOne<T = any>(slug: keyof typeof RESOURCES, id: string): Promise<T> {
  const qs = new URLSearchParams({ slug, id }).toString()
  const cacheKey = `${API}?${qs}`
  const cached = getCached<T>(cacheKey)
  if (cached) return cached
  const r = await fetch(cacheKey)
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  setCached(cacheKey, data)
  return data
}

export async function create<T = any>(slug: keyof typeof RESOURCES, data: any): Promise<T> {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, data }),
  })
  if (!r.ok) throw new Error(await r.text())
  const result = await r.json()
  invalidateCache(slug as string)
  return result
}

export async function update<T = any>(slug: keyof typeof RESOURCES, id: string, data: any): Promise<T> {
  const r = await fetch(API, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, id, data }),
  })
  if (!r.ok) throw new Error(await r.text())
  const result = await r.json()
  invalidateCache(slug as string)
  return result
}

export async function remove(slug: keyof typeof RESOURCES, id: string): Promise<void> {
  const qs = new URLSearchParams({ slug, id }).toString()
  const r = await fetch(`${API}?${qs}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(await r.text())
  invalidateCache(slug as string)
}

export async function action(action: string, id: string, extra?: any) {
  const r = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, id, extra }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function stockView(entityId?: string, all?: boolean, withSerials = false) {
  const qs = new URLSearchParams()
  if (entityId) qs.set('entityId', entityId)
  if (all) qs.set('all', '1')
  if (withSerials) qs.set('serials', '1')
  const cacheKey = `/api/stock-view?${qs.toString()}`
  const cached = getCached<any>(cacheKey)
  if (cached) return cached
  const r = await fetch(cacheKey)
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  setCached(cacheKey, data)
  return data
}

export async function report(type: string, params?: Record<string, string>) {
  const qs = new URLSearchParams({ type, ...(params || {}) }).toString()
  const cacheKey = `/api/reports?${qs}`
  const cached = getCached<any>(cacheKey)
  if (cached) return cached
  const r = await fetch(cacheKey)
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  setCached(cacheKey, data)
  return data
}
