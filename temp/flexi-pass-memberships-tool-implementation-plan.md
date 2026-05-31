# Flexi Pass Automation + Memberships Tool Implementation Plan

Date: 2026-05-28  
Repo: `casa-luma-sk`  
Primary area: `docs/casa-luma/memberships/`, receipt webhook automations, flexi validation, `/tools/memberships`

## Executive summary

### Does current automation handle flexi pass purchase items?

No — not as an automation that creates a durable membership/flexi record.

What exists today:

- Weekly/monthly membership purchases are automated through `src/lib/receipts/automations/membership-creation.ts` and are wired in `src/lib/server/membership-automation.ts`.
- Flexi pass purchase/usage handling exists only as receipt-history validation:
  - Flexi card purchase items are known in `src/lib/receipts/open-play-items.ts`.
  - `FLEXI_PASS_ENTRIES_PER_CARD = 11`.
  - `src/lib/server/db/flexi-pass-queries.ts` derives purchased/used/remaining counts from Neon receipt rows.
  - `src/lib/receipts/validation/rules/flexi-pass-entry.ts` warns when a `Flexi Single Entrance` receipt does not have enough derived remaining balance.
- `/tools/memberships` currently has only a manual flexi date helper (`today + 30`, `today + 60`). It does not show real flexi balances or records.

### Honest recommendation

Use a **local Neon flexi ledger as the authoritative operational database**, and show it inside the Memberships tool as a second entitlement type. Do **not** put flexi cards into the existing Notion `Memberships` database as the first choice.

Why:

1. The validation decision must be fast, exact, and receipt/event/idempotency aware. Neon is already the webhook ingestion source and can enforce uniqueness.
2. The existing Notion `Memberships` schema only has `Type = Weekly | Monthly`, dates, kids, notes, and formula status. Flexi requires entries granted/used/remaining, allocation, expiry, and source receipt/line provenance.
3. If we store derived flexi counts only in Notion, validation becomes slower and fragile; if we store in both Notion and Neon without careful ownership, balances can diverge.
4. Staff still need visibility. The UI can display the Neon ledger clearly in `/tools/memberships`, with explanatory cards and a link to the source receipts.

Optional later: mirror summary rows to Notion or create a dedicated Notion `Flexi Passes` database for staff reporting, but keep Neon as the validation source of truth.

## Important findings from code/docs

### Current membership automation

Relevant files:

- `docs/casa-luma/memberships/membership-automations.md`
- `src/lib/receipts/automations/membership-items.ts`
- `src/lib/receipts/automations/membership-creation.ts`
- `src/lib/server/membership-automation.ts`
- `src/routes/api/webhooks/receipt/+server.ts`

Flow:

1. Receipt webhook is ingested into Neon.
2. Automation runs only when ingestion returns `processed`.
3. Duplicate/stale webhook events skip automation.
4. Membership automation scans configured membership purchase item IDs.
5. For eligible sale receipts:
   - requires `customer_id`,
   - matches Notion Family by `Families.Loyverse Customer ID`,
   - computes inclusive dates,
   - checks Notion idempotency via family/date/type/kids/receipt provenance,
   - creates Notion `Memberships` row.
6. Refunds for membership purchases are partially handled now by appending refund provenance to Notes.

### Current flexi behavior

Relevant files:

- `docs/casa-luma/memberships/data-model.md`
- `docs/casa-luma/memberships/receipt-validation.md`
- `src/lib/receipts/open-play-items.ts`
- `src/lib/server/db/flexi-pass-queries.ts`
- `src/lib/receipts/validation/rules/flexi-pass-entry.ts`
- `src/lib/receipts/validation/validation-suite.test.ts`

Known item IDs:

| Purpose | Name | ID |
| --- | --- | --- |
| Usage | `Flexi Single Entrance` | `a94027fa-dd55-43d2-a031-b358877f4752` |
| Purchase | `Flexible Resident` | `483c66bc-ee06-411c-95b6-f39a7491d09a` |
| Purchase | `flexible Regular` | `360020d1-3ecd-43c2-97c8-c6ff4da754d4` |

