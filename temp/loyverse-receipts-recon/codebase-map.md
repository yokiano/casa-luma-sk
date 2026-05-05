# Code Context

## Files Retrieved
1. `docs/loyverse/receipt-data-foundation-plan.md` (lines 1-90, 130-189) - original/target plan, now partly stale.
2. `scripts/backfill-loyverse-receipts.ts` (lines 1-327) - CLI backfill entry point and Loyverse API importer.
3. `src/lib/server/db/ingest-receipt-core.ts` (lines 1-312) - core ingestion/idempotency/normalization logic.
4. `src/lib/server/db/ingest-receipt-webhook.ts` (lines 1-11) - production wrapper binding core ingestion to shared DB client.
5. `src/routes/api/webhooks/receipt/+server.ts` (lines 1-221) - receipt webhook endpoint, auth, validation, incidents.
6. `src/lib/server/db/schema.ts` (lines 1-240) - Drizzle tables for events, receipts, children, reported errors.
7. `drizzle/0000_ancient_bromley.sql` (lines 1-132) - initial receipt/webhook schema migration.
8. `drizzle/0001_black_avengers.sql` (lines 1-29) - `reported_errors` incident table migration.
9. `src/lib/server/db/receipt-queries.ts` (lines 1-280) - DB-to-LoyverseReceipt query/reassembly logic.
10. `src/lib/receipts.remote.ts` (lines 1-30) - SvelteKit remote query API for receipts UI.
11. `src/routes/tools/receipts/+page.svelte` (lines 1-191) - UI route consuming remote query; list/analytics/tools tabs.
12. `src/lib/receipts/types.ts` (lines 1-95) - shared Loyverse receipt payload shape.
13. `src/lib/server/db/client.ts` (lines 1-26) - runtime Postgres/Drizzle client.
14. `drizzle.config.ts` (lines 1-27) - migration config and env fallback order.
15. `docs/database.md` (lines 1-94) - Neon/current DB docs and local dev workaround.
16. `.env.example` (lines 1-22) - documented env vars.
17. `docker-compose.yml` (lines 1-21) - local Postgres service.
18. `package.json` (lines 6-22) - DB/backfill scripts.
19. `docs/loyverse/receipt-validation-engine.md` (lines 1-115) - validation/incident pipeline docs.

## Key Code

- Ingestion contract: `LoyverseReceiptWebhookPayload` is `{ merchant_id, type, created_at, items: LoyverseReceipt }` in `src/lib/server/db/ingest-receipt-core.ts` lines 22-27.
- Dedupe key is SHA-256 over merchant/type/event timestamp/receipt number/receipt updated_at/total (`ingest-receipt-core.ts` lines 37-48). Duplicate events return `{ status: 'duplicate' }` after `ON CONFLICT DO NOTHING` on `webhook_events.dedupe_key` (`lines 202-216`).
- Event-order guard: existing `receipts.updatedFromEventAt > eventCreatedAt` marks new event processed and returns stale (`ingest-receipt-core.ts` lines 218-230). Equal timestamps are allowed to update.
- Normalization transaction: upsert `receipts`, delete all child rows for `receiptKey`, insert receipt taxes/discounts/payments/line data, mark event processed (`ingest-receipt-core.ts` lines 232-311).
- Webhook endpoint supports two payload shapes: one receipt under `items`, or batch under top-level `receipts[]` (`src/routes/api/webhooks/receipt/+server.ts` lines 41-70). Optional auth uses header `x-webhook-token` against `LOYVERSE_WEBHOOK_SECRET` (`lines 81-88`).
- Webhook validation/incidents only run for `processed` results (`+server.ts` lines 131-177). Duplicate/stale events skip validation.
- On invalid shape/no valid receipts, endpoint records warning incidents and still returns 2xx ignored statuses (`+server.ts` lines 92-128). On processing exceptions it reports a critical incident, returns 503 only for nested `ECONNREFUSED`, otherwise 400 (`lines 197-220`).
- Schema currently lives in one file, not the planned `schema/` directory. Important tables/indexes:
  - `webhook_events` raw payload + processed flags + unique dedupe (`schema.ts` lines 14-32).
  - `receipts` primary `receipt_key`, unique `(merchant_id, receipt_number)`, date/store indexes (`schema.ts` lines 64-99).
  - Child tables for line items/modifiers/discounts/taxes/payments, each keyed by `receipt_key` plus indices (`schema.ts` lines 101-240).
  - `reported_errors` for incident pipeline (`schema.ts` lines 34-62).
