# Membership Automations Implementation Plan

Date: 2026-05-23
Status: planning

## Goal

Automatically create Notion `🎫 Memberships` records after eligible Loyverse receipt-closed webhooks are ingested, instead of requiring staff to manually add memberships.

The first automation is membership creation. The code structure should support additional membership-related automations later.

## Current state

- Receipt webhook entrypoint: `src/routes/api/webhooks/receipt/+server.ts`
  - Parses one receipt payload or a batch payload.
  - Calls `ingestReceiptWebhook(receiptPayload)`.
  - Runs receipt validation for processed receipts.
  - Reports validation incidents.
- Receipt ingestion wrapper: `src/lib/server/db/ingest-receipt-webhook.ts`
  - Delegates to `ingestReceiptWebhookWithDb(db, payload)`.
- Receipt ingestion core: `src/lib/server/db/ingest-receipt-core.ts`
  - Inserts `webhook_events` with a dedupe key.
  - Upserts `receipts` and related line tables.
  - Returns `processed`, `duplicate`, or `stale`.
- Membership/Family data model: `docs/casa-luma/memberships/data-model.md`
  - `receipts.customer_id` maps to Notion Families `Loyverse Customer ID`.
  - Memberships are Notion rows related to Family with `Start Date`, `End Date`, `Type`, and `Number of Kids`.
- Existing helpers:
  - Membership creation for manual UI: `src/lib/server/memberships.ts:createMembershipData`.
  - Family lookup by Loyverse customer for validation: `src/lib/server/membership-validation.ts:lookupFamilyMembershipForReceipt`.

## Key missing business information

Implementation can start with a config-driven design, but final production behavior needs these decisions:

1. Which Loyverse item IDs represent membership purchases?
   - Weekly membership item IDs.
   - Monthly membership item IDs.
   - Any resident/non-resident variants if they map to the same Notion `Type`.
2. How should `Number of Kids` be derived?
   - Separate POS item per child count?
   - Quantity of one membership item?
   - Line note/modifier?
   - Always `1` for now?
3. What dates should be used?
   - `Start Date`: receipt date, next day, or custom from line note?
   - `End Date` for Weekly: start + 7 days minus one day? start + 1 week?
   - `End Date` for Monthly: calendar month semantics or fixed 30 days?
4. Duplicate policy when the same receipt webhook is retried or updated:
   - Do not create duplicates for duplicate webhook events.
   - If a later, newer receipt update arrives after a membership was already created, should it skip, update, or report for manual review?
5. Refund/cancellation policy:
   - Initial recommendation: never create memberships for `REFUND` receipts or cancelled receipts.
   - Later automation can archive/reverse memberships for refunds if needed.
6. Family not found policy:
   - Initial recommendation: report an incident and skip membership creation.
   - Do not create a Family automatically from receipt alone.

## Proposed architecture

Add a receipt automation layer that runs after successful ingestion and before/after validation in the webhook route.

Suggested files:

```text
src/lib/receipts/automations/
  index.ts
  types.ts
  membership-creation.ts
  membership-items.ts

src/lib/server/membership-automation.ts
```

### Why a generic `receipt automations` concept?

The user expects more membership-related automations later. A small automation runner keeps webhook code from becoming a membership-specific blob while preserving clear business-specific modules.

`receipt automations` should be generic; `membership creation` should be one registered automation.

## Proposed flow

For each parsed receipt payload in `src/routes/api/webhooks/receipt/+server.ts`:

1. Ingest the receipt with `ingestReceiptWebhook(receiptPayload)`.
2. If ingestion status is not `processed`, skip automations.
   - `duplicate`: skip to preserve idempotency.
   - `stale`: skip to avoid acting on older data.
3. Run receipt automations:
   - `runReceiptAutomationSuite(defaultReceiptAutomations, receiptPayload.items, context)`.
   - Context should include `merchantId`, `receiptKey`, `eventType`, and `eventCreatedAt`.
4. Run receipt validation as today.
5. Include automation summary in webhook logs and JSON response, without exposing verbose Notion payloads.
6. Report automation failures through `incidentReporter`.