Current validation logic:

- Card purchase quantity × 11 = entries purchased.
- `Flexi Single Entrance` quantity = entries used.
- Balance is cumulative by `customer_id` + optional `merchant_id` up to receipt date.
- Current validation has no dedicated pass/card records and no per-card expiry/allocation.

Notable gaps:

- Flexi purchase receipts do not create records.
- 60-day validity is mentioned in pricing copy, but not enforced in the balance query.
- Cancelled receipts are not filtered in the flexi balance query today.
- Refund receipts are skipped/excluded but do not necessarily subtract refunded purchase cards.
- There is no receipt-history detail returned to the memberships UI.
- Quantity policy differs: current receipt usage defaults missing quantity to 1, persisted history treats null quantity as 0.

### Current memberships UI

Relevant files:

- `src/routes/tools/memberships/+page.svelte`
- `src/routes/tools/memberships/MembershipDialog.svelte`
- `src/routes/tools/memberships/MembershipForm.svelte`
- `src/lib/memberships.remote.ts`
- `src/lib/server/memberships.ts`

Current UI behavior:

- Shows Notion memberships only.
- Create mode says memberships are auto-created after receipt closure; it does not show the form.
- Edit mode allows editing Notion membership details.
- Flexi helper is a simple date calculator, not real tracking.

UI bug/cleanup discovered:

- `MembershipDialog.svelte` calls `calculateEndDate(startDate, membershipType)` but no `calculateEndDate` function was found in that file. This should be fixed during UI work.
- UI date calculation differs from automation: UI weekly adds 7 days, automation uses inclusive `durationDays - 1` (weekly ends start + 6). Monthly UI uses `setMonth(+1)`, automation uses fixed 30-day inclusive duration (start + 29). This can make automated dates look overridden when edited.

## Product decisions to make before implementation

I recommend these defaults unless you choose otherwise:

1. **Authoritative source**: Neon flexi ledger, not Notion Memberships.
2. **UI location**: `/tools/memberships`, with tabs or sections for `Memberships` and `Flexi Passes`.
3. **Pass grant**: every flexi card line quantity grants `quantity × 11` entries.
4. **Validity**: enforce 60-day validity per purchased card/pass, because pricing says `Valid for 60 days`.
5. **Expiry boundary**: use inclusive end date: purchase date counts as day 1, expiry date = purchase date + 59 days. This mirrors membership automation’s inclusive model. If staff already use “today + 60” operationally, confirm and adjust.
6. **Usage allocation**: earliest-expiring valid pass first; tie-break by purchase date/receipt line.
7. **Family ownership**: resolve customer to Notion Family through `Loyverse Customer ID`; store both `customerId` and optional `familyId`/family name snapshot in the ledger.
8. **Missing family**: still create customer-level ledger record if customer exists, but flag an incident so staff can link the family. This prevents losing purchase history.
9. **Missing customer on flexi purchase**: do not create a ledger record; raise an automation incident.
10. **Refunds/cancellations**: start conservatively. Mark matching flexi purchase grants as `refunded`/`void` or create reversal ledger entries only when the receipt clearly references the original receipt. Otherwise raise manual-review incident.

## Proposed data model

### Option chosen: Neon ledger tables

Add two tables rather than storing mutable counters on one row. This keeps an auditable source of grants and usage allocations.

#### `flexi_passes`

One row per flexi card purchase line. If line quantity is > 1, either:

- Preferred: create one row per card unit for clear 11-entry allocation and expiry, or
- Alternative: create one row with `cards_purchased` and `entries_granted`.

I recommend one row per card unit when quantity is small; it makes expiry/allocation clear. If quantity may be large, use one row per line with entries granted.

Suggested columns:

