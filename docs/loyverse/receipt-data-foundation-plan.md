# Loyverse Receipt Data Foundation

This document now describes the current receipt ingestion architecture and operating runbook. The original plan has mostly been implemented: receipt webhooks and backfill both write normalized Postgres/Neon tables, and `/tools/receipts` reads those tables.

## Current architecture

1. Loyverse sends closed receipt webhooks to `POST /api/webhooks/receipt`.
2. `src/routes/api/webhooks/receipt/+server.ts` validates the optional `x-webhook-token` header against `LOYVERSE_WEBHOOK_SECRET`, accepts a single receipt under `items` or a batch under `receipts[]`, and calls ingestion.
3. `src/lib/server/db/ingest-receipt-webhook.ts` delegates to `src/lib/server/db/ingest-receipt-core.ts` using the app DB client.
4. `ingest-receipt-core.ts` writes the raw event to `webhook_events`, then upserts `receipts` and replaces child rows in one transaction.
5. `/tools/receipts` calls `src/lib/receipts.remote.ts`, which calls `queryReceiptsFromDb()` in `src/lib/server/db/receipt-queries.ts` and reconstructs Loyverse-shaped receipt objects from Neon/Postgres.

Backfills use the same ingestion core through `scripts/backfill-loyverse-receipts.ts`, with synthetic event type `receipt.backfill.import`.

## Database model

Schema is currently in one file: `src/lib/server/db/schema.ts`.

Tables:

- `webhook_events`: raw payload, dedupe key, processing status, errors.
- `receipts`: one row per merchant/receipt number.
- `receipt_line_items`
- `receipt_line_modifiers`
- `receipt_discounts`
- `receipt_line_discounts`
- `receipt_taxes`
- `receipt_line_taxes`
- `receipt_payments`
- `reported_errors`: validation/incident pipeline.

Migrations live in `drizzle/`:

- `0000_ancient_bromley.sql`: receipt/webhook schema.
- `0001_black_avengers.sql`: reported errors table.

Current monetary columns use `doublePrecision`. Do not assume fixed-precision `numeric` unless a future migration changes this deliberately.

## Idempotency and update behavior

- Business receipt key: `${merchant_id}:${receipt_number}`.
- `webhook_events.dedupe_key` is a SHA-256 hash over merchant id, event type, event timestamp, receipt number, receipt `updated_at`, and total.
- Duplicate raw events are acknowledged and skipped.
- If an existing receipt has `updated_from_event_at` newer than the incoming event timestamp, the incoming event is marked processed but treated as stale.
- Otherwise the receipt header is upserted and child rows are deleted/reinserted for that receipt.

## Validation and incidents

The webhook route runs receipt validation and incident reporting after a receipt is successfully processed. Shape checks are currently hand-written in the route/core; valibot is only used for receipt query input validation.

Backfill currently ingests only; it does not run the webhook validation/incident step. If validation parity is required for historical imports, add it explicitly before relying on backfill for incident coverage.

## Environment variables

Required for production runtime:

- `DATABASE_URL` — Neon pooled connection string.
- `LOYVERSE_WEBHOOK_SECRET` — optional but recommended; Loyverse must send matching `x-webhook-token` if set.

Required for migrations/tools:

- `DATABASE_URL_UNPOOLED` — Neon direct connection string for Drizzle migrations.
- `LOYVERSE_ACCESS_TOKEN` — required for backfill/reconciliation scripts.
- `LOYVERSE_MERCHANT_ID` — required for backfill/reconciliation unless `--merchant-id` is passed.
- `LOYVERSE_STORE_ID` — optional default store id; spelling must be exactly this.

See `.env.example` and `docs/database.md`.

## Commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio

pnpm receipts:reconcile -- --date-from 2026-04-28T00:00:00Z --date-to 2026-05-05T23:59:59Z --json
pnpm receipts:backfill -- --date-from 2026-04-28T00:00:00Z --date-to 2026-05-05T23:59:59Z --dry-run
pnpm receipts:backfill -- --date-from 2026-04-28T00:00:00Z --date-to 2026-05-05T23:59:59Z
```

## Operational checklist

Before enabling production ingestion/backfill:

1. Confirm Vercel has `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `LOYVERSE_WEBHOOK_SECRET`, and any alerting vars.
2. Confirm Loyverse webhook URL points to `https://<deployment>/api/webhooks/receipt` and sends `x-webhook-token` if a secret is configured.
3. Run `pnpm db:migrate` against Neon.
4. Run reconciliation for a small date window.
5. Run backfill dry-run for that same window.
6. Run real backfill only after the reconciliation report looks correct.
7. Re-run reconciliation and manually check `/tools/receipts`.

## Remaining gaps

- Full historical reconciliation/backfill has not been run in this recovery project.
- Backfill validation parity is not implemented.
- Receipt UI type issues may still appear in repo-wide `pnpm check` alongside unrelated errors.
- Analytics views/materialized views are still future work.