Ordering note: run automations after ingestion because ingestion dedupe is the reliable first idempotency gate. Running before validation is acceptable because validation may flag unrelated warnings; if membership creation should be blocked by validation later, make that explicit.

## Types

```ts
export type ReceiptAutomationStatus = 'skipped' | 'completed' | 'failed';

export type ReceiptAutomationResult = {
  code: string;
  status: ReceiptAutomationStatus;
  message: string;
  details?: Record<string, unknown>;
};

export type ReceiptAutomationContext = {
  merchantId?: string;
  receiptKey?: string;
  eventType?: string;
  eventCreatedAt?: string;
};

export type ReceiptAutomation = {
  code: string;
  description: string;
  run(input: {
    receipt: LoyverseReceipt;
    context: ReceiptAutomationContext;
  }): Promise<ReceiptAutomationResult | ReceiptAutomationResult[]>;
};
```

The runner should catch exceptions per automation and convert them to a `failed` result, similar to receipt validation rule error handling.

## Membership creation automation

### Detection

Create a config mapping from Loyverse item IDs to Notion membership attributes.

```ts
export type MembershipPurchaseItemConfig = {
  itemId: string;
  type: 'Weekly' | 'Monthly';
  numberOfKids: number;
  duration: { unit: 'day' | 'month'; count: number };
  label: string;
};
```

Initial placeholder until business IDs are supplied:

```ts
export const MEMBERSHIP_PURCHASE_ITEMS: MembershipPurchaseItemConfig[] = [];
```

The automation is inert until IDs are added, but tests should pass explicit config directly.

### Rules

For each matched membership purchase line:

1. Skip `REFUND` receipts.
2. Skip cancelled receipts (`cancelled_at` present).
3. Require `receipt.customer_id`.
4. Resolve Family by exact normalized `Loyverse Customer ID`.
5. Compute membership fields:
   - `family`: resolved Family page id.
   - `type`: from item config.
   - `numberOfKids`: from item config initially.
   - `startDate`: date-only from `receipt.receipt_date ?? receipt.created_at ?? context.eventCreatedAt`.
   - `endDate`: computed from start date and item config duration.
   - `name`: follow existing manual helper format: `${familyName} - ${type} - ${numberOfKids} kid(s)`.
   - `notes`: include automation provenance, receipt number, receipt key, Loyverse item id, and event timestamp.
6. Idempotency before Notion create:
   - Query existing Memberships for the same Family.
   - Check for same `Start Date`, `End Date`, `Type`, `Number of Kids`, and a provenance token in Notes, e.g. `Receipt: R-1000` or `Receipt Key: merchant:R-1000`.
   - If found, return `skipped` with reason `already_created`.
7. Create Membership in Notion.
8. Return `completed` with Notion page id, family id/name, type, dates, and receipt number.

### Helper functions

Create server helper with dependency injection for tests:

```ts
export type MembershipAutomationDeps = {
  findFamilyByLoyverseCustomerId(input: { loyverseCustomerId: string }): Promise<FamilyMatch | null>;
  findExistingAutomatedMembership(input: ExistingMembershipQuery): Promise<ExistingMembership | null>;
  createMembership(input: CreateMembershipFromReceiptInput): Promise<CreatedMembership>;
};

export const createMembershipFromReceiptAutomation = (
  options: {
    itemConfig?: MembershipPurchaseItemConfig[];
    deps?: Partial<MembershipAutomationDeps>;
  } = {}
): ReceiptAutomation => { ... };
```

Production deps can use:

- `FamiliesDatabase` + `FamiliesResponseDTO` for exact `loyverseCustomerId` matching.
- `MembershipsDatabase` + `MembershipsPatchDTO` for query/create.

Tests can pass fake deps and avoid Notion/network.

## Webhook route integration

Minimal changes in `src/routes/api/webhooks/receipt/+server.ts`:

- Import `createDefaultReceiptAutomationSuite` and `runReceiptAutomationSuite`.
- After `result.status === 'processed'`, run automations.
- Log failures and report incidents.
- Add `automationStatusCounts` to response summary.

Possible response shape:

```json
{
  "received": true,
  "status": "processed",
  "statusCounts": { "processed": 1 },
  "automationStatusCounts": { "completed": 1 }
}
```

## Incident reporting

Automation failure incident:

- `source`: `receipt-webhook`
- `code`: `RECEIPT_WEBHOOK_AUTOMATION_FAILED`
- `severity`: `critical`
- `context`:
  - `automationCode`
  - `receiptNumber`
  - `receiptKey`
  - `customerId`
  - `reason` if known
  - compact error message

Skips due to missing family/customer should likely be warning incidents only when a membership purchase item was detected.

Suggested codes:

- `MEMBERSHIP_CREATION_MISSING_CUSTOMER`
- `MEMBERSHIP_CREATION_FAMILY_NOT_FOUND`
- `MEMBERSHIP_CREATION_NOTION_CREATE_FAILED`

## Tests

Do not run `pnpm check`, `svelte check`, or `pnpm build` in this project.

Run targeted Vitest files only, e.g.:

```bash
pnpm test:unit -- --run src/lib/receipts/automations/membership-creation.test.ts
pnpm test:unit -- --run src/routes/api/webhooks/receipt/receipt-webhook-automations.test.ts
```

### Unit tests for membership automation

Create `src/lib/receipts/automations/membership-creation.test.ts`.

Cases:

1. Creates a Weekly membership for a matching receipt line.
   - Given receipt with customer and matching weekly item.
   - Fake family lookup returns a family.
   - Fake duplicate lookup returns null.
   - Assert create called with expected family id, type, number of kids, start/end dates, and receipt provenance notes.
2. Creates a Monthly membership for matching monthly item.
3. Skips receipts with no membership purchase item.
4. Skips `REFUND` receipts.
5. Skips cancelled receipts.
6. Fails/skips with clear result when `customer_id` is missing.
7. Fails/skips with clear result when family is not found.
8. Skips when an existing automated membership already exists for the receipt key.
9. Handles multiple membership purchase lines deterministically.
   - Either create one membership per line quantity or one per matched line depending on business decision.
   - Mark as pending until child-count/quantity policy is confirmed.
10. Converts Notion create errors to `failed` result.

### Runner tests

Create `src/lib/receipts/automations/automation-suite.test.ts`.

Cases:

1. Runs all automations.
2. Converts thrown errors into failed results.
3. Supports automation returning one result or an array.

### Webhook route tests

A direct SvelteKit route handler test may require mocking `$env` and module imports. If current test setup makes that awkward, prefer extracting the per-receipt orchestration into a pure server function first:

```text
src/lib/server/receipt-webhook-processing.ts
```

Then route `POST` only parses auth/body and calls the orchestrator.

Cases:

1. Processed webhook runs automations once and validation once.
2. Duplicate webhook does not run automations.
3. Stale webhook does not run automations.
4. Batch webhook aggregates automation status counts.
5. Automation failure is reported through `incidentReporter` but webhook still returns 2xx unless ingestion itself fails.

## Implementation steps

1. Add `docs/casa-luma/memberships/membership-automations.md`.
2. Add automation framework types and runner.
3. Add membership purchase config with empty production mapping and test-injected mappings.
4. Add membership Notion helper functions:
   - exact Family lookup by Loyverse customer id;
   - existing automated Membership lookup;
   - create automated Membership.
5. Add membership creation automation.
6. Add tests for automation and runner.
7. Refactor webhook per-receipt processing if needed for testability.
8. Integrate automation runner into webhook processing.
9. Add webhook/orchestrator tests.
10. After business item IDs/date policies are confirmed, fill `MEMBERSHIP_PURCHASE_ITEMS` and add fixture tests for real IDs.

## Open questions to answer before final production enablement

- Exact Loyverse item IDs for Weekly and Monthly membership purchases.
- Number-of-kids derivation.
- Weekly/monthly date boundaries.
- Whether receipt quantity can create/extend multiple memberships.
- Whether Notion Membership `Notes` is acceptable for automation provenance/idempotency, or whether a dedicated Notion field should be added later.
- Whether a later receipt update should update an existing Notion membership or require manual review.