- `id bigint primary key generated always as identity`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `merchant_id text not null`
- `customer_id text not null`
- `family_id text null` (Notion page ID snapshot)
- `family_name text null` (display snapshot)
- `source_receipt_key text not null`
- `source_receipt_number text not null`
- `source_line_index integer not null`
- `source_item_id text not null`
- `source_item_name text null`
- `card_index integer not null default 1` if splitting quantity into multiple card rows
- `entries_granted integer not null default 11`
- `valid_from timestamptz not null`
- `valid_until timestamptz not null`
- `status text not null default 'active'` values: `active`, `refunded`, `cancelled`, `void`, `manual_review`
- `refunded_by_receipt_key text null`
- `notes text null`

Indexes/constraints:

- Unique idempotency key:
  - if one row per card: `(source_receipt_key, source_line_index, card_index)`
  - if one row per line: `(source_receipt_key, source_line_index)`
- Index `(customer_id, merchant_id, valid_until)`
- Index `(family_id)`
- Index `(source_receipt_number)`

#### `flexi_pass_usages`

One row per allocated entry usage. If a receipt uses 2 entries, create 2 usage rows. This avoids partial allocation ambiguity.

Suggested columns:

- `id bigint primary key generated always as identity`
- `created_at timestamptz default now()`
- `merchant_id text not null`
- `customer_id text not null`
- `family_id text null`
- `pass_id bigint null references flexi_passes(id)`
- `source_receipt_key text not null`
- `source_receipt_number text not null`
- `source_line_index integer not null`
- `source_item_id text not null`
- `entry_index integer not null`
- `used_at timestamptz not null`
- `status text not null default 'active'` values: `active`, `refunded`, `cancelled`, `unallocated`, `manual_review`
- `reason text null`

Indexes/constraints:

- Unique usage idempotency: `(source_receipt_key, source_line_index, entry_index)`
- Index `(pass_id)`
- Index `(customer_id, merchant_id, used_at)`
- Index `(family_id)`

### Why not use existing Notion `Memberships` DB first?

The existing `Memberships` DB is duration/kids oriented. Flexi is punch-card oriented. Adding flexi into it would require schema changes (`Type = Flexi`, entry counts, remaining counts, validity, receipt provenance, status override, possibly usage relation). That is possible, but it makes validation depend on a Notion-shaped model or creates two sources of truth.

Use the same tool UI, not necessarily the same database.

### Optional Notion mirror later

If staff strongly want Notion visibility, add a Notion `Flexi Passes` database later with summary rows mirrored from Neon:

- Family relation
- Customer ID
- Receipt URL
- Valid From/Until
- Entries Granted/Used/Remaining formula or synced numbers
- Status
- Notes/provenance

If doing this, run `pnpm notion:generate` after Notion schema changes and import generated SDK concrete files only (`/db`, `/response.dto`, `/patch.dto`, `/constants`, `/types`).

## Backend implementation plan

### Phase 0 — Confirm policy and prepare docs

1. Confirm whether 60-day validity must be enforced now.
2. Confirm inclusive boundary (`purchase date + 59`) vs current helper style (`today + 60`).
3. Confirm refund/cancellation expectations.
4. Update docs with the chosen source-of-truth policy before code or in the same PR.

Docs to update:

- `docs/casa-luma/memberships/data-model.md`
- `docs/casa-luma/memberships/membership-automations.md`
- `docs/casa-luma/memberships/receipt-validation.md`

### Phase 1 — Add ledger schema

Files:

- `src/lib/server/db/schema.ts`
- New Drizzle migration under `drizzle/`

Tasks:

1. Add `flexiPasses` and `flexiPassUsages` tables.
2. Generate migration with `pnpm db:generate`.
3. Do not run `pnpm build`, `pnpm check`, or `svelte check` per repo guidance.
4. If applying migration in development is needed, use project migration script after confirmation.

### Phase 2 — Add flexi ledger service

New file suggestion:

- `src/lib/server/db/flexi-pass-ledger.ts`

Responsibilities:

- Create pass grants from purchase receipt lines idempotently.
- Allocate usage entries idempotently to valid active passes.
- Return summary balances for UI and validation.
- Return detailed pass cards and recent usage for expanded UI.
- Handle refunds/cancellations conservatively.

