# Flexi-pass validation and Neon receipt-history balance context

## Scope reviewed

- `src/lib/receipts/validation/rules/flexi-pass-entry.ts`
- `src/lib/server/db/flexi-pass-queries.ts`
- `src/lib/receipts/open-play-items.ts`
- `src/lib/receipts/validation/validation-suite.test.ts`
- `src/routes/api/webhooks/receipt/+server.ts`
- `src/lib/server/incidents/telegram.ts` and `src/lib/server/incidents/telegram.test.ts`
- Related receipt ingestion path: `src/lib/server/db/ingest-receipt-core.ts`
- Docs/plan references: `docs/receipts/validation-and-alerts.md`, `docs/casa-luma/memberships/data-model.md`, `temp/membership-flexi-receipt-validation-plan.md`

## Current behavior

### Open-play flexi constants

`src/lib/receipts/open-play-items.ts:1-10`

- The source-of-truth comment says these IDs come from Notion “Open Play POS Items”; the relevant pages expose UUIDs via the Notion item `ID`/`userDefined ID` field, while `LoyverseID` is blank.
- Current IDs:
  - `FLEXI_SINGLE_ENTRANCE_ITEM_ID = 'a94027fa-dd55-43d2-a031-b358877f4752'`
  - `FLEXIBLE_RESIDENT_ITEM_ID = '483c66bc-ee06-411c-95b6-f39a7491d09a'`
  - `FLEXIBLE_REGULAR_ITEM_ID = '360020d1-3ecd-43c2-97c8-c6ff4da754d4'`
  - `FLEXI_CARD_ITEM_IDS = [resident, regular]`
  - `FLEXI_PASS_ENTRIES_PER_CARD = 11`

Docs mirror this in `docs/casa-luma/memberships/data-model.md:17-35`.

### Validation rule behavior

`src/lib/receipts/validation/rules/flexi-pass-entry.ts:10-18`

- `createFlexiPassEntryRule` accepts `skipRefunds?: boolean` and injectable `lookupFlexiBalance(input)`.
- Lookup input includes `customerId`, optional `merchantId`, cutoff `at`, optional `currentReceiptKey`, and `currentReceiptEntries`.

`src/lib/receipts/validation/rules/flexi-pass-entry.ts:21-32`

- `hasCustomer` requires a non-empty trimmed string.
- `quantityForItem` sums matching line-item quantities; if quantity is missing/non-finite it defaults to `1`.
- Receipt date selection is `receipt.receipt_date ?? receipt.created_at ?? context.eventCreatedAt ?? new Date().toISOString()`.

`src/lib/receipts/validation/rules/flexi-pass-entry.ts:39-83`

- Skips refunds by default when `receipt.receipt_type === 'REFUND'`.
- Counts only current receipt lines whose `item_id` equals `FLEXI_SINGLE_ENTRANCE_ITEM_ID`.
- If current receipt has no flexi usage (`currentReceiptEntries <= 0`), returns no finding and does not call Neon.
- If customer is missing, immediately returns warning `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS` with reason `missing_customer`; lookup is not called.
- If customer exists, calls Neon balance helper and allows the receipt when `balance.remainingBeforeCurrentReceipt >= currentReceiptEntries`.

`src/lib/receipts/validation/rules/flexi-pass-entry.ts:84-108`

- If insufficient, reason is:
  - `no_flexi_purchase` when `balance.entriesPurchased <= 0`
  - otherwise `insufficient_remaining_entries`
- Finding details include current entries, usage item info, purchase item IDs, pass entries/card, cards/entries purchased, entries used including current, remaining before/after, and first/last purchase dates.

### Neon receipt-history balance helper

`src/lib/server/db/flexi-pass-queries.ts:10-21`

- `FlexiPassBalance` is a cumulative summary: cards purchased, entries purchased, entries used including current receipt, current receipt entries, remaining before/after current receipt, first/last purchase timestamps.

`src/lib/server/db/flexi-pass-queries.ts:31-47`

- `queryFlexiPassBalanceForCustomer` validates cutoff `at`; invalid dates throw `Invalid flexi balance cutoff date: ...`.

