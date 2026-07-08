// Get all users at a given entity who have "receive" rights (canCreate on
// the 'internal-receive' module). Used by Internal Transfers to show who
// can receive a pending transfer at the destination entity.
//
// Usage:
//   GET /api/entity-receivers?entityId=xxx
//
// Returns:
//   [{ id, userId, employeeName, role }]
//   or [] if no users have receive rights at this entity.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId')

  if (!entityId) {
    return NextResponse.json({ error: 'entityId is required' }, { status: 400 })
  }

  try {
    // 1. Find all users assigned to this entity (via UserEntity)
    // 2. Join with their Employee record (for the display name)
    // 3. Filter to only those who have a Permission record for
    //    'internal-receive' with canCreate = true
    const userEntities = await db.userEntity.findMany({
      where: { entityId },
      include: {
        user: {
          include: {
            employee: { select: { id: true, name: true } },
            permissions: {
              where: {
                module: 'internal-receive',
                canCreate: true,
              },
            },
          },
        },
      },
    })

    // Filter to only users who have the receive permission
    const receivers = userEntities
      .filter((ue) => ue.user.permissions.length > 0)
      .map((ue) => ({
        id: ue.user.id,
        userId: ue.user.userId,
        employeeName: ue.user.employee?.name || ue.user.userId,
        role: ue.user.role,
      }))

    return NextResponse.json(receivers)
  } catch (e: any) {
    console.error('[entity-receivers] error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
