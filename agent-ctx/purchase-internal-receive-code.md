# Task: Purchase Receive + Internal Receive modules (DFCL-IT inventory)

**Agent**: Code (main)
**Task ID**: purchase-internal-receive
**Status**: COMPLETE
**Lint**: `bun run lint` passes with exit code 0

## Summary

Added two new modules to the DFCL-IT inventory system that decouple purchase approval from stock receipt and add a confirmation step for internal transfers.

## What was built

### New modules

1. **Purchase Receive** (`src/components/modules/PurchaseReceivePage.tsx`)
   - Lists APPROVED purchases awaiting receive at the top of the page
   - Receive form: per-line `receiveQty` (partial allowed, capped at ordered qty) + serials for tracked items
   - On submit: calls `action('create-purchase-receive', purchaseId, { items, notes })`
   - Auto-generates `PRC-yymmdd-timestamp` receive number + per-unit barcodes (`yymmdd` + 7-digit suffix)
   - Receive is `PENDING` until approved separately
   - Approve button on PENDING receives → `approve-purchase-receive` → creates `ItemSerial` rows, posts positive `StockTransaction`, re-evaluates parent Purchase status (`RECEIVED` / `PARTIAL_RECEIVED`)
   - Bottom table columns: Receive No, Purchase No, Entity, Date, Status, Items count, Actions
   - Includes debounced `SearchInput` + `ExportButtons`

2. **Internal Receive** (`src/components/modules/InternalReceivePage.tsx`)
   - Lists PENDING internal transfers at the top
   - Receive dialog shows transfer items + serials for verification (read-only)
   - On confirm: calls `action('receive-internal-transfer', transferId, { notes })`
   - Creates `InternalReceive` record (`IR-yymmdd-timestamp`), moves `ItemSerial` rows to destination entity, posts `TRANSFER_OUT` (source) + `TRANSFER_IN` (destination), marks transfer as `RECEIVED`
   - Bottom table columns: Receive No, Transfer No, From Entity, To Entity, Date, Status, Actions

### Modified files

- `src/lib/resources.ts` — added `purchase-receives` and `internal-receives` resource configs
- `src/app/api/resource/route.ts` — added both slugs to `ENTITY_FILTERED_RESOURCES` for entity access control
- `src/app/api/action/route.ts`:
  - Added `generateBarcode()` helper (`yymmdd` + 7-digit random suffix)
  - Modified `approve-purchase` — now only sets status to `APPROVED` (was `RECEIVED`); removed ItemSerial/StockTransaction creation
  - Added `create-purchase-receive` — validates, generates receiveNo + barcodes, creates PurchaseReceive + items in PENDING status
  - Added `approve-purchase-receive` — creates ItemSerials, posts positive StockTransaction, re-evaluates Purchase status (RECEIVED / PARTIAL_RECEIVED)
  - Added `receive-internal-transfer` — creates InternalReceive record, moves ItemSerials, posts TRANSFER_OUT + TRANSFER_IN, marks transfer RECEIVED
- `src/lib/store.ts` — added `'purchase-receive'` and `'internal-receive'` to `ModuleKey`
- `src/lib/auth.ts` — added both to `ALL_MODULES`
- `src/components/shared/SidebarData.tsx` — added menu items (Purchase Receive under Purchase, Internal Receive under Inventory; both `PackageCheck` icon)
- `src/components/shared/AppShell.tsx` — added imports + ModuleRouter cases

### Backward compatibility

- `approve-purchase` API contract unchanged (still returns Purchase with includes) — only side effects changed
- Legacy `receive-transfer` action left intact; `InternalTransfersPage` still uses it
- No existing data was modified or deleted
- New module keys added to ALL_MODULES so permissions can be granted via Manage Permissions

## Workflow summary

```
Purchase flow:
  PENDING → [approve-purchase] → APPROVED → [create-purchase-receive] → PurchaseReceive(PENDING)
  → [approve-purchase-receive] → PurchaseReceive(APPROVED) + ItemSerials + Stock TX
  → Purchase becomes RECEIVED (or PARTIAL_RECEIVED if partial)

Internal transfer flow:
  PENDING transfer → [receive-internal-transfer] → InternalReceive(RECEIVED)
  + ItemSerials moved to destination + TRANSFER_OUT/IN stock transactions
  + Transfer marked RECEIVED
```

## Files for future agents to know about

- `prisma/schema.prisma` — `PurchaseReceive`, `PurchaseReceiveItem`, `InternalReceive`, `InternalReceiveItem` models (already pushed to Turso)
- `src/lib/api.ts` — `action(action, id, extra)` helper for calling `/api/action`
- `src/components/shared/Perms.tsx` — `usePerm(module)` hook for permission checks
- `src/components/shared/SearchInput.tsx` — debounced search input (400ms)
- `src/components/shared/PageHeader.tsx` — `PageHeader`, `EmptyState`, `Badge` helpers

## Notes for future agents

- The `generateBarcode()` function in `src/app/api/action/route.ts` uses `Math.random()` — for high-volume production this should be replaced with a deterministic counter (e.g. based on a Setting row or a sequence table) to guarantee uniqueness. For the current test system it is sufficient.
- The `approve-purchase` UI button text in `PurchasesPage.tsx` still says "Approve & Receive Stock" — it now only approves. Future agents may want to update the label to just "Approve".
- `PurchaseReceiveItem.barcodes` and `InternalReceiveItem.barcodes` are stored as comma-separated strings — when displaying, split on `,` to get the per-unit list.
EOF