# Current State — Loyverse Receipt Ingestion, Neon, Backfill, `/tools/receipts`

Updated: 2026-05-05

## Summary

The receipt data foundation is mostly implemented, not just planned. Webhooks and backfill both converge on the same DB ingestion core, and `/tools/receipts` already reads from the normalized Postgres/Neon receipt tables. The main gaps are operational/documentation gaps, reconciliation tooling, likely production env/webhook setup, and a few code hardening issues.

## Write path

### Webhook

- Endpoint: `src/routes/api/webhooks/receipt/+server.ts`
- URL path: `POST /api/webhooks/receipt`
- Optional auth: if `LOYVERSE_WEBHOOK_SECRET` is set, request must send matching `x-webhook-token` header.
- Accepts:
  - single receipt under top-level `items`, or
  - batch under top-level `receipts[]`.
- Calls `ingestReceiptWebhook()` from `src/lib/server/db/ingest-receipt-webhook.ts`.
- Runs receipt validation/incidents only when ingestion returns `processed`.

### Shared ingestion core

- File: `src/lib/server/db/ingest-receipt-core.ts`
- Contract: `{ merchant_id, type, created_at, items: LoyverseReceipt }`
- Receipt key: `${merchant_id}:${receipt_number}`
- Raw event table: `webhook_events`
- Normalized header table: `receipts`
- Child tables: line items, line modifiers, receipt/line discounts, receipt/line taxes, payments.
- Idempotency:
  - `dedupe_key` is SHA-256 over merchant/type/event timestamp/receipt number/receipt `updated_at`/total.
  - `webhook_events.dedupe_key` is unique.
- Update/stale behavior:
  - Existing receipt with `updatedFromEventAt > incoming eventCreatedAt` is treated as `stale`.
  - Otherwise receipt header is upserted, all child rows for the receipt key are deleted and reinserted.

### Backfill

- Script: `scripts/backfill-loyverse-receipts.ts`
- Package command: `pnpm receipts:backfill -- [args]`
- Fetches Loyverse `/v1.0/receipts` with `limit=250`, cursor paging.
- Supports `--date-from`, `--date-to`, `--store-id`, `--receipt-number`, `--max`, `--dry-run`, `--concurrency`.
- Requires `LOYVERSE_ACCESS_TOKEN`.
- Requires `LOYVERSE_MERCHANT_ID` or `--merchant-id`.
- Writes synthetic events with type `receipt.backfill.import` through the same ingestion core.
- Reconciliation script now exists at `scripts/reconcile-loyverse-receipts.ts` with package command `pnpm receipts:reconcile -- [args]`.
- Backfill dry-run only counts fetchable/processable receipts; use reconciliation reports before and after real backfills.

## Read path: `/tools/receipts`

Current route already uses Neon/Postgres.

Flow:

1. `src/routes/tools/receipts/+page.svelte`
2. imports `getReceipts` from `src/lib/receipts.remote.ts`
3. `getReceipts()` calls `queryReceiptsFromDb()`
4. `queryReceiptsFromDb()` reads normalized tables via `src/lib/server/db/client.ts`
5. DB rows are reconstructed into `LoyverseReceipt` shape for existing UI components.

Important behavior:

- List tab loads pages of 50.
- Analytics/tools tabs loop through all pages at limit 250 for the selected filters.
- Date filters currently use `receipts.createdAt`, not `receiptDate`.
- Pagination sorts by `updatedFromEventAt desc, receiptKey desc`.

## Database and migrations

- Runtime DB client: `src/lib/server/db/client.ts`
- Schema: single file `src/lib/server/db/schema.ts` (not the older planned `schema/` directory structure).
- Migrations:
  - `drizzle/0000_ancient_bromley.sql` — receipt/webhook tables.
  - `drizzle/0001_black_avengers.sql` — `reported_errors` incident table.
- Runtime connection fallback order:
  1. `DATABASE_URL`
  2. `POSTGRES_URL`
  3. `DATABASE_URL_UNPOOLED`
  4. `POSTGRES_URL_NON_POOLING`
  5. local `postgres://app:app@localhost:5432/casa_luma`
- Migration config prefers unpooled URL.
- Neon is documented as primary; Docker Postgres is local/offline fallback.

## Operational risks/gaps found

1. **Vercel/env likely issue**
   - `.env.example` lacks `LOYVERSE_ACCESS_TOKEN`, `LOYVERSE_MERCHANT_ID`, `DATABASE_URL_UNPOOLED`, `LOYVERSE_STORE_ID`.
   - Local `.env` appears to have typo `LOYV4ERSE_STORE_ID`; code expects `LOYVERSE_STORE_ID`. This caused `pnpm check` errors.

2. **Webhook CSRF bypass gap**
   - `src/hooks.server.ts` adjusts Origin only for `/api/customer`.
   - External Loyverse receipt webhook path `/api/webhooks/receipt` may also need this if SvelteKit CSRF rejects requests in production.

3. **Docs are stale in places**
   - Plan still says schema files live in `src/lib/server/db/schema/*`, but actual schema is `schema.ts`.
   - Plan mentions valibot validation and fixed-precision money; actual code uses hand-written structural checks and `doublePrecision`.
   - Plan still has "Immediate Next Implementation Steps" that are already done.

4. **Reconciliation tool added**
   - `scripts/reconcile-loyverse-receipts.ts` fetches Loyverse and Neon receipts for a scoped window and writes markdown/optional JSON reports under `temp/loyverse-receipts-recovery/`.
   - It compares missing in Neon, stale in Neon, header mismatches, and extra in Neon. It is read-only.

5. **Backfill validation parity**
   - Webhook path runs validation/incidents after processed receipt.
   - Backfill path only ingests; it does not run validation rules.

6. **Local DB docs vs drizzle ssl**
   - `drizzle.config.ts` sets `ssl: true` always. This is right for Neon, but may conflict with local Docker Postgres migrations.

7. **Receipt UI type issues**
   - `pnpm check` reports `ReceiptsAnalytics.svelte` chart label formatter typing issues. This is receipt-specific and may block clean deploy if repo-wide checking is required.

8. **Empty route directories**
   - Scout found empty `src/routes/tools/receipts-local`, `src/routes/tools/receipt-scanner`, `src/routes/api/scan-receipt` directories. They are cleanup candidates if truly empty/untracked placeholders.

## Recommended next actions

1. Set `LOYVERSE_MERCHANT_ID` locally/Vercel or keep passing `--merchant-id`; local env currently lacks it.
2. Full requested reconciliation range `2026-01-01T00:00:00Z` through `2026-05-05T23:59:59Z` found 4,242 Loyverse receipts and 904 Neon receipts: 3,338 missing, 0 stale, 0 mismatches, 0 extra.
3. Full requested backfill dry-run for the same scope fetched/validated 4,242 receipts with 0 skipped/failed.
4. Next step is the real backfill for the same scope, then post-check reconciliation.
5. Optionally fix `ReceiptsAnalytics.svelte` type errors before any deploy that requires clean `pnpm check`.