Core functions:

```ts
createFlexiPassesFromReceipt(input)
allocateFlexiUsageFromReceipt(input)
getFlexiBalanceForCustomer(input)
getFlexiPassesForFamily(input)
markFlexiPassesRefunded(input)
```

Balance shape for UI/validation:

```ts
type FlexiLedgerBalance = {
  customerId: string;
  familyId?: string | null;
  merchantId?: string;
  checkedAt: string;
  entriesPerCard: 11;
  cardsPurchased: number;
  activeCards: number;
  expiredCards: number;
  entriesGranted: number;
  entriesUsed: number;
  entriesExpired: number;
  entriesRemaining: number;
  nextExpiryAt: string | null;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
};
```

### Phase 3 — Add flexi purchase automation

New files:

- `src/lib/receipts/automations/flexi-pass-purchase.ts`
- `src/lib/receipts/automations/flexi-pass-purchase.test.ts`

Wire exports:

- `src/lib/receipts/automations/index.ts`

Wire default suite:

- `src/lib/server/membership-automation.ts` (or rename later to `receipt-automation.ts`)

Behavior:

1. Scan receipt lines for `FLEXI_CARD_ITEM_IDS`.
2. If no matching item, skip.
3. If refund receipt:
   - find matching pass grants by `refund_for` receipt number where item IDs match,
   - mark as refunded when safe,
   - otherwise emit manual-review skipped warning.
4. If cancelled receipt:
   - skip creation and emit warning.
5. Require `customer_id`.
6. Attempt to resolve Family by Loyverse customer ID.
7. Create ledger pass rows idempotently.
8. Return completed result `FLEXI_PASSES_CREATED` with details.

Provenance details:

- receipt number/key
- line index
- item ID/name
- quantity/cards
- entries granted
- valid from/until
- family/customer

Webhook incident mapping changes:

- Extend `getAutomationIncidentSeverity` in `src/routes/api/webhooks/receipt/+server.ts`:
  - `FLEXI_PASSES_CREATED` -> `info` (or no incident if too noisy)
  - failed flexi automation -> `critical`
  - skipped with `incidentCode` -> `warning`
- Extend `getAutomationIncidentCode` for flexi codes.

### Phase 4 — Decide usage allocation timing

There are two implementation paths:

#### Path A: validation-only allocation later

Keep validation read-only initially. It calculates ledger balance but does not write usage allocation rows. This is simpler but does not satisfy “valid entry will deduct entries left” as a durable record.

#### Path B: automate usage allocation on every valid flexi entry

Recommended.

Add a second automation:

- `src/lib/receipts/automations/flexi-pass-usage.ts`

Behavior:

1. Scan receipt for `FLEXI_SINGLE_ENTRANCE_ITEM_ID`.
2. Skip if none.
3. Skip/flag refund/cancel according to policy.
4. Require customer.
5. Resolve family if possible.
6. Allocate each entry to active unexpired passes using earliest-expiry-first.
7. If not enough entries:
   - create unallocated usage rows with `manual_review` or do not create usage rows and let validation alert.
   - I recommend allocating what is available and creating `unallocated` rows for excess, with a validation incident.
8. Idempotency by receipt key + line index + entry index.

Order in automation suite:

1. Membership creation.
2. Flexi pass purchase creation.
3. Flexi usage allocation.
4. Validation.

Because route already runs automations before validation, validation can inspect the ledger after current usage allocation. However, validation must be careful to compute `remainingBeforeCurrentReceipt` for alert language. The usage allocator can return before/after counts and validation can use a `currentReceiptKey` exclusion.

### Phase 5 — Update validation to use ledger

Files:

- `src/lib/receipts/validation/rules/flexi-pass-entry.ts`
- `src/lib/server/db/flexi-pass-queries.ts` or new ledger query
- Tests in `src/lib/receipts/validation/validation-suite.test.ts`

Options:

- Keep `queryFlexiPassBalanceForCustomer` as receipt-history fallback.
- Add `queryFlexiLedgerBalanceForCustomer` and make validation use it by default.
- For transition safety, if ledger has no rows for a customer but receipt history shows purchases, flag a reconciliation warning or fallback temporarily.

Validation should check:

- customer exists,
- family can be resolved or customer-level ledger exists,
- active/unexpired remaining entries before current receipt >= current receipt entries,
- pass validity is within 60-day window,
- no cancelled/refunded pass is counted.

New/updated finding details:

- `entriesRemainingBeforeCurrentReceipt`
- `entriesRemainingAfterCurrentReceipt`
- `activeCards`
- `expiredCards`
- `nextExpiryAt`
- `allocatedPassIds`
- `unallocatedEntries`
- `ledgerSource: 'flexi_pass_ledger'`

Update compact incident details and Telegram formatting so staff can see why a flexi entry is invalid.

### Phase 6 — Backfill existing flexi history

Add a one-off script:

- `scripts/backfill-flexi-pass-ledger.ts`

Behavior:

1. Read existing Neon receipts/line items with flexi purchase/usage item IDs.
2. Process chronologically per merchant/customer.
3. Create pass grants idempotently.
4. Allocate usages idempotently.
5. Produce summary:
   - customers processed,
   - passes created,
   - usages allocated,
   - unallocated/negative cases,
   - expired cases,
   - missing customer/family cases.

Do not run a destructive backfill automatically. First run in dry-run mode and write output to `temp/`.

## UI implementation plan for `/tools/memberships`

### Main UX goal

Make flexi behavior visible where staff already look, without hiding rules in docs.

Add clear on-page explanations:

- “Flexi cards are created automatically from `Flexible Resident` / `flexible Regular` receipts.”
- “Each card grants 11 entries.”
- “Entries are deducted automatically when `Flexi Single Entrance` receipts are closed.”
- “Valid entries use the earliest-expiring pass first.”
- “Attach the Loyverse customer/family to every receipt; missing customer means the pass/entry cannot be assigned.”
- “60-day validity is enforced from purchase date.”

### Suggested UI structure

Replace the current single list + helper with either:

#### Option 1: Tabs

- `Memberships`
- `Flexi Passes`
- `Rules / Help`

#### Option 2: Combined family entitlement cards

Each family row can show:

- Membership chips: Weekly/Monthly active dates.
- Flexi chip: `8 entries left · next expires 12 Jun`.
- Expand row for full pass/usage ledger.

I recommend tabs first because it is simpler and keeps the current memberships list stable.

### Flexi Passes tab/card contents

Collapsed row:

- Family name / customer code / phone.
- `Flexi: 8 left` chip.
- `2 active cards` chip.
- `Next expiry: 12 Jun 2026` chip.
- Warning chip if negative/unallocated/missing family.

Expanded details:

- Explanation banner for this family:
  - `Purchased: 22 entries`
  - `Used: 14`
  - `Remaining: 8`
  - `Expired: 0`
- Cards table:
  - purchase date,
  - valid until,
  - entries granted,
  - used,
  - remaining,
  - status,
  - source receipt link.
- Recent entries table:
  - used at,
  - source receipt,
  - allocated pass,
  - status/reason.
- Staff notes:
  - if missing family/customer,
  - if unallocated entries exist,
  - if receipt history and ledger disagree.

### API additions

New remote module or extend current one:

- `src/lib/flexi-passes.remote.ts`, or extend `src/lib/memberships.remote.ts` if keeping everything under memberships tool.

Suggested queries:

```ts
getFlexiPassSummaries({ cursor?, search?, pageSize?, status? })
getFamilyFlexiPassDetails({ familyId })
getCustomerFlexiPassDetails({ customerId })
```

Server file:

- `src/lib/server/flexi-passes.ts`

Search behavior:

- Use `queryFamilyMatches(search)` to find family IDs and customer IDs.
- Also search `customer_id`, family name snapshot, receipt number in ledger.
- Avoid N+1 queries by returning summary rows from ledger first and lazy-loading details on expand.

### Replace current date helper

