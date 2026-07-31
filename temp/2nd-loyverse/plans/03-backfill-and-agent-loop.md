# Plan 03: Backfill and Agent Iteration Loop

## Outcome

Provide a resumable, low-concurrency command that applies the same production mirroring pipeline to historical receipts, generates aggregated diagnostics, and lets an agent stay in the loop until every selected supported receipt succeeds.

No backfill failure sends Telegram.

## 1. Entry point

Create a thin script:

```text
scripts/2nd-loyverse/backfill.ts
```

It imports all behavior from:

```text
src/lib/server/2nd-loyverse/backfill/
```

Package command:

```text
pnpm 2nd-loyverse:backfill -- [options]
```

The script contains argument parsing and process exit handling only. It must not duplicate cohort, resolver, receipt builder, or transfer logic.

## 2. Historical source query

Use Neon for receipt discovery, but add a mirror-specific query under the module. Existing `queryReceiptsFromDb()` is insufficient because it returns bare receipts without merchant identity and does not expose the stable ordering/checkpoint needed here.

The query must return:

- source receipt key;
- merchant ID;
- receipt number;
- receipt type/refund/cancel state;
- receipt date and source update/version fields;
- persisted normalized receipt content or a way to reconstruct it;
- stable keyset cursor.

Order by an immutable/stable tuple such as source receipt date plus receipt key. Avoid offset pagination.

Fetch full source master entities from production Loyverse lazily. If normalized Neon data omits a field needed for safe creation, fetch the exact source receipt through the production API rather than inventing it.

## 3. Command modes

```text
--dry-run
--discover-only
--process
--failed-only
--ambiguous-only
--reconcile
--report-only
--receipt-number <value>
--date-from <iso>
--date-to <iso>
--limit <n>
--status <value>
--concurrency <n>
--output-dir <path>
```

Defaults:

- concurrency `1`;
- target writes require explicit `--process`;
- dry-run/discovery never create entities or receipts;
- report output under a task-specific `temp/2nd-loyverse/runs/<timestamp>/` directory;
- no Telegram.

No automatic retry cadence exists in v1. The agent/user explicitly reruns failed or ambiguous work after review.

## 4. Shared behavior

Backfill must call the same module functions used by live webhook processing for:

- eligibility;
- deterministic 50% cohort;
- source key and fingerprint;
- transfer discovery;
- entity resolution;
- sale projection;
- marker reconciliation;
- receipt POST;
- attempt persistence;
- error taxonomy.

Only trigger metadata and notification/report policy differ.

This prevents a receipt from succeeding in the CLI but failing under a different live implementation.

## 5. Backfill algorithm

### Discovery

1. Read one stable page from Neon.
2. Skip refunds and cancelled receipts with explicit reason.
3. Compute or load persisted cohort decision.
4. Upsert one transfer row per source receipt key.
5. Preserve previous succeeded/ambiguous states.
6. Advance keyset cursor only after page discovery commits.

### Processing

1. Select due requested transfer rows by status/filter.
2. Claim one source receipt atomically.
3. Insert attempt with trigger `backfill`.
4. Bulk-load/reuse source and target entity indexes for the batch.
5. Resolve/create supported entities.
6. Build sale command.
7. Reconcile target marker.
8. POST only if target is absent and state permits it.
9. Persist result.
10. Continue until limit, clean stop, or fatal configuration error.

### Reporting

At the end, aggregate:

- discovered, eligible, selected, not selected;
- succeeded, failed, ambiguous, unsupported, skipped refund/cancelled;
- counts by error code and failed stage;
- counts by entity type/name conflict;
- source receipt keys for representative examples;
- target receipt numbers for success/reconciliation;
- stage timing and request counts;
- source-versus-target total deltas caused by intentional omissions;
- exact rerun command for remaining failed/ambiguous statuses.

## 6. Report artifacts

Write both:

```text
summary.md
results.json
```

