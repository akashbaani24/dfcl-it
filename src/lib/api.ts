'use client'
// Simple fetch helpers for resource API
import { RESOURCES } from '@/lib/resources'

const API = '/api/resource'

export async function list<T = any>(slug: keyof typeof RESOURCES, params?: Record<string, string>): Promise<T[]> {
  const qs = new URLSearchParams({ slug, ...(params || {}) }).toString()
  const r = await fetch(`${API}?${qs}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getOne<T = any>(slug: keyof typeof RESOURCES, id: string): Promise<T> {
  const qs = new URLSearchParams({ slug, id }).toString()
  const r = await fetch(`${API}?${qs}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function create<T = any>(slug: keyof typeof RESOURCES, data: any): Promise<T> {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, data }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function update<T = any>(slug: keyof typeof RESOURCES, id: string, data: any): Promise<T> {
  const r = await fetch(API, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, id, data }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function remove(slug: keyof typeof RESOURCES, id: string): Promise<void> {
  const qs = new URLSearchParams({ slug, id }).toString()
  const r = await fetch(`${API}?${qs}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(await r.text())
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
  const r = await fetch(`/api/stock-view?${qs.toString()}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function report(type: string, params?: Record<string, string>) {
  const qs = new URLSearchParams({ type, ...(params || {}) }).toString()
  const r = await fetch(`/api/reports?${qs}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
