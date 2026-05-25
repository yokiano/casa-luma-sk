# Plan: Membership/Flexi receipt validations + missing customer alerts

Date: 2026-05-23
Project: `/home/yardenavirav/dev/casa-luma-sk/casa-luma-sk`

## Short answer: does it make sense?

Yes, it makes sense, with two important implementation notes:

1. **Membership validation requires async Notion lookups**, while the current receipt validation engine is synchronous. We should refactor the engine/rules to support async validation before adding membership/flexi rules.
2. **“Ticket closed without customer attached” can be noisy** if many café/retail-only tickets intentionally do not attach a Loyverse customer. If the operational expectation is “every closed receipt must have a customer,” implement it globally. If not, scope it to Open Play/member/flexi-related tickets.

## What I researched

### Existing receipt validation pipeline

Current runtime path:

1. `src/routes/api/webhooks/receipt/+server.ts` receives Loyverse receipt webhooks.
2. It calls `ingestReceiptWebhook(receiptPayload)` to persist the receipt into Neon.
3. Only when ingestion returns `processed`, it calls `runReceiptValidationSuite(...)`.
4. If there are findings, it reports one critical incident through `incidentReporter.report(...)`.
5. Incidents are stored in Neon `reported_errors` and critical incidents are sent to Telegram.

Important files:

- `src/lib/receipts/validation/types.ts`
- `src/lib/receipts/validation/engine.ts`
- `src/lib/receipts/validation/default-suite.ts`
- `src/lib/receipts/validation/rules/`
- `src/routes/api/webhooks/receipt/+server.ts`
- `src/lib/server/incidents/reporter.ts`
- `src/lib/server/incidents/telegram.ts`
- `src/lib/server/db/receipt-queries.ts`
- `src/lib/server/db/schema.ts`

### Current validation rules

`createDefaultReceiptValidationSuite()` currently includes:

1. `DISCOUNT_100_PRESENT`
2. `DISCOUNT_TOTAL_OVER_THRESHOLD`
3. `ONE_HOUR_NOT_CONVERTED`
4. optional `extraRules`

The prior `temp/receipt-validation-alerts-plan.md` has mostly already been implemented: receipt detail route exists, discount threshold rule exists, direct receipt lookup exists, and Telegram formatting is friendly.

### Important limitation: validation is sync today

Current rule contract:

```ts
validate: (args) => ReceiptValidationFinding | ReceiptValidationFinding[] | null;
```

Current runner:

```ts
export const runReceiptValidationSuite = (...) => {
  const findings = suite.rules.flatMap((rule) => rule.validate(...));
}
```

Membership and flexi checks need Notion and/or Neon reads, so the rule contract should become async-capable:

```ts
validate: (args) =>
  | ReceiptValidationFinding
  | ReceiptValidationFinding[]
  | null
  | Promise<ReceiptValidationFinding | ReceiptValidationFinding[] | null>;
```

Then the webhook must call:

```ts
const validationReport = await runReceiptValidationSuite(...);
```

### Neon receipt data available

`docs/neon/schema.md` and `src/lib/server/db/schema.ts` confirm:

- `receipts.customer_id` stores the Loyverse customer ID attached to the receipt.
- `receipt_line_items.item_id` stores the Loyverse item ID used by receipt lines.
- `receipts.created_at` / `receipt_date` can be used for chronology.
- `receipt_type` can be used to skip refunds.

Useful existing query/hydration file:

- `src/lib/server/db/receipt-queries.ts`
  - `queryReceiptsFromDb(...)`
  - `queryReceiptByNumberFromDb(...)`
  - private `hydrateReceiptRows(...)`

For flexi balance we should add an aggregate helper rather than hydrate all receipts into the browser/UI shape.

### Notion data model found

I checked Notion with `notion-cli`.

#### Open Play POS Items database

Database:

- Title: `🎟️ Open Play POS Items`
- Notion database ID: `6324a9fa968d4e719608c7c1c6a64c93`
- Generated SDK: `src/lib/notion-sdk/dbs/open-play-pos-items/`
- Parent page: `Open Play`

Schema fields include:

- `Name`
- `Category` (`Membership` or `Entry`)
- `Price (Baht)`
- `Duration`
- `LoyverseID`
- `ID` exposed in Notion fetch as `userDefined:ID`

Important finding: for the specific pages I fetched, **`LoyverseID` was blank**, but `userDefined:ID` contained the UUID that matches how receipts store `line_items.item_id`. Existing code also hardcodes Loyverse item UUIDs in `src/lib/receipts/receipt-tools.ts`, so the practical source for item matching is the Notion `ID` / generated `id` property unless the Notion DB is updated.

