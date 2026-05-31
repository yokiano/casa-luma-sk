# Membership automation data-flow context for flexi-card purchase planning

Scope reviewed: `docs/casa-luma/memberships/*`, `src/lib/receipts/automations/*`, `src/lib/server/membership-automation.ts`, `src/routes/api/webhooks/receipt/+server.ts`, plus adjacent flexi validation/constants and receipt ingestion code needed to understand idempotency.

## What exists now

### Webhook ingestion and automation order

- Receipt webhook route: `src/routes/api/webhooks/receipt/+server.ts`.
  - Parses either single `payload.items` receipt or batch `payload.receipts` after requiring `merchant_id`, `type`, and `created_at` (`+server.ts:43-72`).
  - Optional shared-secret check uses `LOYVERSE_WEBHOOK_SECRET` and `x-webhook-token` (`+server.ts:183-190`).
  - For each receipt, calls `ingestReceiptWebhook(receiptPayload)` first (`+server.ts:235-237`).
  - **Automations only run when ingestion returns `processed`**, not `duplicate` or `stale` (`+server.ts:239-249`). This matches docs intent (`docs/casa-luma/memberships/membership-automations.md:11-18`).
  - Automation incidents are reported before validation; completed `MEMBERSHIP_CREATED` becomes `info`, failed automation results become `critical`, skipped results with `details.incidentCode` become `warning` (`+server.ts:96-107`, `+server.ts:251-280`).
  - Validation then runs after automations (`+server.ts:283-336`).

### Receipt ingestion idempotency foundation

- `src/lib/server/db/ingest-receipt-core.ts` creates a webhook event `dedupeKey` from merchant, event type, event created time, receipt number, receipt updated time, and total (`ingest-receipt-core.ts:193-212`).
- Duplicate webhook event -> returns `{ status: 'duplicate', receiptKey }` and route skips automations (`ingest-receipt-core.ts:214-216`, `+server.ts:239`).
- Older event than already-applied receipt update -> returns `{ status: 'stale', receiptKey }` and route skips automations (`ingest-receipt-core.ts:218-230`, `+server.ts:239`).
- Processed events upsert receipt row and replace line-item/detail rows in Neon (`ingest-receipt-core.ts:232-310`).
- Important: Notion writes are outside this DB transaction, so automation code also needs its own idempotency checks.

### Generic receipt automation runner

- `src/lib/receipts/automations/types.ts` defines `ReceiptAutomation`, result statuses (`skipped|completed|failed`), and context (`merchantId`, `receiptKey`, `eventType`, `eventCreatedAt`, `receiptUrl`).
- `src/lib/receipts/automations/index.ts` runs automations sequentially, flattens arrays of results, converts thrown errors to failed `AUTOMATION_EXECUTION_ERROR:<code>`, and counts statuses (`index.ts:24-53`).

### Current membership-purchase automation

- Default suite is only membership creation: `createDefaultReceiptAutomationSuite()` returns `[createMembershipFromReceiptAutomation({ deps: createNotionMembershipAutomationDeps() })]` (`src/lib/server/membership-automation.ts:185-187`).
- Membership purchase item config is hardcoded in `src/lib/receipts/automations/membership-items.ts`:
  - Weekly item `fc7b05a3-8898-4bcb-bf7e-3769ee67ba3c`, 7 days (`membership-items.ts:12-18`).
  - Monthly item `4dec5920-72ee-498e-bc41-482724bedcbc`, 30 days (`membership-items.ts:19-24`).
  - Docs note these item IDs come from Notion Open Play POS Items `ID` / `userDefined:ID`, because `LoyverseID` is blank (`membership-items.ts:10-11`; `docs/.../data-model.md:13-15`).
- Automation grouping logic:
  - Scans `receipt.line_items` for configured membership purchase item IDs (`membership-creation.ts:100-116`).
  - Groups by item/type/duration; aggregates line quantity into `numberOfKids`, using `1` for invalid/nonpositive quantities and truncating finite positive quantities (`membership-creation.ts:95-112`).
  - Different membership item types in one receipt create separate result groups.
