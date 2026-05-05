# Loyverse Receipts / Neon Recovery Plan

Created: 2026-05-05
Owner: main Pi session

## Objective

Recover confidence in the Loyverse closed-receipt ingestion foundation: understand and clean the current code, document the system, reconcile/backfill missing receipts into Neon/Postgres, and ensure `/tools/receipts` reads from the Neon receipt tables.

## Current findings from initial repo inspection

- Webhook endpoint exists at `src/routes/api/webhooks/receipt/+server.ts`.
- Ingestion entrypoint exists at `src/lib/server/db/ingest-receipt-webhook.ts`, delegating to `src/lib/server/db/ingest-receipt-core.ts`.
- Normalized Drizzle schema exists in `src/lib/server/db/schema.ts` and migrations exist in `drizzle/0000_ancient_bromley.sql` and `drizzle/0001_black_avengers.sql`.
- Runtime DB client is `src/lib/server/db/client.ts` using `DATABASE_URL` / `POSTGRES_URL` first, with local fallback `postgres://app:app@localhost:5432/casa_luma`.
- Backfill script exists at `scripts/backfill-loyverse-receipts.ts` and imports Loyverse receipts into the same ingestion core with event type `receipt.backfill.import`.
- `/tools/receipts` currently calls `$lib/receipts.remote.ts` -> `queryReceiptsFromDb()` -> Neon/Postgres tables. So item 4 appears mostly done, but needs validation and likely small fixes.
- `docker-compose.yml` still defines local Postgres. This is not necessarily dead code; docs frame it as offline/local fallback.
- Local `.env` has Neon DB vars and `LOYVERSE_ACCESS_TOKEN`, but appears to have `LOYV4ERSE_STORE_ID` instead of `LOYVERSE_STORE_ID`. `pnpm check` confirms several code paths expect `LOYVERSE_STORE_ID` and fail under static env generation.
- `.env.example` is incomplete for receipt operations: missing `LOYVERSE_ACCESS_TOKEN`, `LOYVERSE_MERCHANT_ID`, `DATABASE_URL_UNPOOLED`, and possibly `LOYVERSE_STORE_ID`.
- `src/hooks.server.ts` bypasses SvelteKit CSRF only for `/api/customer`; external receipt webhooks at `/api/webhooks/receipt` may need the same Origin adjustment if blocked by SvelteKit CSRF in production.
- `pnpm check` currently fails repo-wide with many unrelated errors. Receipt-specific errors include `LOYVERSE_STORE_ID` env mismatch and `ReceiptsAnalytics.svelte` label formatter typing issues.

## Workstreams

### 1. Code understanding + cleanup

Goal: produce an accurate map of moving parts and remove/adjust only temporary or non-operational receipt-related code.

Tasks:

1. Finish code reconnaissance:
   - `src/routes/api/webhooks/receipt/+server.ts`
   - `src/lib/server/db/client.ts`
   - `src/lib/server/db/ingest-receipt-core.ts`
   - `src/lib/server/db/receipt-queries.ts`
   - `src/lib/server/db/schema.ts`
   - `src/lib/receipts.remote.ts`
   - `src/routes/tools/receipts/+page.svelte`
   - `src/hooks.server.ts`
   - `scripts/backfill-loyverse-receipts.ts`
   - `scripts/db-migrate-neon.ts`, `drizzle.config.ts`, migrations
2. Identify cleanup candidates:
   - local DB fallback in runtime client/scripts: keep if documented, or make explicit behind docs/env.
   - `docker-compose.yml`: keep as local fallback if still useful; update docs rather than delete.
   - stale docs claiming "Immediate Next Implementation Steps" not completed.
   - env mismatch `LOYV4ERSE_STORE_ID` vs `LOYVERSE_STORE_ID`.
   - `.env.example` gaps.
   - CSRF bypass gap for `/api/webhooks/receipt`.
3. Apply only low-risk operational fixes first:
   - correct env var names/docs/examples.
   - extend webhook CSRF bypass if confirmed needed.
   - fix receipt-specific type errors if they block build/deploy.
4. Validate with focused checks:
   - `pnpm check` for known receipt-related failures; note unrelated failures separately.
   - optional targeted TypeScript compile impossible if repo-wide errors remain; document baseline.

Milestone exit criteria:

- `temp/loyverse-receipts-recovery/current-state.md` accurately explains code/data flow and cleanup decisions.
- Receipt-related env/docs mismatches are fixed or explicitly tracked.
- No temporary receipt dev code remains undocumented.

### 2. Docs gaps

Goal: docs should let future-you operate the system without reconstructing it from code.

Docs to update/create:

1. `docs/loyverse/receipt-data-foundation-plan.md`
   - Convert from old implementation plan to current architecture/runbook.
   - Mark completed pieces and remaining gaps.
   - Include exact endpoint, schema tables, ingestion path, idempotency behavior.
2. `docs/database.md`
   - Keep Neon as primary.
   - Clarify Docker Postgres is local/offline only.
   - Add runtime vs migration env variables and Vercel env checklist.
3. New proposed doc: `docs/loyverse/receipt-backfill-and-reconciliation.md`
   - How to run dry-run and real backfill.
   - How to fetch all Loyverse receipts and compare with Neon receipts.
   - Safety rules: date windows, dry-run first, concurrency, logging, no destructive changes.
