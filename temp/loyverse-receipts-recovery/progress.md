# Loyverse Receipts Recovery Progress

Created: 2026-05-05

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done
- [!] Blocked / needs decision

## Milestone tracker

### 0. Recon and planning

- [x] Read primary docs/code files named by user.
- [x] Inspect DB schema, migrations, webhook endpoint, backfill script, receipt route.
- [x] Create temp recovery plan: `temp/loyverse-receipts-recovery/plan.md`.
- [x] Subagent codebase scouting completed; outputs saved under `temp/loyverse-receipts-recon/`.
- [x] Merge subagent findings into `current-state.md`.

### 1. Understand and clean code

- [x] Initial finding: `/tools/receipts` already reads from Postgres/Neon through `queryReceiptsFromDb`.
- [x] Initial finding: local `.env` appears to use typo `LOYV4ERSE_STORE_ID`; code expects `LOYVERSE_STORE_ID`.
- [x] Initial finding: receipt webhook endpoint may need SvelteKit CSRF bypass in `src/hooks.server.ts` like `/api/customer`.
- [ ] Decide whether local Postgres fallback remains supported. Current recommendation: keep and document as offline/local fallback.
- [x] Apply low-risk env/docs/code cleanup.
- [~] Re-run focused validation.

### 2. Documentation

- [x] Update `docs/loyverse/receipt-data-foundation-plan.md` from plan to current architecture/runbook.
- [x] Update `docs/database.md` with Vercel/Neon checklist and local Docker status.
- [x] Create `docs/loyverse/receipt-backfill-and-reconciliation.md`.
- [x] Update `.env.example` with receipt/backfill variables.

### 3. Backfill and reconciliation

- [x] Confirm local env variables without exposing secrets. `LOYVERSE_MERCHANT_ID` is missing locally, but DB contains existing merchant ids.
- [x] Implement reconciliation report mode/script: `scripts/reconcile-loyverse-receipts.ts`, package script `receipts:reconcile`.
- [x] Run small-window read-only reconciliation.
- [x] Run dry-run backfill for full requested range 2026-01-01 through 2026-05-05.
- [x] Run real backfill for confirmed missing/stale receipts.
- [x] Run post-backfill reconciliation report.

### 4. `/tools/receipts` route

- [x] Confirm route uses `getReceipts` -> `queryReceiptsFromDb` -> Postgres/Neon tables.
- [ ] Fix receipt analytics type errors flagged by `pnpm check` if they block deploy.
- [ ] Validate date filtering and cursor semantics.
- [ ] Manual smoke test route against Neon.

## Validation log

### 2026-05-05 — local env presence check

Result: DB URLs, `LOYVERSE_ACCESS_TOKEN`, and correctly spelled `LOYVERSE_STORE_ID` are set locally. `LOYVERSE_MERCHANT_ID` is missing locally. The older typo `LOYV4ERSE_STORE_ID` is not set in the current local env.

### 2026-05-05 — read-only reconciliation smoke test

Scope: top existing merchant id from DB, `2026-02-24T00:00:00Z` to `2026-02-24T23:59:59Z`, first with `--max 25`, then rerun without `--max`.

Initial max-limited report files:

- `temp/loyverse-receipts-recovery/reconciliation-2026-05-05T04-54-07-558Z.md`
- `temp/loyverse-receipts-recovery/reconciliation-2026-05-05T04-54-07-558Z.json`

Max-limited summary: 25 Loyverse receipts fetched, 28 Neon rows in scope, 0 missing, 0 stale, 0 mismatches, 3 extra in Neon. The extras were a max-limit artifact.

Authoritative same-day report files:

- `temp/loyverse-receipts-recovery/reconciliation-2026-05-05T04-55-00-323Z.md`
- `temp/loyverse-receipts-recovery/reconciliation-2026-05-05T04-55-00-323Z.json`

Authoritative summary: 28 Loyverse receipts fetched, 28 Neon rows in scope, 0 missing, 0 stale, 0 mismatches, 0 extra.