- Backfill uses Loyverse `/v1.0/receipts` with `limit=250`, optional `created_at_min/max`, `store_id`, `receipt_numbers`, paginated by cursor (`scripts/backfill-loyverse-receipts.ts` lines 146-177, 211-220). It transforms each receipt into a synthetic event type `receipt.backfill.import` and calls the same core ingestion (`lines 259-265`).
- Backfill env/options: needs `LOYVERSE_ACCESS_TOKEN`; merchant from `LOYVERSE_MERCHANT_ID` or `--merchant-id`; has `--date-from`, `--date-to`, `--store-id`, `--receipt-number`, `--max`, `--dry-run`, `--concurrency` capped at 25 (`scripts/backfill-loyverse-receipts.ts` lines 66-143, 180-186).
- Query path: `getReceipts` remote validates simple filters with valibot and calls `queryReceiptsFromDb` (`src/lib/receipts.remote.ts` lines 1-30). DB query filters on `receipts.createdAt` and `storeId`, sorts by `updatedFromEventAt desc, receiptKey desc`, cursor encodes those values (`receipt-queries.ts` lines 174-216). It reassembles normalized rows back into `LoyverseReceipt` (`receipt-queries.ts` lines 59-171, 226-280+).
- UI path: `/tools/receipts` loads first 50 receipts for last 7 days, has Load More, and analytics/tools tabs load all matching pages at limit 250 (`src/routes/tools/receipts/+page.svelte` lines 54-138, 141-191).

## Architecture

Loyverse webhook or backfill both converge on `ingestReceiptWebhookWithDb`. The route wrapper uses the app singleton `db`; the backfill creates its own Drizzle client from Node env. Ingestion stores the raw event first, then normalizes into a hybrid model keyed by `receiptKey = merchant_id:receipt_number`. Child rows are replace-on-update rather than diffed.

Read flow is the reverse: `/tools/receipts` -> `$lib/receipts.remote.ts` server query -> `queryReceiptsFromDb` -> normalized tables -> reconstructed `LoyverseReceipt` objects -> receipt components/analytics/tools.

Database ops are Drizzle-first. Runtime client prefers pooled `DATABASE_URL` and disables prepared statements for pgbouncer (`src/lib/server/db/client.ts` lines 6-22). Migrations use `drizzle.config.ts`, preferring `DATABASE_URL_UNPOOLED` and outputting to `drizzle/` (`drizzle.config.ts` lines 8-26). Package scripts include `db:generate`, `db:migrate`, `db:push`, `db:studio`, `receipts:backfill` (`package.json` lines 17-22).

## Current Operational State Clues

- Docs say Neon is current and Docker Postgres is previous/local only (`docs/database.md` lines 3-23, 79-94; plan lines 175-181).
- Migrations exist for receipt ingestion and incidents (`drizzle/0000_ancient_bromley.sql`, `drizzle/0001_black_avengers.sql`), so this is implemented beyond the plan.
- `/tools/receipts` copy says receipts are stored in Neon (`src/routes/tools/receipts/+page.svelte` lines 141-146).
- Validation/alerting is integrated and documented, with Telegram optional and `RECEIPT_VALIDATION_FORCE_FAIL` test switch (`docs/loyverse/receipt-validation-engine.md` lines 1-115; `.env.example` lines 13-22).
- Empty route directories exist for `src/routes/tools/receipts-local`, `src/routes/tools/receipt-scanner`, and `src/routes/api/scan-receipt`; likely abandoned placeholders/local experiments.