- Creation flow for a sale receipt:
  - Missing customer -> failed result with `incidentCode: MEMBERSHIP_CREATION_MISSING_CUSTOMER` (`membership-creation.ts:247-257`).
  - Start date is receipt date, then receipt created_at, then webhook event created_at (`membership-creation.ts:71-93`, `membership-creation.ts:259-268`).
  - Family is resolved by Loyverse customer ID (`membership-creation.ts:270-280`).
  - End date is inclusive: `durationDays - 1` from start (`membership-creation.ts:87-90`, `membership-creation.ts:282`).
  - Existing automated membership check uses family/type/kids/start/end plus receipt provenance before creating (`membership-creation.ts:282-307`).
  - Creates Notion Membership with relation, type, kid count, dates, notes provenance, and receipt URL (`membership-creation.ts:309-346`; Notion dependency implementation below).
- Notes provenance currently includes:
  - `Created automatically from Loyverse receipt.`
  - receipt number, receipt key, Loyverse item ID/label, receipt line indexes, number of kids, webhook event created at, and refund/correction policy (`membership-creation.ts:119-140`).

### Notion dependency implementation for membership automation

- `src/lib/server/membership-automation.ts` owns production deps for Notion.
- Family lookup:
  - Queries Families where `loyverseCustomerId contains <normalized>`, then exact normalized equality in memory (`membership-automation.ts:70-91`).
- Existing-membership idempotency check:
  - Queries Memberships by family relation (`membership-automation.ts:94-101`).
  - Converts to local shape and finds same type, number of kids, exact start/end dates, and notes containing receipt number, receipt key, and item ID (`membership-automation.ts:23-31`, `membership-automation.ts:103-114`).
- Create membership:
  - Name format: `<Family Name> - <Type> - <N> kid(s)` (`membership-automation.ts:18-21`).
  - Writes Membership properties `name`, `type`, `numberOfKids`, `family`, `startDate`, `endDate`, `notes`, `receipt` (`membership-automation.ts:159-182`).
- Refund handling:
  - Can find automated memberships by original receipt number and item IDs in Notes (`membership-automation.ts:117-137`).
  - Marks refunded by appending a refund note only; **Status is a formula and is not writable** (`membership-automation.ts:139-150`).
  - `appendRefundNote` is idempotent per refund receipt number (`membership-automation.ts:44-68`).

### Current refund/cancel/correction behavior

- Despite older docs saying “skip refunds” (`docs/.../membership-automations.md:36-38`), current code has partial refund support:
  - Refund receipt with matching configured membership item lines calls `markRefundedMemberships` (`membership-creation.ts:380-391`).
  - Requires `receipt.refund_for`; missing original receipt becomes skipped warning incident (`membership-creation.ts:176-185`).
  - Finds automated membership by original receipt number + item IDs and appends refund marker in Notes (`membership-creation.ts:187-226`).
  - If none found, skipped warning incident `MEMBERSHIP_REFUND_MEMBERSHIP_NOT_FOUND` (`membership-creation.ts:193-200`).
  - Update failures become failed critical `MEMBERSHIP_REFUND_NOTION_UPDATE_FAILED` (`membership-creation.ts:227-235`).
- Cancelled membership-purchase receipts are skipped with warning incident `MEMBERSHIP_CREATION_CANCELLED_SKIPPED`; no Notion deps are called (`membership-creation.ts:394-400`).
- Corrected/updated receipts: if Notion idempotency finds an existing automated membership, it skips and flags `MEMBERSHIP_CREATION_CORRECTED_RECEIPT_SKIPPED` for manual review (`membership-creation.ts:295-307`). There is no automatic update/reconciliation.

### Flexi data and validation that already exists

- Data model docs define Flexi card purchase items and fixed pass count:
  - `Flexible Resident` -> `483c66bc-ee06-411c-95b6-f39a7491d09a`.
  - `flexible Regular` -> `360020d1-3ecd-43c2-97c8-c6ff4da754d4`.
  - Each card grants `11` entrances (`docs/.../data-model.md:21-28`).
- Constants live in `src/lib/receipts/open-play-items.ts`:
  - `FLEXI_SINGLE_ENTRANCE_ITEM_ID`, `FLEXIBLE_RESIDENT_ITEM_ID`, `FLEXIBLE_REGULAR_ITEM_ID`, `FLEXI_CARD_ITEM_IDS`, `FLEXI_PASS_ENTRIES_PER_CARD = 11` (`open-play-items.ts:4-10`).
- Flexi validation currently uses Neon history, not Notion:
  - `queryFlexiPassBalanceForCustomer` filters by customer, merchant, non-refund receipts, cutoff date, and item IDs (`src/lib/server/db/flexi-pass-queries.ts:31-67`).
  - Counts flexi card purchases by line quantity and multiplies by 11; counts `Flexi Single Entrance` quantities as used (`flexi-pass-queries.ts:69-94`).
  - Returns cards purchased, entries purchased/used, remaining before/after current receipt (`flexi-pass-queries.ts:96-107`).