### 2026-05-05 — full requested reconciliation, 2026-01-01 through 2026-05-05

Scope: top existing merchant id from DB, `2026-01-01T00:00:00Z` to `2026-05-05T23:59:59Z`, no max, JSON report.

Report files:

- `temp/loyverse-receipts-recovery/reconciliation-2026-05-05T05-20-34-101Z.md`
- `temp/loyverse-receipts-recovery/reconciliation-2026-05-05T05-20-34-101Z.json`

Summary: 4,242 Loyverse receipts, 904 Neon receipts, 3,338 missing in Neon, 0 stale, 0 mismatches, 0 extra.

### 2026-05-05 — full requested backfill dry-run, 2026-01-01 through 2026-05-05

Command used same merchant/date scope with `--dry-run`.

Result: fetched 4,242, processed/dry-run eligible 4,242, duplicate 0, stale 0, skipped 0, failed 0.

No DB writes were performed by this dry-run.

### 2026-05-05 — real backfill, 2026-01-01 through 2026-05-05

Ran real backfill for merchant `8b53e5cb-f55c-4495-bcee-eb97bece308e`. The foreground attempt timed out after importing some receipts; because ingestion is idempotent, resumed safely. Later background run completed with 2 transient failures. Deleted only unprocessed synthetic `receipt.backfill.import` rows for the failed receipt numbers and imported those exact receipt numbers individually.

Final DB status:

- Main merchant receipts: 4,242
- Backfill events processed: 4,242
- Unprocessed events: 0
- Child rows populated:
  - `receipt_line_items`: 17,043
  - `receipt_line_modifiers`: 5,521
  - `receipt_discounts`: 285
  - `receipt_line_discounts`: 878
  - `receipt_taxes`: 1
  - `receipt_line_taxes`: 1
  - `receipt_payments`: 4,259

### 2026-05-05 — final post-backfill reconciliation, 2026-01-01 through 2026-05-05

Report files:

- `temp/loyverse-receipts-recovery/reconciliation-2026-05-05T16-44-08-624Z.md`
- `temp/loyverse-receipts-recovery/reconciliation-2026-05-05T16-44-08-624Z.json`

Summary: 4,242 Loyverse receipts, 4,242 Neon receipts, 0 missing, 0 stale, 0 mismatches, 0 extra.

### 2026-05-05 — `pnpm receipts:reconcile -- --help`

Result: passed. The new reconciliation CLI starts and prints usage.

### 2026-05-05 — targeted TypeScript parse check for reconciliation script

Command: `pnpm exec tsc --noEmit --skipLibCheck --module ESNext --moduleResolution Bundler --target ES2022 --types node scripts/reconcile-loyverse-receipts.ts`

Result: passed.

### 2026-05-05 — `pnpm check`

Result: failed repo-wide with 79 errors / 29 warnings.

Receipt-relevant failures:

- `$env/static/private` has no exported `LOYVERSE_STORE_ID` because local env appears to define typo `LOYV4ERSE_STORE_ID`.
- `src/lib/components/receipts/ReceiptsAnalytics.svelte` label formatter returns `number | ''` but chart formatter expects string.
- `ReceiptsAnalytics.svelte` uses unsupported `position` property in label config.

Many failures are unrelated pre-existing/generated Notion or other feature errors; do not treat repo-wide `pnpm check` as a clean baseline until those are addressed separately.

## Recon artifacts

- Recovery plan: `temp/loyverse-receipts-recovery/plan.md`
- Current state summary: `temp/loyverse-receipts-recovery/current-state.md`
- Subagent codebase map: `temp/loyverse-receipts-recon/codebase-map.md`
- Subagent route map: `temp/loyverse-receipts-recon/receipts-route-map.md`

## Notes

- Do not print secrets from `.env` or Vercel.
- User worktree already had unrelated modifications before this plan. Avoid touching unrelated files.