Current helper is useful but misleading. Options:

1. Remove it after real flexi validity appears.
2. Rename it to “Manual date helper (not saved)” and place it in `Rules / Help`.
3. Keep it temporarily with clear text: “This only copies a date; it does not create or update flexi pass records.”

I recommend replacing it with a real rules card plus a smaller manual calculator if staff still need it.

### Fix UI date mismatch while touching memberships

- Add a shared date helper for membership durations used by edit UI.
- Align edit UI with automation: weekly inclusive 7 days = start + 6; monthly fixed 30 days = start + 29, unless product wants calendar-month behavior.
- Define and import `calculateEndDate` or remove the broken call.

## Validation and test plan

Do not run in this repo:

- `pnpm check`
- `svelte check`
- `pnpm build`

Targeted tests to add/run:

### Automation tests

- `src/lib/receipts/automations/flexi-pass-purchase.test.ts`
- `src/lib/receipts/automations/flexi-pass-usage.test.ts`

Cases:

1. Creates 11-entry pass for one card purchase.
2. Creates 22 entries / two card units for quantity 2.
3. Skips non-flexi receipt.
4. Fails/incident for missing customer.
5. Creates customer-level record and incident for missing family, if chosen.
6. Idempotency: same receipt/line does not duplicate passes.
7. Cancelled receipt skips/flags.
8. Refund receipt marks matching pass refunded.
9. Corrected receipt with changed quantity triggers manual review or updates according to policy.

### Ledger tests

New test file near server DB helpers.

Cases:

1. Earliest-expiring-first allocation.
2. Expired passes do not count.
3. Purchase date validity boundary.
4. Multiple cards and multiple usage entries.
5. Unallocated entries when insufficient balance.
6. Refund/cancel status excludes entries.
7. Current receipt before/after balance is computed correctly.
8. Multiple merchants with same customer ID do not mix when merchant is provided.

### Validation tests

Update `src/lib/receipts/validation/validation-suite.test.ts`:

1. Allows valid flexi entry with ledger balance.
2. Rejects no active/unexpired pass.
3. Rejects insufficient remaining entries.
4. Rejects expired-only passes.
5. Missing customer still short-circuits.
6. Details include active/expired/remaining fields.

### Incident/Telegram tests

Update:

- `src/lib/server/incidents/telegram.ts`
- `src/lib/server/incidents/telegram.test.ts`
- compact detail picker in webhook route

Cases:

1. Telegram shows remaining before/after.
2. Telegram shows active cards / next expiry when available.
3. Telegram shows unallocated/expired reason clearly.

### UI tests/manual checks

If e2e is too heavy, do a focused manual dev-server check via tmux/browser:

1. `/tools/memberships` loads with Memberships tab.
2. Flexi tab shows rules card.
3. Search by family/customer finds flexi summary.
4. Expand shows pass cards and entry rows.
5. Missing/negative/unallocated states are visually clear.
6. New copy explains automatic creation/deduction.

## Subagent orchestration plan for maximal context efficiency

Already used for this planning pass:

- `context-builder` #1: membership automation data flow.
- `context-builder` #2: flexi validation/Neon balance logic.
- `context-builder` #3: memberships tool UI/server APIs.

Artifacts:

- `temp/flexi-plan-subagents/membership-automation-context.md`
- `temp/flexi-plan-subagents/flexi-validation-context.md`
- `temp/flexi-plan-subagents/memberships-ui-context.md`

Recommended implementation split:

### Milestone 1: Read-only planning + schema design

Parallel read-only agents:

1. **Schema planner** (`planner` or `context-builder`)
   - Owns Drizzle schema, migrations, ledger source-of-truth, backfill shape.
   - Output: exact table definitions and migration notes.
2. **Automation planner** (`context-builder`)
   - Owns receipt automation shape, idempotency, incident codes, refund/cancel flow.
   - Output: exact module/test list and result code contract.
3. **UI planner** (`context-builder`)
   - Owns `/tools/memberships` layout and remote API contract.
   - Output: component/API plan with copy text.