- Receipt validation rule `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS`:
  - Skips refunds, triggers only on `Flexi Single Entrance`, requires customer, queries Neon balance, alerts on no/insufficient remaining entries (`docs/.../receipt-validation.md:25-43`).
  - Docs explicitly say no Flexi line -> no Neon lookup, missing customer -> immediate finding (`docs/.../receipt-validation.md:65-71`).

## Gaps for flexi-card purchase automation

1. **No flexi-card purchase automation module exists.** `src/lib/receipts/automations/` only has membership creation and membership item config. Default suite only wires membership creation (`membership-automation.ts:185-187`).
2. **No Notion Flexi database/type is visible in generated SDK.** Search found no `src/lib/notion-sdk/dbs/*flex*`, and grep for flexi-like fields only hit unrelated/generated text. Existing flexi balance is derived from Neon receipts, not a Notion object.
3. **Flexi purchase “record” target is unclear.** Current app treats flexi card purchases as receipt line items in Neon; there is no local model for creating a Notion row or mutating Family. Planning must decide whether automation should create a Notion Membership-like row, add notes to Family, create a new database, or only create an incident/task.
4. **Current membership automation types are membership-specific.** The generic runner can support more automations, but `src/lib/server/membership-automation.ts` is named membership-specific and only provides membership Notion deps. A flexi automation should probably have its own module/deps rather than overloading membership types.
5. **Incident severity mapping is membership-code-specific.** `getAutomationIncidentSeverity` treats only `MEMBERSHIP_CREATED` as completed/info; other completed flexi codes would currently produce no incident unless mapping is extended (`+server.ts:96-100`). `getAutomationIncidentCode` also special-cases only `MEMBERSHIP_CREATED` (`+server.ts:103-107`).
6. **Refund behavior for flexi purchases is not implemented.** Flexi validation excludes refund receipts from balance history (`flexi-pass-queries.ts:49-53`), so refund receipts do not reduce prior card count. If a card purchase was refunded, current balance logic may continue counting the original sale unless there is a correction/cancel/update behavior in Loyverse that changes the original receipt. Need policy.
7. **Cancelled flexi purchases are likely counted today.** `queryFlexiPassBalanceForCustomer` excludes refunds but does not filter `receipts.cancelledAt`; cancelled receipts with card purchase item IDs would still count toward balance (`flexi-pass-queries.ts:49-53`). This may matter independently of automation.
8. **Docs are stale for membership refunds.** Docs still say initial behavior skips refunds, but code now marks membership refunds in Notes. Any flexi plan should use code as source of truth and update docs if implementation changes later.

## Likely files to change for flexi-card purchase automation

Most likely implementation shape, if the goal is to automate side effects when `Flexible Resident` / `flexible Regular` purchase receipts arrive:

- `src/lib/receipts/automations/`
  - Add a flexi purchase automation module, e.g. `flexi-card-purchase.ts`, with dependency injection and tests like `membership-creation.ts`.
  - Possibly add `flexi-items.ts`, or reuse `src/lib/receipts/open-play-items.ts` for item IDs and pass count. Reuse is preferable because validation already owns current flexi constants.
  - Export new module from `index.ts` if needed.
- `src/lib/server/membership-automation.ts`
  - Either rename/split conceptually later, or minimally import/wire `createFlexiCardPurchaseAutomation(...)` into `createDefaultReceiptAutomationSuite()`.
  - Add production deps for whatever target is chosen (Notion Family update, Notion DB create, incident-only, etc.). If this touches Notion schema, follow repo guidance: run `pnpm notion:generate` after schema changes; avoid generated DB barrel imports.
- `src/routes/api/webhooks/receipt/+server.ts`
  - Extend automation incident severity/code handling for flexi completed/skipped/failed result codes if the flexi automation should notify staff. Otherwise completed flexi results will silently only affect response counts.
  - Optionally extend compact/Telegram context downstream if incidents need concise flexi fields.
- `src/lib/server/db/flexi-pass-queries.ts`
  - If refund/cancel correctness is in scope, update balance logic to exclude cancelled receipts and/or subtract/refund original flexi purchases.
- `src/lib/receipts/open-play-items.ts`
  - Already has flexi card IDs/pass count. Change only if item IDs/pass count policy changes.
