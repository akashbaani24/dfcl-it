# Task: Split "Purchase & Approval" page into Purchase + Purchase Approval

**Agent**: Code (main)
**Task ID**: purchase-approval-split
**Status**: COMPLETE
**Lint**: `bun run lint` passes with exit code 0

> Note: `worklog.md` did not exist at the start of this task. Context was loaded from the prior agent record at `/home/z/my-project/agent-ctx/purchase-internal-receive-code.md`, which describes the existing purchase → receive flow (`approve-purchase` already only sets status to `APPROVED`).

## Summary

Decoupled purchase entry from purchase approval by introducing two new purchase lifecycle statuses (`SUBMITTED`, `SENT_BACK`) and splitting the old combined "Purchase & Approval" sidebar entry into two separate modules:

- **Purchase** (`purchases`) — create / list / edit / view purchases
- **Purchase Approval** (`purchase-approvals` — NEW module) — review submitted purchases and either approve or send back for editing

The new status flow:

```
Create purchase → SUBMITTED
       ↓
Approval page → Approve → APPROVED  (ready for Purchase Receive)
       OR
Approval page → Send for Edit → SENT_BACK
       ↓
User edits → re-submit → SUBMITTED (back to approval queue)
```

## What was built / changed

### New file: `src/components/modules/PurchaseApprovalPage.tsx`

- Title: "Purchase Approval"
- Lists only purchases with `status = "SUBMITTED"` (server-side filter via `list('purchases', { status: 'SUBMITTED' })` — uses the existing `buildWhere` support in `src/app/api/resource/route.ts`).
- Table columns: PO No, Date, Entity, Supplier, Total, Status, Actions.
- PO No is a clickable link (underline-on-hover) that opens the detail dialog. Eye button does the same.
- Detail dialog shows entity / supplier / invoice / date / total / createdBy + the full line-item table.
- Detail dialog footer has TWO buttons:
  - **Approve** → `action('approve-purchase', id)` → toast: "Purchase approved. Use Purchase Receive to receive stock."
  - **Send for Edit** → `action('send-back-purchase', id)` → toast: "Purchase sent back for editing"
- Both actions also show as inline icon buttons in each row (Approve = green CheckCircle2, Send for Edit = orange Undo2). Both gated by `usePerm('purchase-approvals').canUpdate`.
- Uses `invalidateCache('purchases')` after each action so the queue refreshes immediately.
- Includes debounced `SearchInput` and `ExportButtons` (uses module key `purchase-approvals` for export permission checks).

### Modified: `src/components/modules/PurchasesPage.tsx`

Rewrote the page (kept the same module key `purchases`):

- Title changed from "Purchase & Approval" → **"Purchase"**; description updated.
- Removed the `approve` function and the green approve (CheckCircle2) button from the row.
- Removed the now-unused "New Purchase Order" Dialog form (the "New Purchase" button already navigates to `PurchaseEntryPage` via `setActive('purchase-entry')`). Also removed unused state (`open`, `form`, `lines`, `saving`, `entities`, `suppliers`, `items`, `totalAmount`, `save`) and unused imports (`ComboBox`, `Input`, `Textarea`, `Label`, `LineItemEditor`, `CheckCircle2`, `ScanLine`, `create`, `action`, `getOne`, `toast`).
- Each row now shows:
  - `Badge` for the raw status (now supports `SUBMITTED` = yellow and `SENT_BACK` = orange).
  - An extra "Sent back for edit" warning chip (orange AlertTriangle + label) shown only when `status === 'SENT_BACK'`.
- Detail dialog shows an orange banner when `status === 'SENT_BACK'` instructing the user to click Edit to revise and re-submit.
- Kept: New Purchase button, Eye/view button, Edit button, Search, ExportButtons (all existing functionality preserved).

### Modified: `src/components/modules/PurchaseEntryPage.tsx`

- Form layout untouched (per instructions).
- Save payload `status` changed from `'PENDING'` → **`'SUBMITTED'`** for both create and edit paths.
- Also clears `approvedBy` / `approvedAt` on every save so a re-submitted (formerly SENT_BACK) purchase starts fresh in the approval queue.

### Modified: `src/components/shared/PageHeader.tsx`