`src/lib/server/db/flexi-pass-queries.ts:49-67`

- It queries `receipt_line_items` joined to `receipts` with filters:
  - `receipts.customerId = customerId`
  - receipt type is null or not `REFUND`
  - `receipts.receiptDate <= atDate OR receipts.createdAt <= atDate`
  - line item is one of flexi card purchase IDs or flexi single entrance usage ID
  - optional same `merchantId`

`src/lib/server/db/flexi-pass-queries.ts:69-95`

- For each returned row:
  - quantity is `0` if null/non-finite (`asFiniteQuantity`), unlike current receipt rule which defaults missing/non-finite usage quantity to `1`.
  - card purchase rows increment `cardsPurchased` by quantity and update first/last purchase date using `receiptDate ?? createdAt`.
  - single-entrance rows increment `entriesUsedIncludingCurrent` by quantity.
- If `currentReceiptKey` is provided and no queried row matches both current receipt key and usage item ID, it adds `currentReceiptEntries`. Comment explains this handles missing `receipt_date` in Neon causing the just-ingested usage to miss the cutoff query.
- Entries are cumulative: `entriesPurchased = cardsPurchased * 11`; `remainingAfter = entriesPurchased - entriesUsedIncludingCurrent`; `remainingBefore = remainingAfter + currentReceiptEntries`.

### Webhook order matters

`src/routes/api/webhooks/receipt/+server.ts:235-289`

- The webhook first ingests the receipt into Neon (`ingestReceiptWebhook`), then runs automations, then runs validation.
- The validation context includes merchant ID, receipt key, event type, and event created_at.

`src/lib/server/db/ingest-receipt-core.ts:232-303`

- Ingestion upserts the receipt and deletes/reinserts line items for the receipt key in one transaction.
- Therefore current validation generally sees the current receipt in Neon, unless the helper’s date cutoff excludes it; this is why `currentReceiptEntries` is added when the current receipt row is missing from the helper result.

`src/lib/server/db/ingest-receipt-core.ts:202-229`

- Duplicate webhook events return `duplicate`; stale events return `stale`; validation only runs when result status is `processed` (`+server.ts:239`).

### Incident/report formatting

`src/routes/api/webhooks/receipt/+server.ts:156-167`

- Compact finding details retained for flexi incidents are only: `reason`, `checkedDate`, `customerId`, `currentReceiptEntries`, `cardsPurchased`, `entriesPurchased`, `entriesUsedIncludingCurrent`, `remainingBeforeCurrentReceipt`, `remainingAfterCurrentReceipt`.
- The incident payload contains full validation findings separately, but Telegram formatting uses compact `primaryFindingDetails`.

`src/lib/server/incidents/telegram.ts:241-262`

- Telegram flexi details currently format:
  - `Reason: ...`
  - `Customer: ...`
  - `Current entries: ...`
  - `Remaining: before X; after Y`
  - `Flexi history: purchased X; used Y`
- It does not display cards purchased, first/last purchase, record IDs, or expiry information.

`src/lib/server/incidents/telegram.test.ts:140-165`

- Existing test asserts Telegram body includes `Remaining: before 0; after -1` and `Flexi history: purchased 11; used 12`.

## Existing validation tests

`src/lib/receipts/validation/validation-suite.test.ts:309-322`

- Missing customer on a flexi entry produces `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS` with `reason = missing_customer`, and Neon lookup is not called.

`src/lib/receipts/validation/validation-suite.test.ts:324-346`

- Enough remaining passes produces no finding; lookup is called with `currentReceiptEntries: 1`.

`src/lib/receipts/validation/validation-suite.test.ts:348-370`

- No passes remaining produces the flexi finding with `reason = insufficient_remaining_entries`.

Gaps in current tests:

- No direct tests for `queryFlexiPassBalanceForCustomer`; no DB-backed or mocked DB aggregation tests exist.
- No test for `no_flexi_purchase` reason.
- No test for multiple flexi single-entrance line items or quantity > 1.
- No test for missing/non-finite/zero/negative quantities, and validation/query helpers currently treat them differently.
- No test for refund skipping in flexi rule.
- No test that lookup receives `merchantId`, `at`, or `currentReceiptKey`.
- No test for current receipt fallback when the row is omitted by cutoff/date conditions.
- No test for multiple merchants sharing a customer ID.
- No test for purchase and usage on the same receipt/date, or receipt_date vs created_at ordering.

## Behavior if dedicated flexi pass records are introduced

“Dedicated flexi pass records” are not present in the current schema/code searched. Current balance is entirely inferred from receipt history: flexi card purchase line items create `entriesPurchased`; flexi single entrance line items create `entriesUsedIncludingCurrent`.

If a new dedicated table/model records flexi passes (e.g. pass grants, per-card balances, expiry, or usage ledger), these gaps/risks appear:

1. **Double counting risk**
   - If dedicated records are created from the same receipts while `queryFlexiPassBalanceForCustomer` still counts receipt purchase/usage lines, balances can be inflated or depleted twice.
   - A migration needs a single source of truth or a clearly defined reconciliation mode.

2. **Current `FlexiPassBalance` shape may be too coarse**
   - Existing type only exposes cumulative card/entry totals and first/last purchase dates (`flexi-pass-queries.ts:10-21`).
   - Dedicated records likely need fields such as `passRecordId`, `originReceiptKey`, `expiresAt`, `entriesGranted`, `entriesRemaining`, `status`, `usageAllocations`, or `unmatchedUsageCount`.
   - Webhook compact details and Telegram formatting currently drop anything outside the small picked set (`+server.ts:156-167`), so new fields will not show in alerts unless added there and in `telegram.ts`.

3. **Allocation semantics become important**
   - Receipt-history logic is cumulative and does not care which card a usage consumes.
   - Dedicated records need an allocation rule: FIFO by purchase date? earliest expiry first? only active/non-expired passes? allow negative balance on latest pass? handle multiple cards bought at once?
   - The old cumulative check (`remainingBefore >= currentReceiptEntries`) may allow cases a per-card/expiry model should reject, or reject cases that should be valid after manual adjustment.

4. **Refund/cancellation semantics need explicit design**
   - Current helper skips receipt type `REFUND` rows but does not subtract refunded purchases or restore refunded usage unless refund receipts have their own line-item effects and are included/excluded intentionally.
   - Dedicated records need clear handling for refunded card purchases, refunded entries, cancelled receipts, voids, and stale webhook updates.

5. **Idempotency and stale events**
   - Receipt ingestion already gates duplicate/stale events before validation, but dedicated records would need idempotent upsert/delete behavior tied to `receiptKey` and `lineIndex` or a stable source event ID.
   - Updates to an existing receipt delete/reinsert receipt lines (`ingest-receipt-core.ts:292-303`); dedicated pass records must mirror this or derive from final receipt state.

6. **Date cutoff may no longer be enough**
   - Current query includes records when either `receiptDate` or `createdAt` is before cutoff (`flexi-pass-queries.ts:49-53`). This can include rows with one timestamp before and another after the cutoff.
   - Dedicated records should define a canonical effective timestamp (`effectiveAt`) and tie current receipt exclusion/inclusion to receipt key, not ambiguous OR date conditions.

7. **Customer identity changes**
   - Current model keys only by `receipts.customerId` plus optional merchant. If a receipt’s customer is corrected later, receipt-history balance automatically follows current ingested receipt state.
   - Dedicated records need a policy for customer changes: move ledger records, preserve original customer, or reconcile from receipt history.

8. **Quantity policy mismatch**
   - Rule defaults missing/non-finite current receipt quantity to `1` (`flexi-pass-entry.ts:24-29`), but DB history treats null/non-finite as `0` (`flexi-pass-queries.ts:23-24`). Dedicated records should choose one policy and tests should lock it.

## Edge cases to consider/cover

