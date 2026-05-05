# Loyverse Receipt Backfill and Reconciliation

Use reconciliation before any real backfill. The goal is to compare Loyverse API receipts with Neon/Postgres rows, identify missing/stale/mismatched receipts, then import only when the report looks sane.

## Prerequisites

Required env vars:

- `DATABASE_URL` or `POSTGRES_URL` — target database; usually Neon pooled URL.
- `LOYVERSE_ACCESS_TOKEN` — API token for fetching receipts.
- `LOYVERSE_MERCHANT_ID` — merchant id used to build `receipt_key`; can be replaced with `--merchant-id`.

Optional:

- `DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING`
- `LOYVERSE_STORE_ID` for your own shell convenience. Scripts still need `--store-id` if you want to filter by store.

Never print secrets in logs or paste them into reports.

## Reconciliation command

```bash
pnpm receipts:reconcile -- --date-from 2026-04-28T00:00:00Z --date-to 2026-05-05T23:59:59Z --json
```

Options:

- `--merchant-id <id>`: override `LOYVERSE_MERCHANT_ID`.
- `--date-from <iso>`: maps to Loyverse `created_at_min` and DB `receipts.created_at >=`.
- `--date-to <iso>`: maps to Loyverse `created_at_max` and DB `receipts.created_at <=`.
- `--store-id <id>`: restrict both sources to one store.
- `--receipt-number <number>`: inspect one receipt.
- `--max <n>`: fetch at most `n` Loyverse receipts; useful for first smoke tests.
- `--output-dir <path>`: default `temp/loyverse-receipts-recovery`.
- `--json`: write a full JSON report in addition to markdown.

Reports are written as:

```text
temp/loyverse-receipts-recovery/reconciliation-<timestamp>.md
temp/loyverse-receipts-recovery/reconciliation-<timestamp>.json
```

The markdown report lists the first 100 rows per category. Use JSON for the complete lists.

## What reconciliation compares

The script fetches receipts from Loyverse and rows from Neon for the same scope, keyed by `receipt_number` within the selected merchant.

Categories:

- `missingInDb`: Loyverse has the receipt; Neon does not.
- `staleInDb`: Loyverse `updated_at` or `created_at` is newer than Neon `updated_from_event_at`.
- `mismatches`: receipt exists in both but amount/date/store fields differ.
- `extraInDb`: Neon has a receipt that Loyverse did not return for the same scope.

Date scope uses `created_at` because the backfill API and current `/tools/receipts` DB query use created timestamps. Revisit this if business reporting should use `receipt_date` instead.

## Safe run sequence

Start narrow:

```bash
pnpm receipts:reconcile -- --date-from 2026-05-01T00:00:00Z --date-to 2026-05-02T00:00:00Z --max 25 --json
```

Then run a real window:

```bash
pnpm receipts:reconcile -- --date-from 2026-04-28T00:00:00Z --date-to 2026-05-05T23:59:59Z --json
```

If missing/stale rows look expected, dry-run backfill for exactly the same scope:

```bash
pnpm receipts:backfill -- --date-from 2026-04-28T00:00:00Z --date-to 2026-05-05T23:59:59Z --dry-run
```

Then real backfill:

```bash
pnpm receipts:backfill -- --date-from 2026-04-28T00:00:00Z --date-to 2026-05-05T23:59:59Z
```

Then reconcile the same scope again:

```bash
pnpm receipts:reconcile -- --date-from 2026-04-28T00:00:00Z --date-to 2026-05-05T23:59:59Z --json
```

Expected post-backfill result: `missingInDb: 0`, `staleInDb: 0`, and no unexplained mismatches.

## Backfill behavior

Backfill command:

```bash
pnpm receipts:backfill -- [options]
```

Options include `--date-from`, `--date-to`, `--store-id`, `--receipt-number`, `--max`, `--dry-run`, `--concurrency`, and `--merchant-id`.

Backfill fetches Loyverse `/v1.0/receipts`, then calls `ingestReceiptWebhookWithDb()` with synthetic event type `receipt.backfill.import`. The ingestion core remains idempotent:

- duplicate event dedupe keys are skipped;
- older events are marked stale;
- accepted receipts are upserted and child rows are replaced.

## Safety rules

- Reconcile first; never start with a full historical real backfill.
- Use small date windows first.
- Use `--dry-run` before real imports.
- Keep concurrency modest unless the API and DB are behaving well.
- Do not delete Neon rows as part of reconciliation. `extraInDb` is informational.
- Keep reports under `temp/loyverse-receipts-recovery/` so recovery state is trackable.

## Open gaps

- Backfill does not currently run receipt validation/incident reporting.
- Reconciliation compares header-level fields only, not every line item/payment/tax child row.
- Full historical date range still needs an operator decision.