Items from Notion:

| Purpose | Notion item | Current ID field found |
|---|---|---:|
| Membership zero-baht entry | `Member Valid Visit` | `dd4303a3-0bfb-49ed-95bc-fd65b853d22b` |
| Flexi zero-baht entry | `Flexi Single Entrance` | `a94027fa-dd55-43d2-a031-b358877f4752` |
| Flexi card purchase | `Flexible Resident` | `483c66bc-ee06-411c-95b6-f39a7491d09a` |
| Flexi card purchase | `flexible Regular` | `360020d1-3ecd-43c2-97c8-c6ff4da754d4` |

Assumption to confirm: `Flexible Resident` and `flexible Regular` each grant **11 flexi entrances**, based on their Notion `Duration` field (`11 Hours`) and your description of counting remaining flexi-card passes.

#### Memberships database

Database:

- Title: `🎫 Memberships`
- Notion database ID: `4267d8b54c9343b39b0b6941ccf79145`
- Generated SDK: `src/lib/notion-sdk/dbs/memberships/`
- Parent page: `Open Play`

Fields:

- `Name`
- `Family` relation
- `Type` (`Weekly`, `Monthly`)
- `Start Date`
- `End Date`
- `Number of Kids`
- `Status` formula
- `Has Sibling Discount` formula
- `Notes`

Existing app code:

- `src/lib/server/memberships.ts`
- `src/lib/memberships.remote.ts`
- `src/routes/tools/memberships/`

The existing app already creates/updates memberships in Notion and relates them to a family.

#### Families database

Database:

- Title: `👨‍👩‍👧‍👦 Families`
- Notion database ID: `4dd6c32d9b0244fbbed6e6b41033e598`
- Generated SDK: `src/lib/notion-sdk/dbs/families/`
- Existing helper: `src/lib/tools/families/families.server.ts`

Relevant fields:

- `Family Name`
- `Customer Code`
- `Loyverse Customer ID`
- `Status`
- `Members`
- `Main Phone`, `Main Email`

Existing `FamilySummary` already includes:

```ts
loyverseCustomerId: string | null;
```

So membership validation can query Families by `loyverseCustomerId` and then Memberships by family relation.

### Docs scan result

Existing docs cover receipts/validation/Neon well:

- `docs/receipts/validation-and-alerts.md`
- `docs/loyverse/receipt-validation-engine.md`
- `docs/database.md`
- `docs/neon/schema.md`
- `docs/receipts/query-and-analytics.md`

But I did **not** find local docs that clearly explain:

- where Open Play POS items are stored,
- which Notion item fields map to Loyverse receipt `item_id`,
- where Families are stored,
- where Memberships are stored,
- how `Families.Loyverse Customer ID` maps to `receipts.customer_id`,
- how flexi cards are represented today.

Recommendation: create `docs/casa-luma/memberships/` with at least:

- `docs/casa-luma/memberships/data-model.md`
- `docs/casa-luma/memberships/receipt-validation.md`

## Proposed new validation codes

Add three business rules:

1. `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP`
   - Trigger: receipt contains `Member Valid Visit` line item.
   - Requirement: receipt has `customer_id`, that customer maps to an active Family in Notion, and that family has a valid membership for the receipt date.

2. `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS`
   - Trigger: receipt contains `Flexi Single Entrance` line item.
   - Requirement: receipt has `customer_id`, and Neon receipt history for that customer shows enough remaining flexi passes from `Flexible Resident` / `flexible Regular` purchases.

3. `RECEIPT_CLOSED_WITHOUT_CUSTOMER`
   - Trigger: non-refund receipt has no `customer_id`.
   - Requirement: every closed ticket/receipt should have a customer attached.
   - Scope decision: global vs only Open Play-related receipts.

Suggested severity: `warning` for all three. The webhook currently wraps any validation finding in a critical incident, so Telegram will still notify.

## Detailed implementation plan

### 1. Refactor validation engine to async-capable

Files:

- `src/lib/receipts/validation/types.ts`
- `src/lib/receipts/validation/engine.ts`
- `src/routes/api/webhooks/receipt/+server.ts`
- tests in `src/lib/receipts/validation/validation-suite.test.ts`

Changes:

- Allow `ReceiptValidationRule.validate` to return a Promise.
- Make `runReceiptValidationSuite(...)` async.
- Preserve rule execution error behavior (`RULE_EXECUTION_ERROR:<rule.code>`).
- Update all call sites and tests to `await runReceiptValidationSuite(...)`.
- Existing sync rules can stay unchanged; `await` handles them.

