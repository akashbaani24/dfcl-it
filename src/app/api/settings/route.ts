// Settings API — key-value store for system configuration
// GET /api/settings?key=loginImage  -> get one setting
// GET /api/settings  -> get all settings
// POST /api/settings { key, value }  -> upsert setting
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  try {
    if (key) {
      const setting = await db.setting.findUnique({ where: { key } })
      return NextResponse.json(setting ? JSON.parse(setting.value) : null)
    }
    // Get all settings
    const settings = await db.setting.findMany()
    const result: Record<string, any> = {}
    for (const s of settings) {
      try { result[s.key] = JSON.parse(s.value) } catch { result[s.key] = s.value }
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  try {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
    const setting = await db.setting.upsert({
      where: { key },
      update: { value: valueStr },
      create: { key, value: valueStr },
    })
    return NextResponse.json({ ok: true, key: setting.key })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