- Current receipt with `quantity: 2` flexi single entrances and only one pass remaining should flag; with two remaining should pass.
- Multiple line items for the same flexi usage item should sum.
- Missing `lineItem.quantity`: current receipt currently counts as 1; persisted/history row counts as 0 if null. Decide and test.
- Quantity `0` or negative quantity: current rule returns null when total `<= 0`; DB helper can decrease usage/purchases with negative values if present. Decide whether to clamp, reject, or treat as refund/adjustment.
- Invalid/missing receipt dates: rule falls back to current time if receipt/context dates are all missing; DB helper throws only if the final `at` string is invalid. This may make tests time-dependent unless date is provided.
- `receipt_date` missing but `created_at` present: current fallback should include/exclude correctly. There is a helper patch for current receipt rows missed by date cutoff.
- Same customer ID across merchants: helper filters by merchant only if provided; webhook provides merchant ID, but unit callers might not.
- Receipt contains both flexi card purchase and flexi single entrance: cumulative history allows same-receipt purchase to cover same-receipt usage if timestamp/cutoff includes both.
- Future-dated purchases: should not count because cutoff filters by receipt/created date <= current checked date, but OR timestamp condition may include if either timestamp is <= cutoff.
- Backdated receipt updates: stale-event handling prevents older webhook event from overwriting newer receipt state, but balance chronology can still change if a processed receipt has older `receipt_date` than event time.
- Refund receipts: flexi rule skips validation on refund current receipts; DB helper excludes all refund rows. If refund rows are meant to reverse balances, this is not modeled.
- Cancelled receipts: flexi helper does not filter `cancelledAt`; flexi validation rule does not skip cancelled receipts unless they are refunds.
- No purchase history: should be `no_flexi_purchase`; currently not explicitly tested.
- Alert detail loss: first/last purchase dates are returned by validation details but not included in compact incident details or Telegram output.

## Suggested tests for next implementation/planning

Targeted validation-rule tests in `src/lib/receipts/validation/validation-suite.test.ts`:

1. `skips flexi validation for refunds by default`.
2. `uses no_flexi_purchase when entriesPurchased is 0`.
3. `sums multiple flexi single-entrance lines and quantity > 1`.
4. `passes merchantId, checked at date, receiptKey, and currentReceiptEntries to lookup`.
5. `does not call lookup for non-flexi receipt`.
6. If quantity policy changes, explicit tests for missing/non-finite/zero/negative quantity.

DB/helper tests (new file may be needed; there are no existing server DB tests in `src/lib/server/db`):

1. Aggregates resident + regular card purchases as `quantity * 11`.
2. Counts usages including current and computes before/after correctly.
3. Adds `currentReceiptEntries` when current receipt key usage row is absent from query rows.
4. Filters out refunds and other merchants.
5. Honors cutoff chronology and documents receipt_date/created_at precedence/OR behavior.
6. Handles null quantities consistently with chosen policy.

Incident tests in `src/lib/server/incidents/telegram.test.ts` and/or webhook detail tests:

1. Preserve existing flexi alert lines (`Remaining`, `Flexi history`).
2. If dedicated records add fields (e.g. pass record IDs/expiry), update `getCompactFindingDetails` in `+server.ts` and `formatFlexiDetails` in `telegram.ts`, then test the new lines.
3. Missing customer flexi alert currently has no balance lines; test the intended compact output if it matters operationally.

## Implementation constraints and risks

- Project AGENTS says **do not run `pnpm check`, `svelte check`, or `pnpm build`**. Use targeted tests only, e.g. `pnpm vitest src/lib/receipts/validation/validation-suite.test.ts src/lib/server/incidents/telegram.test.ts` if needed by a future agent.
- If Notion/Open Play item schema changes, project guidance says run `pnpm notion:generate`; this task did not require schema changes.
- Avoid importing generated Notion DB barrels from server/runtime code per `AGENTS.md`; not directly relevant unless dedicated records use Notion SDK.
- Current validation wraps warning findings into critical webhook incidents (`+server.ts:305-313`), so changing severity may not change alert severity unless webhook incident logic changes too.
- Current code has no dedicated flexi ledger. Any move from receipt-history inference to dedicated records needs explicit source-of-truth and migration/reconciliation decisions before implementation.