Important: this is the safest foundation for Notion/Neon backed validations.

### 2. Centralize Open Play item IDs

Create or extend a constants module, probably:

- `src/lib/receipts/open-play-items.ts`

Suggested constants:

```ts
export const MEMBER_VALID_VISIT_ITEM_ID = 'dd4303a3-0bfb-49ed-95bc-fd65b853d22b';
export const FLEXI_SINGLE_ENTRANCE_ITEM_ID = 'a94027fa-dd55-43d2-a031-b358877f4752';
export const FLEXIBLE_RESIDENT_ITEM_ID = '483c66bc-ee06-411c-95b6-f39a7491d09a';
export const FLEXIBLE_REGULAR_ITEM_ID = '360020d1-3ecd-43c2-97c8-c6ff4da754d4';
export const FLEXI_PASS_ENTRIES_PER_CARD = 11;
```

Then consider moving the existing one-hour constants out of `receipt-tools.ts` or at least documenting all item IDs together.

Optional improvement: load/cache these IDs from Notion `Open Play POS Items` at runtime, but for webhook validation I recommend hardcoded constants first because:

- current one-hour validation already uses hardcoded item IDs,
- validation should not fail just because Notion is slow/unavailable,
- the relevant Notion `LoyverseID` field currently appears blank for these pages.

### 3. Add membership lookup helper

Add server-only helper, likely:

- `src/lib/server/membership-validation.ts`

Responsibilities:

- Given `loyverseCustomerId` and `atDate`, find matching family/families in Notion Families.
- Query Memberships for that family where:
  - `Family` relation contains the family page ID,
  - `Start Date` is on/before `atDate` (or missing if business allows),
  - `End Date` is on/after `atDate`,
  - optionally `Status` formula is `Active` if Notion API formula filtering works reliably in this generated SDK.
- Return a compact result:

```ts
type MembershipValidationLookup = {
  matchedFamily: { id: string; name: string; loyverseCustomerId: string } | null;
  activeMemberships: Array<{
    id: string;
    name: string;
    type: string | null;
    startDate: string | null;
    endDate: string | null;
    numberOfKids: number | null;
    status: string | null;
  }>;
};
```

Reuse existing generated DB SDK classes:

- `FamiliesDatabase`
- `FamiliesResponseDTO`
- `MembershipsDatabase`
- `MembershipsResponseDTO`

Possible query path:

1. `FamiliesDatabase.query({ filter: { loyverseCustomerId: { equals: receipt.customer_id } }, page_size: 5 })`
2. For each matched family ID, `MembershipsDatabase.query({ filter: { and: [...] } })`

Fallback if exact `equals` is too strict for rich text: use `contains` with the customer ID, then compare exact normalized text in code.

### 4. Add membership entry validation rule

New file:

- `src/lib/receipts/validation/rules/member-valid-visit.ts`

Rule logic:

- Skip refunds by default.
- Count quantity of line items whose `item_id` is `MEMBER_VALID_VISIT_ITEM_ID`.
- If quantity is zero, return null.
- If `receipt.customer_id` is missing, return a finding immediately. Do not also rely only on the generic missing-customer rule because this finding should explain that a membership visit could not be verified.
- Determine receipt date from `receipt.created_at ?? receipt.receipt_date ?? context.eventCreatedAt`.
- Lookup active membership for `receipt.customer_id` at that date.
- If none found, return `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP`.
- Include useful details:
  - receipt customer ID,
  - member-entry quantity,
  - item ID/name,
  - matched family if any,
  - active membership count,
  - checked date,
  - reason (`missing_customer`, `family_not_found`, `no_active_membership`).

Optional stricter check:

- If membership `Number of Kids` is lower than the quantity of `Member Valid Visit` lines, flag `memberEntryQuantityExceedsNumberOfKids`.
- I would document this but not enable it unless you confirm it is desired.

### 5. Add Neon flexi balance helper

Add a server DB helper, likely in:

- `src/lib/server/db/flexi-pass-queries.ts`

Goal: calculate flexi balance for one customer at one receipt time.

Inputs:

```ts
{
  customerId: string;
  merchantId?: string;
  at: string; // current receipt time
  currentReceiptKey?: string;
}
```

Aggregate from Neon:

- Purchases: line items where `item_id` is `FLEXIBLE_RESIDENT_ITEM_ID` or `FLEXIBLE_REGULAR_ITEM_ID`.
- Usages: line items where `item_id` is `FLEXI_SINGLE_ENTRANCE_ITEM_ID`.
- Join `receipt_line_items` to `receipts` by `receipt_key`.
- Filter by `receipts.customer_id = customerId`.
- Skip refunds: `receipt_type is distinct from 'REFUND'`.
- Filter by receipt date/time <= current receipt time.

Recommended first implementation:

```text
totalPassesPurchased = sum(flexi-card line quantity) * 11
totalPassesUsed = sum(flexi-single-entrance line quantity)
remainingAfterCurrentReceipt = totalPassesPurchased - totalPassesUsed
remainingBeforeCurrentReceipt = remainingAfterCurrentReceipt + currentReceiptFlexiEntryQuantity
```

Validate current receipt by requiring:

```text
remainingBeforeCurrentReceipt >= currentReceiptFlexiEntryQuantity
```

Why this works with current webhook order:

- The current receipt has already been ingested into Neon before validation runs.
- The aggregate can include the current flexi single entrance, then add the current usage back to know the balance before this receipt.

Details to return:

```ts
type FlexiBalance = {
  customerId: string;
  passEntriesPerCard: 11;
  cardsPurchased: number;
  entriesPurchased: number;
  entriesUsedIncludingCurrent: number;
  currentReceiptEntries: number;
  remainingBeforeCurrentReceipt: number;
  remainingAfterCurrentReceipt: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
};
```

Caveat / decision:

- This treats all flexi card purchases cumulatively. That is more robust than only checking “since latest purchase,” because it handles buying another flexi card before a previous one is fully used.
- If the business rule is explicitly “only the latest card matters,” change the helper to find the latest purchase receipt and count usages after that timestamp.

### 6. Add flexi validation rule

New file:

- `src/lib/receipts/validation/rules/flexi-pass-entry.ts`

Rule logic:

- Skip refunds by default.
- Count quantity of `FLEXI_SINGLE_ENTRANCE_ITEM_ID` in current receipt.
- If zero, return null.
- If `receipt.customer_id` is missing, return `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS` with reason `missing_customer`.
- Call the Neon flexi balance helper.
- If no card purchase exists or remaining before current receipt is less than current entry quantity, return finding.
- Include useful details:
  - customer ID,
  - current flexi entry quantity,
  - cards purchased,
  - entries purchased,
  - entries used including current,
  - remaining before/after current receipt,
  - purchase item IDs,
  - usage item ID,
  - reason (`missing_customer`, `no_flexi_purchase`, `insufficient_remaining_entries`).

### 7. Add missing customer validation rule

New file:

- `src/lib/receipts/validation/rules/missing-customer.ts`

Rule logic:

- Skip refunds by default.
- Skip cancelled receipts if `receipt.cancelled_at` exists.
- Trigger if no non-empty `receipt.customer_id`.
- Code: `RECEIPT_CLOSED_WITHOUT_CUSTOMER`.
- Details:
  - receipt number,
  - receipt type,
  - total money,
  - item count,
  - item names/IDs up to a small limit.

Default scope options:

```ts
{
  skipRefunds?: boolean;
  skipCancelled?: boolean;
  openPlayOnly?: boolean;
}
```

Recommended default: `openPlayOnly: false` if you truly want every ticket. If Telegram noise becomes too high, change to true and only trigger when receipt line items contain known Open Play item IDs.

### 8. Wire rules into default suite

File:

- `src/lib/receipts/validation/default-suite.ts`

Add options:

```ts
memberValidVisitRule?: MemberValidVisitRuleOptions;
flexiPassEntryRule?: FlexiPassEntryRuleOptions;
missingCustomerRule?: MissingCustomerRuleOptions;
```

Recommended order:

1. `RECEIPT_CLOSED_WITHOUT_CUSTOMER`
2. `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP`
3. `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS`
4. existing discount rules
5. `ONE_HOUR_NOT_CONVERTED`

Reason: customer attachment is prerequisite context for membership/flexi.

### 9. Update Telegram formatter

File:

- `src/lib/server/incidents/telegram.ts`

Add labels:

```ts
MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP:
  'Receipt Violation — Membership Entry Without Valid Membership',
FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS:
  'Receipt Violation — Flexi Entry Without Available Pass',
RECEIPT_CLOSED_WITHOUT_CUSTOMER:
  'Receipt Alert — Closed Without Customer'
```

Add detail formatters so Telegram is concise:

- membership: customer ID, family, membership status/reason.
- flexi: remaining before/after, purchased/used entries.
- missing customer: item names and total.

Keep full raw details in incident payload/context, not Telegram.

### 10. Update webhook compact finding details