`summary.md` is optimized for agent/user review. `results.json` supports repeatable analysis.

Do not write access tokens, authorization headers, full customer data, or unbounded raw API responses. Link attempts by IDs and source receipt keys instead of duplicating existing payloads.

Example grouped section:

```text
INCOMPATIBLE_ENTITY
  count: 7
  entity: discount
  names: Staff 10%, Birthday
  sample receipts: merchant:R-101, merchant:R-204
  next action: inspect target definitions, update resolver/test, rerun --failed-only
```

## 7. Required agent loop

This is part of the feature, not informal cleanup.

### Step A: inventory and dry run

- Verify target store, payment types, tax, and currency readiness.
- Inventory source entity/receipt complexity.
- Identify true composite items separately from variants/modifiers.
- Run deterministic cohort dry-run.
- Report unsupported categories before writes.

### Step B: smallest live sandbox write

- Choose one selected simple sale.
- Process exactly one receipt.
- Inspect target entity and receipt in Loyverse.
- Verify source marker, date, lines, payment type, and calculated totals.
- Record any expected delta from omitted fields.

### Step C: complexity ladder

Process fixtures/batches in order:

1. simple one-line sale;
2. multi-line sale;
3. ordinary variants;
4. modifiers/options;
5. taxes;
6. fixed and variable discounts;
7. line-level discounts;
8. weighted/fractional quantity and variable price;
9. ten-plus-line receipt;
10. mixed complex receipt.

For each failure class:

1. inspect grouped report and source/target definitions;
2. identify root cause, not only the final API error;
3. add or update a focused regression fixture/test;
4. fix the shared module;
5. rerun only affected failed rows;
6. verify no duplicate target marker/receipt;
7. update plan/run notes only for durable discoveries.

### Step D: expand volume

Suggested progression:

```text
1 -> 5 -> 25 -> 100 -> bounded date window -> all selected supported history
```

Do not advance while unexplained failures or ambiguous POSTs remain.

### Step E: zero-failure gate

Before enabling live webhook mirroring:

- all selected supported receipts in the agreed historical window are `succeeded`;
- every unsupported/skipped receipt has an explicit reason;
- ambiguous count is zero;
- target-marker duplicate count is zero;
- ordinary variants, modifiers, taxes, and discounts have representative success;
- report contains no unknown error code;
- rerunning the same window performs zero additional receipt POSTs.

## 8. Manual failed-row handling

`--failed-only` is the v1 retry mechanism.

Rules:

- never retry `ambiguous` through ordinary processing;
- reconcile ambiguous marker first;
- never retry skipped refunds/cancellations as sales;
- clear/release a failed state only after configuration/code/entity correction;
- preserve all attempt history;
- succeeded transfer remains immutable.

If repeated transient failures make this manual process burdensome, use the persisted data to design a later scheduled drain rather than adding it preemptively.

## 9. Live rollout feedback

After webhook activation, the CLI can report or process live failures without triggering Telegram again:

```text
--failed-only --status failed
--ambiguous-only --reconcile
--report-only --date-from <activation-date>
```

The live Telegram message gives immediate awareness. The backfill report gives grouped root-cause context.

## 10. Tests

Focused tests:

- stable keyset pagination;
- source key includes merchant identity;
- same cohort result as webhook;
- refunds/cancelled skip;
- dry-run makes no API writes;
- discovery is idempotent;
- failed-only excludes success and ambiguity;
- reconcile prevents duplicate POST;
- concurrency defaults to one;
- interrupted run resumes without offset loss;
- reports group safe errors and include rerun command;
- no Telegram for backfill/manual attempts;
- rerunning successful window creates zero receipts;
- intentional customer/loyalty/tip/surcharge omissions appear as fidelity notes.

## Acceptance gate

The backfill plan is complete when an interrupted run resumes safely, reports make root causes obvious, failed rows can be fixed and rerun without duplicates, and the same historical window reaches zero unexplained failures and zero ambiguous outcomes.