Extended the `Badge` status map:

- `SUBMITTED`: `bg-yellow-100 text-yellow-800`
- `SENT_BACK`: `bg-orange-100 text-orange-800`
- Also added `PARTIAL_RECEIVED` (sky) for completeness (used by PurchaseReceive flow).

Raw status text is still rendered unchanged (`{status}`) to avoid altering existing badges elsewhere.

### Modified: `src/components/shared/SidebarData.tsx`

Split the single Purchase-section entry into two:

```ts
{ key: 'purchases',           label: 'Purchase',          icon: ShoppingCart },
{ key: 'purchase-approvals',  label: 'Purchase Approval', icon: FileCheck2   },
```

### Modified: `src/lib/store.ts`

Added `'purchase-approvals'` to the `ModuleKey` union type.

### Modified: `src/lib/auth.ts`

In `ALL_MODULES`:

- Changed `{ key: 'purchases', label: 'Purchase & Approval', ... }` → `{ key: 'purchases', label: 'Purchase', ... }`
- Added `{ key: 'purchase-approvals', label: 'Purchase Approval', section: 'Purchase' }`

Non-admin users will need to be granted permissions on the new module via the Manage Permissions page (admin sees everything by default).

### Modified: `src/components/shared/AppShell.tsx`

- Imported `PurchaseApprovalPage`.
- Added `case 'purchase-approvals': return <PurchaseApprovalPage />` in `ModuleRouter`.
- Added `'purchase-approvals'` to the `validModules` array used by the hash-routing effect (so `#purchase-approvals` deep links work for "Open in new tab").

### Modified: `src/app/api/action/route.ts`

- `approve-purchase` is unchanged (already sets status to `APPROVED` per the prior task).
- **NEW action `send-back-purchase`**: sets `status = 'SENT_BACK'` and clears `approvedBy` / `approvedAt`. Returns the purchase with includes (entity / supplier / items + item) for the UI.

### Modified: `prisma/schema.prisma`

Only updated the inline comment on `Purchase.status` to document the new lifecycle states:

```
status String @default("PENDING") // PENDING, SUBMITTED, APPROVED, SENT_BACK, RECEIVED, PARTIAL_RECEIVED, RETURNED
```

Default remains `"PENDING"` for backward compatibility (existing rows keep their value). No `db push` needed — this is a comment-only change.

## Backward compatibility

- No existing data was modified or deleted.
- The `approve-purchase` action contract is unchanged (still returns Purchase with includes).
- The `purchases` resource in `src/lib/resources.ts` already supports the `status` field on read/write — no schema or resource-config change needed.
- Existing PENDING / APPROVED / RECEIVED / PARTIAL_RECEIVED purchases still display correctly (their colors are still in the Badge map).
- Legacy PENDING status is preserved in the Badge map (amber) for any historical rows that were created before this change. New purchases will always be SUBMITTED.

## Files for future agents to know about

- `src/components/modules/PurchaseApprovalPage.tsx` — the new approval queue UI
- `src/components/modules/PurchasesPage.tsx` — now purely a create/list/edit page (no approve)
- `src/components/modules/PurchaseEntryPage.tsx` — single source of truth for creating / re-submitting purchases (status always SUBMITTED on save)
- `src/app/api/action/route.ts` — `approve-purchase` + `send-back-purchase` actions
- `src/lib/auth.ts` — `ALL_MODULES` now has `purchase-approvals` for the permission matrix
- `src/components/shared/PageHeader.tsx` — `Badge` now knows about `SUBMITTED`, `SENT_BACK`, `PARTIAL_RECEIVED`

## Notes for future agents

- The Purchase Approval page filters server-side via `?status=SUBMITTED` — this works because `buildWhere` in `src/lib/resources.ts` whitelists `status`. If you add more approval-related filters, make sure they are added to `buildWhere` too.
- The `send-back-purchase` action deliberately clears `approvedBy` / `approvedAt`. If you later add an audit log of approval history, snapshot those fields before clearing.
- Both Approve and Send-for-Edit are gated by `usePerm('purchase-approvals').canUpdate`. Admin role bypasses all checks. Non-admin users need explicit permission grants via the Manage Permissions page.
EOF
