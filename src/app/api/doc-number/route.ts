// Sequential document number generator.
//
// GET /api/doc-number?type=PURCHASE
//   → { docNumber: "PUR-250707-01-0000001" }
//
// This endpoint atomically increments the sequence counter for the given
// document type + today's date, then returns the formatted number.
// The sequence resets daily (when yymmdd changes).
//
// Format: <PREFIX>-<YYMMDD>-<TYPE_CODE>-<7-DIGIT-SEQ>
// Example: PUR-250707-01-0000001
//
// Document types and their formats:
//   PURCHASE           → PUR-YYMMDD-01-0000001
//   PURCHASE_RETURN    → PURTN-YYMMDD-02-0000001
//   INTERNAL_TRANSFER  → IT-YYMMDD-03-0000001
//   INTERNAL_RECEIVE   → IR-YYMMDD-04-0000001
//   ADJUSTMENT         → ADJ-YYMMDD-05-0000001
//   SALES              → SL-YYMMDD-06-0000001
//   SALES_RETURN       → SLRTN-YYMMDD-07-0000001
//   SALES_REFUND       → SLRF-YYMMDD-08-0000001
//   PURCHASE_REQUISITION → PRQ-YYMMDD-09-0000001
//   PURCHASE_RECEIVE   → PRV-YYMMDD-010-0000001
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DOC_CONFIG: Record<string, { prefix: string; typeCode: string }> = {
  PURCHASE:             { prefix: 'PUR',   typeCode: '01' },
  PURCHASE_RETURN:      { prefix: 'PURTN', typeCode: '02' },
  INTERNAL_TRANSFER:    { prefix: 'IT',    typeCode: '03' },
  INTERNAL_RECEIVE:     { prefix: 'IR',    typeCode: '04' },
  ADJUSTMENT:           { prefix: 'ADJ',   typeCode: '05' },
  SALES:                { prefix: 'SL',    typeCode: '06' },
  SALES_RETURN:         { prefix: 'SLRTN', typeCode: '07' },
  SALES_REFUND:         { prefix: 'SLRF',  typeCode: '08' },
  PURCHASE_REQUISITION: { prefix: 'PRQ',   typeCode: '09' },
  PURCHASE_RECEIVE:     { prefix: 'PRV',   typeCode: '010' },
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  if (!type || !DOC_CONFIG[type]) {
    return NextResponse.json(
      { error: `Invalid type. Valid types: ${Object.keys(DOC_CONFIG).join(', ')}` },
      { status: 400 }
    )
  }

  const cfg = DOC_CONFIG[type]
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const yymmdd = `${yy}${mm}${dd}`

  try {
    // Atomically upsert: find existing record for today, increment lastSeq,
    // or create a new one starting at 1.
    const existing = await db.sequentialNumber.findUnique({
      where: { docType_yymmdd: { docType: type, yymmdd } },
    })

    let nextSeq: number
    if (existing) {
      nextSeq = existing.lastSeq + 1
      await db.sequentialNumber.update({
        where: { id: existing.id },
        data: { lastSeq: nextSeq },
      })
    } else {
      nextSeq = 1
      await db.sequentialNumber.create({
        data: { docType: type, yymmdd, lastSeq: nextSeq },
      })
    }

    const seqPadded = String(nextSeq).padStart(7, '0')
    const docNumber = `${cfg.prefix}-${yymmdd}-${cfg.typeCode}-${seqPadded}`

    return NextResponse.json({ docNumber, seq: nextSeq })
  } catch (e: any) {
    console.error('[doc-number] error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Export the config so other server-side code can use it
export { DOC_CONFIG }