- Tests:
  - Add unit tests analogous to `membership-creation.test.ts` for sale, no matching item, missing customer, family/target missing, duplicate/idempotent existing target, refund, cancelled/corrected receipt behavior.
  - Add/adjust route tests if automation incident handling gets new codes.
  - Add/adjust flexi balance query tests if refunds/cancellations change balance semantics.
- Docs:
  - `docs/casa-luma/memberships/data-model.md`, `membership-automations.md`, and/or `receipt-validation.md` should be updated later to reflect final flexi purchase automation and refund policy.

## Idempotency considerations for flexi-card automation

- Keep the route-level invariant: run only after ingestion `processed`; duplicate and stale webhook events skip automation (`+server.ts:239`, `ingest-receipt-core.ts:214-230`).
- Add automation-level idempotency because external side effects are outside Neon transaction, same as memberships (`docs/.../membership-automations.md:44-58`).
- Use a provenance key that includes at least:
  - `Receipt Number: <receipt_number>`
  - `Receipt Key: <merchant_id>:<receipt_number>`
  - `Loyverse Item ID: <flexi-card-item-id>`
  - line indexes and quantity/cards purchased
  - possibly `Entries Granted: quantity * 11`
- If creating/updating Notion, query for an existing automated target before writing. Match by target owner (customer/family), receipt key/number, item ID, and line indexes or item quantity.
- Beware concurrent duplicate Notion writes: route-level dedupe helps only for identical webhook events; corrected events with different `updated_at`/total can still be `processed`. Idempotency must tolerate same receipt number with changed line items.
- Decide correction behavior explicitly:
  - Conservative/current membership pattern: skip if an automated target exists and report warning for manual review.
  - More advanced: update existing target if quantity/item/date changed, but that requires stronger target schema and conflict policy.

## Refund/cancel considerations for flexi cards

- Current membership refund support only handles receipts that contain configured membership purchase item IDs; it marks matching automated memberships as refunded by appending Notes, not by changing formula Status (`membership-creation.ts:380-391`; `membership-automation.ts:146-150`).
- Flexi validation currently skips refund receipts and does not subtract refunded purchases from balances (`docs/.../receipt-validation.md:31`; `flexi-pass-queries.ts:49-53`). If a flexi-card purchase refund should revoke 11 entries, both automation and balance query semantics need a policy.
- Need to know Loyverse refund shape for flexi card refunds: does refund receipt include the original purchase item IDs and `refund_for`? Membership refund code assumes this shape (`membership-creation.ts:176-190`). If yes, flexi automation can mirror it; if no, more receipt lookup is needed.
- Cancelled receipts: membership automation skips cancelled purchases and warns (`membership-creation.ts:394-400`), but flexi balance query currently may still count cancelled flexi-card purchase receipts. If flexi purchase automation creates records, cancelled receipt handling should be consistent and likely skip/flag manual review.
- Partial refunds/quantity changes: no current abstraction handles line-level partial refund quantities. If flexi card line quantity can be >1 and partially refunded, automation needs line quantity provenance and manual-review fallback.

## Key constraints / risks

- Do not assume a Notion Flexi database exists; generated SDK has no obvious flexi DB. The current reliable source of flexi balance is Neon receipt history.
- Do not import generated Notion SDK database barrels from server/runtime code; project guidance says import concrete files (`/db`, `/response.dto`, `/patch.dto`, etc.) to avoid production circular init errors.
- Avoid running `pnpm check`, `svelte check`, or `pnpm build` in this project per `AGENTS.md`.
- If Notion schema changes are introduced later, run `pnpm notion:generate` afterward per `AGENTS.md`.
- The docs in `membership-automations.md` partially predate current refund implementation, so verify against code before using docs as requirements.

## Suggested next-step framing

Before implementation, decide the target side effect for a flexi-card purchase:

1. **Incident/task only:** notify staff that a flexi card was purchased; Neon receipt history remains source of truth. Lowest schema risk.
2. **Notion Family annotation/update:** append purchase provenance to Family or related record. Requires Family patch deps and idempotent notes strategy.
3. **New/explicit Notion Flexi Pass record:** best auditability, but needs a Notion database/schema and generated SDK updates.
4. **Reuse Memberships database:** possible only if business accepts Flexi as a membership-like row; current Membership type is `Weekly|Monthly`, so this likely requires Notion schema changes and would affect existing membership semantics.

For an initial conservative implementation, mirror membership automation patterns: configured flexi card item IDs, require customer (and likely Family if writing Notion), skip/flag cancelled, implement refund as manual-review or idempotent marker, and add provenance-based idempotency before any external write.