File:

- `src/routes/api/webhooks/receipt/+server.ts`

Extend `getCompactFindingDetails(...)` for the three new rule codes so Telegram gets only the relevant fields.

Also add `customerId` to incident context when available:

```ts
customerId: receiptPayload.items.customer_id
```

### 11. Tests

Update/add tests:

- `src/lib/receipts/validation/validation-suite.test.ts`
- `src/lib/server/incidents/telegram.test.ts`
- likely new unit tests for server helpers with mocked DB/Notion calls.

Test cases:

#### Engine

- sync rules still work after async refactor.
- async rule returns finding.
- async rule throw is converted to `RULE_EXECUTION_ERROR:<code>`.

#### Membership rule

- no member item -> no finding.
- member item + missing customer -> finding.
- member item + customer but no family -> finding.
- member item + family but no active membership -> finding.
- member item + active membership -> no finding.

#### Flexi rule

- no flexi single entrance -> no finding.
- flexi entry + missing customer -> finding.
- flexi entry + no flexi purchases -> finding.
- flexi entry + enough remaining passes -> no finding.
- flexi entry + not enough remaining passes -> finding.
- current receipt is counted correctly after ingestion.

#### Missing customer rule

- sale with no customer -> finding.
- sale with customer -> no finding.
- refund with no customer -> skipped by default.
- cancelled receipt with no customer -> skipped if enabled.

#### Telegram

- each new code starts with the human label.
- details are concise and escaped.
- receipt/incident links still work.

Do **not** run `pnpm check`, `svelte check`, or `pnpm build` in this project per `AGENTS.md`.

Targeted tests are acceptable, e.g.:

```bash
npm run test:unit -- --run src/lib/receipts/validation/validation-suite.test.ts src/lib/server/incidents/telegram.test.ts
```

### 12. Docs to add/update

Create:

- `docs/casa-luma/memberships/data-model.md`
- `docs/casa-luma/memberships/receipt-validation.md`

Update:

- `docs/receipts/validation-and-alerts.md`
- `docs/loyverse/receipt-validation-engine.md`
- optionally `docs/neon/schema.md` with a short note about receipt customer/item fields used by flexi validation.

Suggested contents for `data-model.md`:

- Open Play POS Items live in Notion DB `Open Play POS Items`.
- The generated SDK lives at `src/lib/notion-sdk/dbs/open-play-pos-items/`.
- Receipt `line_items.item_id` maps to the Notion item `ID` / `userDefined:ID` field in currently fetched pages; `LoyverseID` currently appears blank for the relevant items.
- Memberships live in Notion DB `Memberships` under Open Play.
- Families live in Notion DB `Families` under Customer Base.
- `Families.Loyverse Customer ID` maps to Neon `receipts.customer_id` from Loyverse receipts.

Suggested contents for `receipt-validation.md`:

- Member Valid Visit validation logic.
- Flexi Single Entrance balance logic.
- Missing customer alert logic.
- Known item IDs and assumptions.
- Operational caveats and expected Telegram alerts.

## Suggested implementation order

1. Refactor validation engine to async-capable and update existing tests.
2. Add constants for Open Play item IDs and flexi card size.
3. Add membership/family Notion lookup helper.
4. Add Neon flexi balance aggregate helper.
5. Add `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP` rule.
6. Add `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS` rule.
7. Add `RECEIPT_CLOSED_WITHOUT_CUSTOMER` rule.
8. Wire all rules into `createDefaultReceiptValidationSuite()`.
9. Update webhook compact incident context.
10. Update Telegram labels/detail formatters/tests.
11. Add/update docs under `docs/casa-luma/memberships/` and receipt validation docs.
12. Run targeted unit tests only.

## Open decisions to confirm

1. Does each `Flexible Resident` / `flexible Regular` purchase grant exactly **11** flexi entrances?
2. Should flexi balance be cumulative across all card purchases, or reset from the latest flexi-card purchase?
3. Should `Member Valid Visit` quantity be checked against membership `Number of Kids`?
4. Should missing-customer alerts apply to **all receipts**, or only receipts containing Open Play/customer-account-related items?
5. Should a Notion outage fail membership validation as a critical alert, or degrade to a warning like `MEMBERSHIP_VALIDATION_LOOKUP_FAILED`?

## Recommendation

Implement as above, but start with hardcoded item IDs and cumulative flexi balance. This is reliable, matches the current one-hour validation style, and avoids making every webhook depend on reading the POS item DB from Notion. Then document the Notion source of truth and optionally add a later task to periodically verify the hardcoded IDs against Notion.