## Temporary / Local-Dev Code Candidates

- `docker-compose.yml` and fallback `postgres://app:app@localhost:5432/casa_luma` in `client.ts`, `drizzle.config.ts`, and backfill are local-dev support. Keep if offline/local DB remains desired; document clearly.
- `drizzle.config.ts` always sets `ssl: true` (lines 23-26), which may conflict with local Docker Postgres despite local fallback docs.
- `RECEIPT_VALIDATION_FORCE_FAIL` is intentionally test-only; ensure production env is `0`/unset.
- Empty `receipts-local`, `receipt-scanner`, and `api/scan-receipt` route dirs are cleanup candidates.
- Plan still says schema files live in `src/lib/server/db/schema/*`, but actual schema is `src/lib/server/db/schema.ts`.
- `src/lib/server/loyverse.ts` has API client for customers/items/categories/discounts/modifiers, not receipts; receipt backfill does direct fetch in script.

## Doc Gaps / Risks

- Plan claims monetary columns should be fixed precision, but schema uses `doublePrecision` throughout money/rates (`schema.ts` lines 83-90, 112-119, 138-139, 159-160, 196-197, 233). Decide whether to migrate to numeric or update docs.
- Plan asks to validate with valibot, but webhook shape validation is hand-written structural checks; valibot only appears in remote query input.
- Plan says "return 2xx quickly"/avoid long sync processing, but webhook processes every receipt sequentially and runs validation/incidents inline before responding.
- No reconciliation query/tool found despite plan immediate step 5 (`docs/loyverse/receipt-data-foundation-plan.md` lines 183-189).
- Backfill does not run validation/incident rules, only ingestion. This diverges from validation doc claim engine can be used by backfills.
- Backfill/API date filters use receipt `created_at_min/max`; UI filters DB `receipts.createdAt`, not `receiptDate`. Confirm business semantics.
- Dedupe key includes mutable `total_money` and `updated_at`; same receipt/event with changed totals becomes a different event and updates receipt if timestamp is not stale. That may be intended audit behavior, but document it.
- Stale event marking happens outside the normalization transaction; processed flag is set but `errorMessage` not cleared.
- Child tables have no explicit foreign keys to `receipts`; deletes are manual and cascading is not enforced by DB.
- `.env.example` lacks `DATABASE_URL_UNPOOLED`, `LOYVERSE_ACCESS_TOKEN`, and `LOYVERSE_MERCHANT_ID`, though docs/scripts require them.
- Docs/database says schema files live under `src/lib/server/db/schema/`, but repo has a single `schema.ts` file.
- `drizzle.config.ts` with `ssl: true` plus local fallback docs is a likely local migration footgun.

## Recommended Milestone Breakdown

1. **Document actual state**: update plan/database/env docs for single `schema.ts`, implemented migrations, required backfill vars, actual validation strategy, and local SSL caveat.
2. **Operational hardening**: add reconciliation/admin query for `webhook_events` received vs processed/errors; decide webhook error response policy; add basic backfill runbook with safe dry-run/max examples.
3. **Data correctness pass**: decide double vs numeric money columns; confirm date semantics; add/omit foreign keys deliberately; clarify dedupe/event-order rules.
4. **Validation parity**: either run receipt validation during backfill or document webhook-only validation; add tests around duplicates/stale/backfill path.
5. **Cleanup local/temporary artifacts**: remove or document empty route dirs and test-only env; align Docker/local DB docs with actual drizzle config.
6. **Analytics phase**: after ingestion/reconciliation is trustworthy, add planned views/materialized views (`fact_receipt_lines`, `fact_receipt_payments`, `daily_store_sales`) and UI/reporting needs.

## Start Here

Open `src/lib/server/db/ingest-receipt-core.ts` first. It is the shared convergence point for webhook ingestion and backfill, defines idempotency, stale handling, and normalized write behavior.