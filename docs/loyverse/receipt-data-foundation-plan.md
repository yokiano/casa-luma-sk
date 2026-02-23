# Loyverse Receipt Data Foundation Plan

This plan defines a production-ready data foundation for ingesting Loyverse receipt webhooks with type safety, reproducibility, and analytics readiness.

## Goals

- Keep every webhook payload for audit, replay, and backfills.
- Normalize key entities for search, joins, and reporting.
- Enforce idempotent processing and safe retries.
- Use code-first schema and migrations in TypeScript.
- Keep local and cloud environments aligned.

## Stack Decision

- Database: PostgreSQL (local now, managed cloud later).
- Schema and migrations: Drizzle ORM + drizzle-kit.
- Runtime driver: `postgres` (`postgres.js`).
- Validation: `valibot` for webhook payload validation.

Why this stack:

- Strong transactional guarantees for webhook processing.
- Easy normalization of nested receipt payloads.
- Type-safe queries and reproducible migration files.
- Smooth path from local Docker to Neon/Supabase/RDS.

## High-Level Architecture

1. Loyverse webhook -> SvelteKit endpoint (`src/routes/api/webhooks/receipt/+server.ts`).
2. Validate + deduplicate event.
3. Insert raw event (`webhook_events`) as append-only record.
4. Upsert receipt header and replace child rows in one transaction.
5. Return `2xx` quickly.

## Data Model (Hybrid)

Keep both raw and normalized data:

- `webhook_events`: raw JSONB payload, dedupe key, processing metadata.
- `receipts`: one row per receipt.
- `receipt_line_items`: one row per line item.
- `receipt_line_modifiers`: one row per line modifier.
- `receipt_discounts`: receipt-level discounts.
- `receipt_line_discounts`: line-level discounts.
- `receipt_taxes`: receipt-level taxes.
- `receipt_line_taxes`: line-level taxes.
- `receipt_payments`: payments per receipt (`payment_details` as JSONB).

Design notes:

- Natural business key: `(merchant_id, receipt_number)`.
- Event-order guard: only apply updates if incoming event timestamp is newer.
- Keep monetary columns numeric with fixed precision.

## Idempotency and Safety

- Build deterministic `dedupe_key` from stable event fields.
- Unique index on `webhook_events.dedupe_key`.
- Processing transaction pattern:
  1. Insert event row (`ON CONFLICT DO NOTHING`).
  2. If conflict, acknowledge and stop.
  3. Upsert `receipts` header.
  4. Delete and reinsert child rows for that receipt.
  5. Mark event processed.
- Verify webhook signature/secret when available.
- Always acknowledge quickly; avoid long synchronous processing.

## Environment Variables

Add to local `.env` (and `.env.example` placeholders):

- `DATABASE_URL=postgres://app:app@localhost:5432/casa_luma`
- `LOYVERSE_WEBHOOK_SECRET=` (or tokenized path strategy)

## Command Runbook

### A) WSL / Project Terminal

Install DB tooling:

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

Verify:

```bash
pnpm list --depth 0
```

Expected next scripts in `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### B) Docker Host Side (Docker Desktop)

If Docker is not available in WSL, enable WSL integration in Docker Desktop first.

Create and run local PostgreSQL:

```bash
docker volume create casa_luma_pgdata
docker run --name casa-luma-postgres \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=app \
  -e POSTGRES_DB=casa_luma \
  -p 5432:5432 \
  -v casa_luma_pgdata:/var/lib/postgresql/data \
  -d postgres:16
```

Sanity checks:

```bash
docker ps
docker logs casa-luma-postgres
docker exec -it casa-luma-postgres psql -U app -d casa_luma -c "select version();"
```

## Repository Structure (Target)

```text
src/lib/server/db/
  client.ts
  schema/
    webhook-events.ts
    receipts.ts
    receipt-line-items.ts
    receipt-modifiers.ts
    receipt-discounts.ts
    receipt-taxes.ts
    receipt-payments.ts
drizzle.config.ts
drizzle/
```

## Migration Workflow

1. Edit schema files in `src/lib/server/db/schema/*`.
2. Generate migration: `pnpm db:generate`.
3. Apply migration: `pnpm db:migrate`.
4. Commit schema + migration files together.

## Analytics Readiness (Phase 2)

After ingestion is stable, add analytics views/materialized views:

- `fact_receipt_lines`
- `fact_receipt_payments`
- `daily_store_sales`

Initial indexes to prioritize:

- `receipts(merchant_id, receipt_number)` unique.
- `webhook_events(dedupe_key)` unique.
- `receipts(receipt_date)`.
- `receipt_line_items(item_id)`.
- `receipt_payments(type)`.

## Cloud Migration Path

- Keep schema/migrations identical across environments.
- Move `DATABASE_URL` to managed Postgres when ready.
- Recommended easy options: Neon or Supabase.
- Advanced ops option: AWS RDS.

## Immediate Next Implementation Steps

1. Install Drizzle + Postgres packages.
2. Add `drizzle.config.ts` and DB scripts in `package.json`.
3. Define schema files and create first migration.
4. Implement transactional ingestion in the webhook route.
5. Add basic reconciliation query (events received vs processed).