4. `.env.example`
   - Add `LOYVERSE_ACCESS_TOKEN`, `LOYVERSE_MERCHANT_ID`, `LOYVERSE_STORE_ID`, `DATABASE_URL_UNPOOLED`, webhook/Telegram vars.
5. Optional: add a short `docs/loyverse/receipt-webhook-vercel-checklist.md` section or include in the backfill doc:
   - Vercel env vars.
   - Loyverse webhook URL and `x-webhook-token` secret.
   - quick health/test request.

Milestone exit criteria:

- Docs describe actual code, not just target architecture.
- A clean operator can set env, migrate DB, verify webhook, and backfill from docs.

### 3. Backfill + reconciliation

Goal: compare Loyverse API and Neon receipt table, identify missing/stale rows, then backfill safely.

Current script status:

- Existing script pages Loyverse `/receipts?limit=250` and ingests each receipt through the same idempotent core.
- It supports `--date-from`, `--date-to`, `--store-id`, `--receipt-number`, `--max`, `--dry-run`, `--concurrency`.
- It does not currently produce a full reconciliation report against Neon before importing.

Proposed implementation:

1. Add a temporary or reusable reconciliation mode/script:
   - Fetch Loyverse receipts for a date window into a `Map<string, LoyverseReceipt>` keyed by `receipt_number` or `${merchantId}:${receipt_number}`.
   - Fetch Neon `receipts` for the same date window into a `Map<string, { receiptKey, receiptNumber, updatedFromEventAt, totalMoney, receiptDate }>`.
   - Compare:
     - missing in Neon
     - present in Neon but stale (`Loyverse.updated_at || created_at` newer than `updated_from_event_at`)
     - amount/date mismatches
     - extra in Neon (if any) for the same window
   - Write report to `temp/loyverse-receipts-recovery/reconciliation-YYYY-MM-DD.md` or `.json`.
2. Run safe sequence:
   - Confirm env vars locally without printing secrets.
   - Run DB migration/status check against Neon.
   - Reconcile last 7/30 days first.
   - Run `pnpm receipts:backfill -- --date-from ... --date-to ... --dry-run`.
   - Run real backfill for missing window.
   - Reconcile same window again.
   - Expand to full historical range if needed.
3. Consider whether the existing dedupe key is ideal for backfill:
   - Backfill event type `receipt.backfill.import` makes a different dedupe key than real webhook events, but receipt upsert idempotency keeps final receipt state stable.
   - Existing stale guard prevents older events replacing newer receipt state.

Milestone exit criteria:

- A reconciliation report shows missing/stale counts before import.
- Backfill completes with counters and no fatal DB/API errors.
- A post-backfill report shows Neon up to date for the selected date range.

### 4. `/tools/receipts` route uses Neon receipts

Goal: verify and harden the route.

Current state:

- `/tools/receipts/+page.svelte` calls `getReceipts` from `src/lib/receipts.remote.ts`.
- `getReceipts` calls `queryReceiptsFromDb` from `src/lib/server/db/receipt-queries.ts`.
- `queryReceiptsFromDb` reads normalized Postgres receipt tables and reconstructs `LoyverseReceipt` shape.

Tasks:

1. Confirm route runs under manager auth and production env.
2. Fix receipt analytics type errors found by `pnpm check`:
   - `ReceiptsAnalytics.svelte` formatter should return strings, not numbers.
   - remove/adjust unsupported `position` label prop if needed.
3. Validate pagination/filtering:
   - Date filter currently uses `receipts.createdAt`; confirm this matches desired business date (`created_at` vs `receipt_date`).
   - Cursor sorts by `updatedFromEventAt`; UI sorts by `created_at` locally. Decide if acceptable.
4. Add visible empty/error states if Neon unavailable (currently errors bubble to UI message).

Milestone exit criteria:

- Route is confirmed to use Neon/Postgres.
- Known receipt UI type issues are fixed or documented.
- Manual smoke test can load receipts from Neon.

## Immediate sequence I recommend

1. Let the scouting subagents finish and merge their findings into this temp plan.
2. Create `current-state.md` with exact architecture and risks.
3. Do the low-risk cleanup/doc updates first (`.env.example`, docs, possibly hooks CSRF bypass and receipt analytics TS errors).
4. Add reconciliation reporting to the backfill tooling.
5. Run dry-run reconciliation/backfill against a small date range.
6. Run real backfill only after the report looks sane.

## Open questions before real backfill

- What date range should be considered authoritative for "all existing receipts"? Since business likely started before webhook setup, use earliest Loyverse receipt if unknown.
- Is `LOYVERSE_MERCHANT_ID` available/known? The script requires it; current local env snapshot did not show it.
- Is Loyverse webhook configured to call `/api/webhooks/receipt` on the current Vercel deployment, and is `x-webhook-token` configured if `LOYVERSE_WEBHOOK_SECRET` is set?
- Are production Vercel env vars populated: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` or equivalent, `LOYVERSE_WEBHOOK_SECRET`, incident Telegram vars, and any Loyverse env vars needed for tools?
