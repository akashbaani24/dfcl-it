// Special actions that involve multi-table side effects:
//   - approve-purchase-requisition
//   - approve-purchase  (marks purchase APPROVED — stock hits happen at PurchaseReceive approval)
//   - approve-purchase-receive  (creates ItemSerials + StockTransactions + updates purchase status)
//   - create-purchase-receive   (auto-number generation wrapper)
//   - receive-transfer  (creates StockTransactions for receiving entity)
//   - receive-internal-transfer (creates InternalReceive + moves ItemSerials + StockTransactions)
//   - approve-adjustment (creates StockTransactions)
//   - deliver-sales      (creates SalesItem serials + StockTransactions + marks ItemSerials SOLD)
//   - sales-return       (returns serials back to IN_STOCK)
//   - sales-refund
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Generate per-unit barcode: yymmdd + 7-digit sequential (random suffix)
function generateBarcode(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
  return `${yy}${mm}${dd}${random}`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, id, extra } = body
  try {
    switch (action) {
      case 'approve-purchase-requisition': {
        const req = await db.purchaseRequisition.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
          include: { entity: true, items: { include: { item: true } } },
        })
        return NextResponse.json(req)
      }
      case 'reject-purchase-requisition': {
        const req = await db.purchaseRequisition.update({
          where: { id },
          data: { status: 'REJECTED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
        })
        return NextResponse.json(req)
      }
      case 'approve-purchase': {
        // Mark purchase as APPROVED. Stock will be hit when a PurchaseReceive
        // is approved (separate action). This action no longer creates ItemSerials
        // or StockTransactions — it just flips the purchase status to APPROVED so
        // the receiving team can begin partial receives.
        const purchase = await db.purchase.findUnique({
          where: { id },
          include: { items: true },
        })
        if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const updated = await db.purchase.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
          include: { entity: true, supplier: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'send-back-purchase': {
        // Mark purchase as SENT_BACK so the buyer can edit & re-submit it from
        // the Purchase page. Re-submitting (editing in PurchaseEntryPage) flips
        // the status back to SUBMITTED and the purchase re-enters the approval queue.
        const purchase = await db.purchase.findUnique({ where: { id } })
        if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const updated = await db.purchase.update({
          where: { id },
          data: {
            status: 'SENT_BACK',
            approvedBy: null,
            approvedAt: null,
          },
          include: { entity: true, supplier: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'create-purchase-safe': {
        // BULLETPROOF purchase creation with cascading fallback.
        //
        // This action creates a Purchase using a multi-step strategy that
        // isolates exactly which part fails. It's used as a fallback when
        // the normal /api/resource POST route fails with FK errors.
        //
        // Strategy:
        //   Step 1: Create Purchase header ONLY (no items, no shippingEntityId)
        //   Step 2: If step 1 succeeds, add shippingEntityId via update
        //   Step 3: If step 2 succeeds, add line items one by one
        //   Step 4: If any item fails, report which one
        //
        // This way we KNOW exactly what's broken:
        //   - If step 1 fails → Purchase header FK issue (entityId/supplierId)
        //   - If step 2 fails → shippingEntityId column issue
        //   - If step 3 fails → specific itemId issue
        const payload = extra || {}

        // IDEMPOTENCY CHECK: if the client sends an _idempotencyKey, we store
        // it in the purchase's `notes` field (prefixed with "IDEM:"). Before
        // creating, we check if a purchase with this key already exists — if
        // so, return that purchase instead of creating a duplicate. This
        // prevents the "items appearing twice" bug when the user double-clicks
        // the submit button or the network retries the request.
        const idempotencyKey = payload._idempotencyKey
        if (idempotencyKey) {
          // Check if a purchase with this idempotency key already exists
          // (we store it in the notes field as "IDEM:<key>")
          const existing = await db.purchase.findFirst({
            where: { notes: { contains: `IDEM:${idempotencyKey}` } },
            include: {
              entity: { select: { id: true, name: true } },
              shippingEntity: { select: { id: true, name: true } },
              supplier: { select: { id: true, name: true } },
              items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
            },
          })
          if (existing) {
            console.log('[create-purchase-safe] Idempotency hit — returning existing purchase', existing.purchaseNo)
            return NextResponse.json({
              ...existing,
              _idempotent: true,
              _message: 'This purchase was already created (duplicate submission prevented)',
            })
          }
        }

        // Generate purchaseNo using the new sequential format:
        // PUR-YYMMDD-01-0000001
        const { generateNumber } = await import('@/lib/resources')
        const purchaseNo = await generateNumber('PUR', 'PURCHASE')

        // Store the idempotency key in the notes field (if provided) so we
        // can detect duplicate submissions. We prefix it with "IDEM:" and
        // append it to the actual notes.
        const idemTag = idempotencyKey ? `IDEM:${idempotencyKey}` : ''
        const finalNotes = [payload.notes, idemTag].filter(Boolean).join(' | ') || null

        // Step 1: Create Purchase header ONLY — no items, no shippingEntityId
        console.log('[create-purchase-safe] Step 1: creating purchase header only')
        let purchase
        try {
          purchase = await db.purchase.create({
            data: {
              purchaseNo,
              entityId: payload.entityId,
              supplierId: payload.supplierId,
              invoiceNo: payload.invoiceNo || null,
              purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : new Date(),
              totalAmount: payload.totalAmount || 0,
              status: payload.status || 'SUBMITTED',
              approvedBy: null,
              approvedAt: null,
              createdBy: payload.createdBy || null,
              notes: finalNotes,
              // NOTE: deliberately NOT including shippingEntityId or items
              // here — we add them in steps 2 and 3 to isolate failures.
            },
          })
          console.log('[create-purchase-safe] Step 1 OK: purchase created with id', purchase.id)
        } catch (e: any) {
          console.error('[create-purchase-safe] Step 1 FAILED:', e.message)
          // Check if it's the shippingEntityId column issue
          if (e.message.includes('shippingEntityId') || e.message.includes('does not exist')) {
            // Run migration and retry
            console.log('[create-purchase-safe] column issue detected, running migration...')
            try {
              await db.$executeRawUnsafe('ALTER TABLE Purchase ADD COLUMN shippingEntityId TEXT')
            } catch (migErr: any) {
              if (!migErr.message.includes('duplicate column')) {
                console.error('[create-purchase-safe] migration error:', migErr.message)
              }
            }
            // Retry step 1
            purchase = await db.purchase.create({
              data: {
                purchaseNo,
                entityId: payload.entityId,
                supplierId: payload.supplierId,
                invoiceNo: payload.invoiceNo || null,
                purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : new Date(),
                totalAmount: payload.totalAmount || 0,
                status: payload.status || 'SUBMITTED',
                createdBy: payload.createdBy || null,
                notes: payload.notes || null,
              },
            })
            console.log('[create-purchase-safe] Step 1 OK after migration: id', purchase.id)
          } else {
            // Real FK error on entityId or supplierId
            return NextResponse.json({
              error: `Purchase header creation failed: ${e.message}. Check entityId="${payload.entityId}" and supplierId="${payload.supplierId}".`,
              step: 1,
            }, { status: 400 })
          }
        }

        // Step 2: Add shippingEntityId via update (if provided)
        if (payload.shippingEntityId) {
          console.log('[create-purchase-safe] Step 2: adding shippingEntityId =', payload.shippingEntityId)
          try {
            await db.purchase.update({
              where: { id: purchase.id },
              data: { shippingEntityId: payload.shippingEntityId },
            })
            console.log('[create-purchase-safe] Step 2 OK')
          } catch (e: any) {
            console.error('[create-purchase-safe] Step 2 FAILED:', e.message)
            // shippingEntityId column might not exist — run migration and retry
            if (e.message.includes('does not exist') || e.message.includes('no such column')) {
              console.log('[create-purchase-safe] shippingEntityId column missing, adding it...')
              try {
                await db.$executeRawUnsafe('ALTER TABLE Purchase ADD COLUMN shippingEntityId TEXT')
              } catch (migErr: any) {
                if (!migErr.message.includes('duplicate column')) {
                  console.error('[create-purchase-safe] migration error:', migErr.message)
                }
              }
              // Retry the update
              try {
                await db.purchase.update({
                  where: { id: purchase.id },
                  data: { shippingEntityId: payload.shippingEntityId },
                })
                console.log('[create-purchase-safe] Step 2 OK after migration')
              } catch (retryErr: any) {
                console.error('[create-purchase-safe] Step 2 still failing after migration:', retryErr.message)
                // Don't fail the whole purchase — shippingEntityId is optional.
                // The purchase was already created in step 1.
                console.log('[create-purchase-safe] Continuing without shippingEntityId')
              }
            } else {
              // Other error — continue without shippingEntityId
              console.log('[create-purchase-safe] Continuing without shippingEntityId:', e.message)
            }
          }
        }

        // Step 3: Add line items one by one
        const items = Array.isArray(payload.items) ? payload.items : []
        const createdItems: any[] = []
        const failedItems: any[] = []

        for (let i = 0; i < items.length; i++) {
          const it = items[i]
          console.log(`[create-purchase-safe] Step 3: adding item ${i + 1}/${items.length} (itemId=${it.itemId})`)
          // First, verify the item exists (so we can give a clear error if not)
          let itemRecord: any = null
          try {
            itemRecord = await db.item.findUnique({ where: { id: it.itemId }, select: { id: true, name: true, itemCode: true } })
          } catch (checkErr: any) {
            console.error(`[create-purchase-safe] Step 3: item ${i + 1} existence check failed:`, checkErr.message)
          }

          if (!itemRecord) {
            console.error(`[create-purchase-safe] Step 3: item ${i + 1} NOT FOUND in DB: itemId=${it.itemId}`)
            failedItems.push({
              index: i,
              itemId: it.itemId,
              itemName: 'NOT FOUND',
              error: `Item with id "${it.itemId}" does not exist in the database. Please refresh the page and reselect this item.`,
            })
            continue
          }

          // Try to create the PurchaseItem — first with all fields, then
          // without `serials` as a fallback (in case the column is missing).
          let itemCreated = false
          try {
            const item = await db.purchaseItem.create({
              data: {
                purchaseId: purchase.id,
                itemId: it.itemId,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                totalPrice: it.totalPrice || (it.quantity * it.unitPrice),
                serials: it.serials || null,
              },
            })
            createdItems.push(item)
            itemCreated = true
            console.log(`[create-purchase-safe] Step 3: item ${i + 1} OK (${itemRecord.name})`)
          } catch (e: any) {
            console.error(`[create-purchase-safe] Step 3: item ${i + 1} FAILED (with serials):`, e.message)
            // If the error mentions "serials" column, retry without it
            if (e.message.includes('serials') || e.message.includes('does not exist') || e.message.includes('no such column')) {
              console.log(`[create-purchase-safe] Step 3: retrying item ${i + 1} without serials field...`)
              try {
                // Run migration to add the serials column
                try {
                  await db.$executeRawUnsafe('ALTER TABLE PurchaseItem ADD COLUMN serials TEXT')
                  console.log('[create-purchase-safe] PurchaseItem.serials column added via migration')
                } catch (migErr: any) {
                  if (!migErr.message.includes('duplicate column')) {
                    console.error('[create-purchase-safe] migration error:', migErr.message)
                  }
                }
                // Retry the create with serials
                const item = await db.purchaseItem.create({
                  data: {
                    purchaseId: purchase.id,
                    itemId: it.itemId,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    totalPrice: it.totalPrice || (it.quantity * it.unitPrice),
                    serials: it.serials || null,
                  },
                })
                createdItems.push(item)
                itemCreated = true
                console.log(`[create-purchase-safe] Step 3: item ${i + 1} OK after migration (${itemRecord.name})`)
              } catch (retryErr: any) {
                console.error(`[create-purchase-safe] Step 3: item ${i + 1} STILL FAILED after migration:`, retryErr.message)
                // Last resort: try without serials at all
                try {
                  const item = await db.purchaseItem.create({
                    data: {
                      purchaseId: purchase.id,
                      itemId: it.itemId,
                      quantity: it.quantity,
                      unitPrice: it.unitPrice,
                      totalPrice: it.totalPrice || (it.quantity * it.unitPrice),
                    },
                  })
                  createdItems.push(item)
                  itemCreated = true
                  console.log(`[create-purchase-safe] Step 3: item ${i + 1} OK without serials (${itemRecord.name})`)
                } catch (lastErr: any) {
                  console.error(`[create-purchase-safe] Step 3: item ${i + 1} FINAL FAILURE:`, lastErr.message)
                  failedItems.push({
                    index: i,
                    itemId: it.itemId,
                    itemName: itemRecord.name,
                    itemCode: itemRecord.itemCode,
                    error: lastErr.message,
                  })
                }
              }
            } else {
              // Different error (FK, etc.)
              failedItems.push({
                index: i,
                itemId: it.itemId,
                itemName: itemRecord.name,
                itemCode: itemRecord.itemCode,
                error: e.message,
              })
            }
          }
        }

        // Return the result
        const result = await db.purchase.findUnique({
          where: { id: purchase.id },
          include: {
            entity: { select: { id: true, name: true } },
            shippingEntity: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
            items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
          },
        })

        if (failedItems.length > 0) {
          return NextResponse.json({
            ...result,
            _warning: `${failedItems.length} item(s) failed to add`,
            _failedItems: failedItems,
            _createdItems: createdItems.length,
          })
        }

        return NextResponse.json(result)
      }

      case 'create-purchase-receive': {
        // Frontend sends: extra.items = [{ purchaseItemId, itemId, quantity, serials }]
        //                  extra.entityId = the entity that will receive this stock
        //                                  (defaults to purchase.shippingEntityId || purchase.entityId)
        // 1 barcode per receive batch (not per unit)
        // Serials: from product body, optional, no qty connection
        const purchase = await db.purchase.findUnique({
          where: { id },
          include: { entity: true, items: { include: { item: true } } },
        })
        if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
        if (purchase.status !== 'APPROVED') {
          return NextResponse.json({ error: 'Purchase must be APPROVED before receiving' }, { status: 400 })
        }

        const itemsPayload = Array.isArray(extra?.items) ? extra.items : []
        if (itemsPayload.length === 0) {
          return NextResponse.json({ error: 'No items to receive' }, { status: 400 })
        }

        // Resolve the receiving entity:
        //   1. extra.entityId  — explicit override from the receive wizard (Step 1)
        //   2. purchase.shippingEntityId — the "Shipping/Stock Receive" entity
        //                                   chosen at purchase entry time
        //   3. purchase.entityId — legacy fallback (the purchasing entity)
        const receiveEntityId = extra?.entityId || purchase.shippingEntityId || purchase.entityId
        if (!receiveEntityId) {
          return NextResponse.json({ error: 'No receiving entity selected' }, { status: 400 })
        }

        // Check for duplicate serials (within this receive + against DB)
        for (const it of itemsPayload) {
          if (it.serials && it.serials.trim()) {
            const sns = it.serials.split(',').map((s: string) => s.trim()).filter(Boolean)
            // Check duplicates within this item's serials
            const unique = new Set(sns)
            if (unique.size !== sns.length) {
              return NextResponse.json({ error: `Duplicate serial numbers detected for an item. Each serial must be unique.` }, { status: 400 })
            }
            // Check against existing DB
            for (const sn of sns) {
              const existing = await db.itemSerial.findUnique({
                where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
              })
              if (existing) {
                return NextResponse.json({ error: `Serial number "${sn}" already exists in the system.` }, { status: 400 })
              }
            }
          }
        }

        // Generate receiveNo using the new sequential format:
        // PRV-YYMMDD-010-0000001
        const { generateNumber: genPurchaseReceiveNo } = await import('@/lib/resources')
        const receiveNo = await genPurchaseReceiveNo('PRV', 'PURCHASE_RECEIVE')

        // Build line items: 1 barcode per batch + optional serials
        const lineItems = itemsPayload
          .filter((it: any) => it.quantity > 0)
          .map((it: any) => ({
            purchaseItemId: it.purchaseItemId,
            itemId: it.itemId,
            quantity: it.quantity,
            barcodes: generateBarcode(),  // 1 barcode per receive batch
            serials: it.serials || null,
          }))

        if (lineItems.length === 0) {
          return NextResponse.json({ error: 'No items to receive' }, { status: 400 })
        }

        const receive = await db.purchaseReceive.create({
          data: {
            receiveNo,
            purchaseId: purchase.id,
            entityId: receiveEntityId,
            receiveDate: new Date(),
            status: 'PENDING',
            notes: extra?.notes || null,
            items: { create: lineItems },
          },
          include: {
            purchase: { select: { id: true, purchaseNo: true } },
            entity: { select: { id: true, name: true } },
            items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
          },
        })
        return NextResponse.json(receive)
      }

      case 'approve-purchase-receive': {
        // 1. Mark PurchaseReceive as APPROVED
        // 2. For each line item: create ItemSerial records (one per barcode / serial)
        // 3. Create a positive StockTransaction (PURCHASE) for the entity
        // 4. Re-evaluate purchase status: if all purchase items are fully received,
        //    mark as RECEIVED; otherwise mark as PARTIAL_RECEIVED.
        const receive = await db.purchaseReceive.findUnique({
          where: { id },
          include: { purchase: { include: { items: true } }, items: true },
        })
        if (!receive) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (receive.status === 'APPROVED') {
          return NextResponse.json({ error: 'Already approved' }, { status: 400 })
        }

        for (const it of receive.items) {
          // 1 barcode per batch
          const barcode = it.barcodes || generateBarcode()
          // Serials from product body (optional, may be 0, 1, or many — no qty connection)
          const serials: string[] = it.serials ? it.serials.split(',').map((s) => s.trim()).filter(Boolean) : []

          if (serials.length > 0) {
            // Create ItemSerial for each user-provided serial
            for (const sn of serials) {
              const existing = await db.itemSerial.findUnique({
                where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
              })
              if (!existing) {
                await db.itemSerial.create({
                  data: {
                    itemId: it.itemId,
                    serialNumber: sn,
                    barcode,
                    entityId: receive.entityId,
                    status: 'IN_STOCK',
                    purchaseId: receive.purchaseId,
                  },
                })
              }
            }
          } else {
            // No serials — create 1 ItemSerial with barcode as identifier
            const serialNumber = `BC-${barcode}`
            const existing = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber } },
            })
            if (!existing) {
              await db.itemSerial.create({
                data: {
                  itemId: it.itemId,
                  serialNumber,
                  barcode,
                  entityId: receive.entityId,
                  status: 'IN_STOCK',
                  purchaseId: receive.purchaseId,
                },
              })
            }
          }

          // Stock transaction (positive qty)
          await db.stockTransaction.create({
            data: {
              itemId: it.itemId,
              entityId: receive.entityId,
              type: 'PURCHASE',
              quantity: it.quantity,
              refType: 'PURCHASE',
              refId: receive.purchaseId,
              serials: it.serials,
            },
          })
        }

        // Update receive status
        await db.purchaseReceive.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
        })

        // Re-evaluate purchase status
        const allReceives = await db.purchaseReceive.findMany({
          where: { purchaseId: receive.purchaseId, status: 'APPROVED' },
          include: { items: true },
        })
        const receivedByItemId = new Map<string, number>()
        for (const r of allReceives) {
          for (const it of r.items) {
            receivedByItemId.set(it.itemId, (receivedByItemId.get(it.itemId) || 0) + it.quantity)
          }
        }
        const fullyReceived = receive.purchase.items.every(
          (pi) => (receivedByItemId.get(pi.itemId) || 0) >= pi.quantity,
        )
        await db.purchase.update({
          where: { id: receive.purchaseId },
          data: { status: fullyReceived ? 'RECEIVED' : 'PARTIAL_RECEIVED' },
        })

        const result = await db.purchaseReceive.findUnique({
          where: { id },
          include: {
            purchase: { select: { id: true, purchaseNo: true, status: true } },
            entity: { select: { id: true, name: true } },
            items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
          },
        })
        return NextResponse.json(result)
      }

      case 'receive-transfer': {
        // Mark InternalTransfer as RECEIVED, move ItemSerials to toEntityId, create STOCK TX
        const t = await db.internalTransfer.findUnique({
          where: { id },
          include: { items: true },
        })
        if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        for (const it of t.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((s: string) => s.trim()).filter(Boolean) : []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is) {
              await db.itemSerial.update({ where: { id: is.id }, data: { entityId: t.toEntityId } })
            }
          }
          // OUT from source
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: t.fromEntityId, type: 'TRANSFER_OUT', quantity: -Math.abs(it.quantity), refType: 'TRANSFER', refId: t.id, serials: it.serials },
          })
          // IN at destination
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: t.toEntityId, type: 'TRANSFER_IN', quantity: Math.abs(it.quantity), refType: 'TRANSFER', refId: t.id, serials: it.serials },
          })
        }
        const updated = await db.internalTransfer.update({
          where: { id },
          data: { status: 'RECEIVED', receivedAt: new Date() },
          include: { fromEntity: true, toEntity: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'receive-internal-transfer': {
        // 1. Create InternalReceive record with items (barcodes + serials from transfer)
        // 2. Mark InternalTransfer as RECEIVED
        // 3. Move ItemSerials to receiving entity
        // 4. Create StockTransactions (TRANSFER_OUT from source, TRANSFER_IN to destination)
        const t = await db.internalTransfer.findUnique({
          where: { id },
          include: { items: { include: { item: true } } },
        })
        if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (t.status === 'RECEIVED') {
          return NextResponse.json({ error: 'Already received' }, { status: 400 })
        }

        // Build the receive line items + lookup barcodes from ItemSerial records
        const receiveItems: any[] = []
        for (const it of t.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((s: string) => s.trim()).filter(Boolean) : []
          // For serial-tracked items, look up barcodes from existing ItemSerials
          const barcodes: string[] = []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is?.barcode) barcodes.push(is.barcode)
          }
          receiveItems.push({
            itemId: it.itemId,
            quantity: it.quantity,
            barcodes: barcodes.length > 0 ? barcodes.join(',') : null,
            serials: it.serials || null,
          })
        }

        // Generate receiveNo using the new sequential format:
        // IR-YYMMDD-04-0000001
        const { generateNumber: genInternalReceiveNo } = await import('@/lib/resources')
        const receiveNo = await genInternalReceiveNo('IR', 'INTERNAL_RECEIVE')

        // Create the InternalReceive record
        const receive = await db.internalReceive.create({
          data: {
            receiveNo,
            transferId: t.id,
            entityId: t.toEntityId,
            receiveDate: new Date(),
            status: 'RECEIVED',
            notes: extra?.notes || null,
            items: { create: receiveItems },
          },
          include: {
            transfer: { select: { id: true, transferNo: true } },
            entity: { select: { id: true, name: true } },
            items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
          },
        })

        // Move ItemSerials + create stock transactions
        for (const it of t.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((s: string) => s.trim()).filter(Boolean) : []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is) {
              await db.itemSerial.update({ where: { id: is.id }, data: { entityId: t.toEntityId } })
            }
          }
          // OUT from source
          await db.stockTransaction.create({
            data: {
              itemId: it.itemId,
              entityId: t.fromEntityId,
              type: 'TRANSFER_OUT',
              quantity: -Math.abs(it.quantity),
              refType: 'TRANSFER',
              refId: t.id,
              serials: it.serials,
            },
          })
          // IN at destination
          await db.stockTransaction.create({
            data: {
              itemId: it.itemId,
              entityId: t.toEntityId,
              type: 'TRANSFER_IN',
              quantity: Math.abs(it.quantity),
              refType: 'TRANSFER',
              refId: t.id,
              serials: it.serials,
            },
          })
        }

        // Mark transfer as RECEIVED
        await db.internalTransfer.update({
          where: { id: t.id },
          data: { status: 'RECEIVED', receivedAt: new Date() },
        })

        return NextResponse.json(receive)
      }

      case 'approve-adjustment': {
        const adj = await db.adjustment.findUnique({
          where: { id },
          include: { items: true },
        })
        if (!adj) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        const sign = adj.type === 'INCREASE' ? 1 : -1
        for (const it of adj.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((s: string) => s.trim()).filter(Boolean) : []
          if (adj.type === 'DECREASE') {
            for (const sn of serials) {
              const is = await db.itemSerial.findUnique({
                where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
              })
              if (is) {
                await db.itemSerial.update({ where: { id: is.id }, data: { status: 'DAMAGED' } })
              }
            }
          }
          await db.stockTransaction.create({
            data: {
              itemId: it.itemId,
              entityId: adj.entityId,
              type: adj.type === 'INCREASE' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
              quantity: sign * Math.abs(it.quantity),
              refType: 'ADJUSTMENT',
              refId: adj.id,
              serials: it.serials,
            },
          })
        }
        const updated = await db.adjustment.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() },
          include: { entity: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'reject-adjustment': {
        const adj = await db.adjustment.update({ where: { id }, data: { status: 'REJECTED', approvedBy: extra?.approver || 'admin', approvedAt: new Date() } })
        return NextResponse.json(adj)
      }

      case 'deliver-sales': {
        // Mark sales as DELIVERED, mark ItemSerials as SOLD, create negative StockTransactions
        const s = await db.sales.findUnique({ where: { id }, include: { items: true } })
        if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        for (const it of s.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((x: string) => x.trim()).filter(Boolean) : []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is) {
              await db.itemSerial.update({ where: { id: is.id }, data: { status: 'SOLD', saleId: s.id } })
            }
          }
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: s.entityId, type: 'SALE', quantity: -Math.abs(it.quantity), refType: 'SALES', refId: s.id, serials: it.serials },
          })
        }
        const updated = await db.sales.update({
          where: { id },
          data: { deliveryStatus: 'DELIVERED', status: 'DELIVERED' },
          include: { entity: true, items: { include: { item: true } } },
        })
        return NextResponse.json(updated)
      }

      case 'sales-return': {
        // For each return item, mark serials IN_STOCK again
        const r = await db.salesReturn.findUnique({ where: { id }, include: { items: true } })
        if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        const sale = await db.sales.findUnique({ where: { id: r.salesId } })
        for (const it of r.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((x: string) => x.trim()).filter(Boolean) : []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is) {
              await db.itemSerial.update({ where: { id: is.id }, data: { status: 'IN_STOCK', saleId: null, entityId: sale?.entityId || is.entityId } })
            }
          }
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: sale?.entityId || '', type: 'RETURN_IN', quantity: Math.abs(it.quantity), refType: 'SALES_RETURN', refId: r.id, serials: it.serials },
          })
        }
        const updated = await db.salesReturn.update({
          where: { id },
          data: {},
          include: { sales: true, items: { include: { item: true } }, refunds: true },
        })
        return NextResponse.json(updated)
      }

      case 'purchase-return': {
        // For each return item, mark serials DAMAGED or move them; reduce stock
        const r = await db.purchaseReturn.findUnique({ where: { id }, include: { items: true, purchase: true } })
        if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        for (const it of r.items) {
          const serials: string[] = it.serials ? it.serials.split(',').map((x: string) => x.trim()).filter(Boolean) : []
          for (const sn of serials) {
            const is = await db.itemSerial.findUnique({
              where: { itemId_serialNumber: { itemId: it.itemId, serialNumber: sn } },
            })
            if (is) {
              await db.itemSerial.update({ where: { id: is.id }, data: { status: 'RETURNED' } })
            }
          }
          await db.stockTransaction.create({
            data: { itemId: it.itemId, entityId: r.purchase.entityId, type: 'RETURN_OUT', quantity: -Math.abs(it.quantity), refType: 'PURCHASE_RETURN', refId: r.id, serials: it.serials },
          })
        }
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: any) {
    console.error('action error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
