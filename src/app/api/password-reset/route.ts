// Public endpoint for submitting a password reset request.
//
// POST /api/password-reset
//   { userId: "akash" }
//   → 200 { ok: true, requestNo: "PRR-260708-011-0000001" }
//
// This is intentionally public (no auth required) — it's called from the
// login page. The endpoint:
//   1. Looks up the userId (case-insensitive-ish; we still match exact).
//   2. If found, records the employee name for the admin's convenience.
//   3. Generates a sequential request number (PRR-YYMMDD-011-0000001).
//   4. Returns the request number so the user can reference it if needed.
//
// We DON'T reveal whether the userId exists — the response is the same
// shape either way (so an attacker can't enumerate valid userIds). The
// only difference is whether employeeName is set internally.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateNumber } from '@/lib/resources'

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return NextResponse.json(
      { error: 'Please enter your User ID' },
      { status: 400 }
    )
  }

  const cleanUserId = userId.trim()
  const now = new Date()

  // Try to resolve the employee name (for admin's convenience). We don't
  // reveal the result to the requester — only store it in the DB row.
  let employeeName: string | null = null
  try {
    const user = await db.user.findUnique({
      where: { userId: cleanUserId },
      include: { employee: true },
    })
    if (user?.employee?.name) {
      employeeName = user.employee.name
    }
  } catch {}

  // Generate sequential request number: PRR-YYMMDD-011-0000001
  let requestNo: string
  try {
    requestNo = await generateNumber('PRR', 'PASSWORD_RESET')
  } catch (e: any) {
    // Fallback: timestamp-based unique number
    requestNo = `PRR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime()}`
  }

  try {
    await db.passwordResetRequest.create({
      data: {
        requestNo,
        userId: cleanUserId,
        employeeName,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      ok: true,
      requestNo,
      message: 'Your request has been sent to the admin. Please contact the admin to get your new password.',
    })
  } catch (e: any) {
    console.error('[password-reset] create error:', e.message)
    return NextResponse.json(
      { error: 'Failed to submit request. Please try again or contact the admin directly.' },
      { status: 500 }
    )
  }
}

// GET — lets the login page check if there's a resolved message for a userId.
// This is how the admin's reply ("Your new password is xyz") reaches the user
// on their next login attempt.
//
// GET /api/password-reset?userId=akash
//   → 200 { resolved: [{ requestNo, message, resolvedAt }] }
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ resolved: [] })
  }
  try {
    // Only return RESOLVED requests with a message — that's what the user
    // needs to see. PENDING/REJECTED rows are admin-facing only.
    const rows = await db.passwordResetRequest.findMany({
      where: {
        userId: userId.trim(),
        status: 'RESOLVED',
        NOT: { message: null },
      },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
      select: {
        requestNo: true,
        message: true,
        resolvedAt: true,
      },
    })
    return NextResponse.json({ resolved: rows })
  } catch {
    return NextResponse.json({ resolved: [] })
  }
}
