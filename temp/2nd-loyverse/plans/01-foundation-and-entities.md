# Plan 01: Foundation and Lazy Entities

## Outcome

Provide the isolated `2nd-loyverse` foundation: account-aware API access, explicit types, Neon transfer tracking, deterministic cohorting, and lazy name-based resolution for entities required by sale receipts.

## 1. Module structure

```text
src/lib/server/2nd-loyverse/
  index.ts
  config.ts
  clients.ts
  types.ts
  errors.ts
  normalize.ts
  entities/
    inventory.ts
    payment-types.ts
    categories.ts
    taxes.ts
    discounts.ts
    modifiers.ts
    items.ts
    resolver.ts
  db/
    schema.ts
  foundation tests
```

`index.ts` exposes only the public orchestration API. Callers must not import internal resolvers directly.

## 2. Reuse existing Loyverse code

Refactor `src/lib/server/loyverse.ts` only enough to expose an account-neutral client or request transport that accepts an access token and injected `fetch`.

Preserve the existing primary `loyverse` singleton and its callers.

Reuse existing operations and logic:

| Capability | Existing code | Approach |
| --- | --- | --- |
| Customers | `src/lib/server/loyverse.ts`, `server/intake-actions.ts` | Do not use for this feature. Customer omission is intentional. |
| Categories | `server/loyverse.ts`, `category-sync.remote.ts` | Reuse list/create and normalized-name concepts. Never delete. |
| Items/variants | `server/loyverse.ts`, `menu-sync.remote.ts`, `open-play-sync.remote.ts` | Reuse payload construction and safe option reconciliation concepts. |
| Item option fields | `loyverse-item-sync.logic.ts` | Reuse pure builder where compatible. |
| Discounts | `server/loyverse.ts`, `discount-sync.remote.ts` | Reuse create/update payload mapping, adapted to target store. |
| Modifiers/options | `server/loyverse.ts`, `modifier-sync.remote.ts` | Reuse parent-with-options creation and ordering. |
| Taxes | Not supported by current client | Add second-module adapter over shared transport. |
| Payment types | Not supported by current client | Add GET-only second-module adapter. |
| Receipts | Existing read types only | Add explicit create types in this module. |

Do not call `$app/server` remote functions from the mirror. Import pure helpers or extract account-neutral logic instead.

## 3. Type model

Define separate contracts for:

1. existing source/webhook receipt response;
2. complete source entity responses;
3. target writable entity payloads;
4. target writable sale payload;
5. target receipt response;
6. transfer and attempt states.

Never cast `LoyverseReceipt` directly into a POST body.

The create payload must make omitted decisions visible. For example, the builder should not even expose `customer_id` or `employee_id` in its internal input unless a later scope change is deliberate.

## 4. Configuration

Read private environment only inside module config:

```text
LOYVERSE_2_ACCESS_TOKEN
LOYVERSE_2_STORE_ID
LOYVERSE_2_MIRROR_ENABLED
```

Source reads continue using the existing production token. Target writes always force the second store ID.

Configuration validation must:

- trim values;
- fail safely without printing tokens;
- distinguish disabled feature from missing required configuration;
- allow explicit config and fetch injection in tests.

## 5. Neon schema

### Transfer table

`second_loyverse_receipt_transfers`:

- `sourceReceiptKey` primary key;
- `sourceMerchantId`;
- `sourceReceiptNumber`;
- `sourceEventType` and optional source event ID;
- `sourceUpdatedAt` and source fingerprint;
- cohort algorithm version, bucket, and selected flag;
- status;
- attempt count;
- processing token and processing-started timestamp for atomic live/backfill claims and manual stale-claim recovery;
- deterministic target order marker;
- target receipt number and target receipt date;
- safe last error code, stage, message, and HTTP status;
- first seen, last seen, started, succeeded, and updated timestamps.

Indexes:

- selected plus status;
- source date/key;
- target receipt number;
- target order marker.

Unique target receipt number and order marker when non-null.

### Attempt table

`second_loyverse_receipt_attempts`:

- generated attempt ID;
- source receipt key;
- monotonic attempt number;
- trigger: `webhook`, `backfill`, `manual`, or `reconcile`;
- stage and outcome;
- started/finished timestamps;
- request fingerprint;
- safe HTTP status and bounded response/error summary;
- target receipt number if returned/discovered;
- incident ID and live notification result when applicable.

Unique `(sourceReceiptKey, attemptNumber)`.

Do not duplicate full payloads. Existing webhook/raw and normalized receipt tables remain source-of-truth. No entity mapping, line mapping, refund table, scheduled retry fields, or backfill-run table in v1.

Module table declarations live under `2nd-loyverse/db/`; the central Drizzle schema may re-export them.

## 6. Deterministic cohort

Use existing business identity:

```text
sourceReceiptKey = merchant_id + ":" + receipt_number
```

Algorithm:

1. Hash a versioned key with SHA-256.
2. Convert fixed digest bytes to bucket `0..9999`.
3. Select bucket `< 5000`.
4. Persist version, bucket, and selection on first discovery.
5. Never recalculate an existing persisted decision.

This produces approximately half of a finite set while remaining deterministic across webhook retries and backfill.

## 7. Receipt eligibility

Before entity work:

- require `receipt_type === "SALE"` or equivalent sale semantics;
- skip when `refund_for` is present;
- skip explicit refund event/receipt types;
- skip when `cancelled_at` is present;
- skip true composite-item receipts in v1 if detected;
- preserve skip reason for reporting;
- evaluate eligibility before cohort processing where practical, while keeping metrics clear.

Suggested statuses:

```text
not_selected
queued
processing
succeeded
failed
ambiguous
skipped_refund
skipped_cancelled
unsupported
source_changed
```

## 8. Name-based inventory strategy

Loyverse does not document direct item lookup by name. Avoid per-line API calls:

1. Fetch paginated source and target inventories with `limit=250`.
2. Filter deleted entities.
3. Normalize names with Unicode NFC, trim, whitespace collapse, and case folding.
4. Build maps from normalized key to candidate arrays.
5. Resolve within parent context.
6. Cache inventories for one transfer/batch and optionally a short process TTL.
7. Update target indexes immediately after successful creates.

A ten-item receipt therefore resolves from memory after inventory fetch, rather than issuing ten name searches.

Match rules:

- exactly one compatible candidate: use it;
- no candidate: create when supported;
- multiple candidates: fail `AMBIGUOUS_ENTITY_NAME`;
- one incompatible candidate: fail `INCOMPATIBLE_ENTITY`;
- never silently pick the first candidate;
- never delete or automatically overwrite target entities in v1.

Backfill uses concurrency `1`. Live requests may still overlap, so after an ambiguous create response or suspected race, refresh target inventory before another create. If race failures become common, add entity claims/mappings in v2.

## 9. Entity dependency order

### Payment types

- Fetch target payment types once.
- Match source payment name to one normalized target name.
- Never create payment types.
- Fail clearly if absent or duplicated.

### Categories

- Match unique normalized name.
- Create missing target category.
- Never delete or rename existing target category.

### Taxes

- Match unique normalized name.
- Verify type, rate, and target-store compatibility.
- Create missing compatible tax definition.
- Same account-level tax setup is a readiness assumption, not a reason to skip verification.

### Discounts

Support ordinary fixed/variable amount and percentage discounts:

- match name, type, and configured value;
- create missing discount and assign target store;
- map receipt-level and line-level uses to target discount ID;
- fail incompatible same-name definitions.

Point-based discounts are unsupported because customer/loyalty state is intentionally absent.

### Modifiers and options

- Match modifier by unique normalized parent name.
- Match option under that parent by normalized option name and verify price.
- Create a missing parent with all needed source options.
- Do not copy source modifier or option IDs.
- Do not silently restructure an existing target modifier.

### Items and variants

Dependency order:

1. category;
2. taxes;
3. modifiers/options;
4. parent item;
5. variants.

Item matching:

- unique normalized item name;
- verify option names and supported configuration.

Variant matching within parent:

- normalized option tuple or variant name;
- SKU as a tie-breaker, not the sole cross-account identity;
- verify pricing type and relevant structure.

Create a receipt-minimal but semantically safe target item. Explicitly map target category, tax, modifier, and store availability. Never copy source store IDs, supplier IDs, or component variant IDs.

Variants and modifiers are supported. True `is_composite=true` BOM items remain unsupported in v1 unless inventory inspection changes the plan.

## 10. API safety

- Respect 300 requests per 300 seconds per account.
- Use cursor pagination correctly.
- Bound and sanitize response errors.
- Classify 401/403, 404, 429, 5xx, network, validation, and ambiguity separately.
- Do not log bearer tokens or raw headers.
- Re-read after uncertain entity create responses before retrying creation.

## 11. Tests

Focused tests for:

- source and target tokens remain isolated;
- missing/disabled config;
- pagination and cache/index construction;
- normalization and duplicate names;
- cohort boundaries and persistence;
- refund/cancel skip rules;
- each resolver: unique match, create, incompatible, duplicate, deleted;
- modifier parent/option context;
- item variant option tuples and SKU tie-break;
- ordinary discount types and points exclusion;
- true composite exclusion;
- no customer or employee fields;
- safe errors and no secret leakage.

## Acceptance gate

Foundation is complete when representative source entities resolve to target IDs without per-item name requests, missing supported entities are created once in controlled tests, duplicate names fail visibly, and repeated resolution uses the target inventory rather than creating duplicates.