4. **Validation planner** (`context-builder`)
   - Owns ledger-backed validation and Telegram details.
   - Output: validation contract and test list.

Parent synthesizes decisions and asks user only for unresolved product policy questions.

### Milestone 2: Single writer — backend ledger + purchase automation

One `worker` only.

Scope:

- Drizzle schema + migration.
- `flexi-pass-ledger.ts`.
- `flexi-pass-purchase.ts`.
- Default automation suite wiring.
- Targeted unit tests.

No UI changes in this milestone except docs if necessary.

Validation:

- Run targeted Vitest files only.
- Do not run broad checks/build.

### Milestone 3: Fresh-context review fanout

Parallel reviewers:

1. Correctness/idempotency/refund/cancel.
2. DB schema/query performance and migration safety.
3. Tests/validation coverage.

Parent synthesizes fixes. One fix worker applies accepted fixes.

### Milestone 4: Single writer — usage allocation + validation

One `worker` only.

Scope:

- Flexi usage automation or ledger allocation call.
- Validation rule uses ledger.
- Incident details/Telegram formatting.
- Tests.

Review fanout again.

### Milestone 5: Single writer — UI/API/docs

One `worker` only.

Scope:

- `src/lib/server/flexi-passes.ts`.
- Remote API.
- `/tools/memberships` tabs/sections/cards.
- Rules/help copy in UI.
- Fix `MembershipDialog.svelte` date helper bug and date mismatch.
- Docs update.

Review fanout:

1. UI behavior/copy clarity.
2. Server/API correctness/performance.
3. Regression review for existing membership tool.

### Milestone 6: Backfill/reconciliation

One `worker` for script + dry-run output.

Scope:

- Backfill script.
- Dry-run/reconciliation report.
- Manual review list for missing customers/families/negative balances.

Review with one DB-focused reviewer before any live migration/backfill.

## Missing pieces / extra recommendations

1. **Flexi expiry is the biggest missing rule.** Current validation may allow entries from old purchases forever. If the business promise is 60 days, implement expiry with the ledger.
2. **Cancelled receipts currently likely count in flexi balance.** Fix this even if ledger work is delayed.
3. **Refund policy is incomplete for flexi.** Decide whether refunded card purchases revoke unused entries, create negative adjustments, or only flag staff.
4. **Backfill is necessary.** If the ledger starts empty, existing customers will appear to have zero flexi passes unless we backfill or temporarily fallback to receipt-history balance.
5. **Avoid two sources of truth.** UI can display Notion memberships and Neon flexi passes together, but validation should not depend on Notion flexi rows.
6. **Expose operational rules in UI.** Add a clear `How Flexi works` card directly in the Memberships tool.
7. **Add reconciliation visibility.** A small warning state for `unallocated entries`, `missing family`, `expired`, and `negative balance` will help staff fix data instead of silently trusting automation.
8. **Consider a family detail endpoint that includes `loyverseCustomerId`.** `FamilySummary` already has this field in `families.server.ts`, but memberships UI local types omit it in places.
9. **Keep completed automation incidents low-noise.** `MEMBERSHIP_CREATED` currently reports info incidents. If flexi purchases are frequent, consider reporting only failures/warnings and surfacing successful creation in UI/receipt details instead.
10. **Create shared duration/date helpers.** Membership and flexi date calculations should live in one module with tests to avoid UI/automation drift.

## Suggested immediate next step

Before writing implementation code, answer these policy questions:

1. Should flexi entries expire after 60 days from purchase and should validation enforce that now?
2. Should the expiry be inclusive (`purchase date + 59`) or match the current helper (`today + 60`)?
3. Should successful flexi pass purchases create only local Neon ledger records, or do you also want a Notion mirror now?
4. For refunded flexi purchases, should automation revoke remaining entries automatically or flag for manual review first?

My default recommendation: Neon ledger now, enforce 60-day inclusive validity, earliest-expiring-first deduction, UI display in `/tools/memberships`, and postpone Notion mirror until the operational model proves stable.
