# Database

## Current setup

- **Primary provider**: [Neon](https://neon.tech) serverless Postgres (`us-east-1`).
- **Schema & migrations**: Drizzle ORM + drizzle-kit.
- **Runtime driver**: `postgres` via `drizzle-orm/postgres-js`.
- **Local fallback**: Docker Postgres is supported for offline/local work only.

The app previously ran on local Docker Postgres and migrated to Neon in Feb 2025.

## Connection strings

| Variable | Use case |
|---|---|
| `DATABASE_URL` | Primary runtime URL. In production this should be Neon pooled/pgbouncer. |
| `POSTGRES_URL` | Runtime alias/fallback. |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL for migrations, schema changes, and scripts that need a non-pooler endpoint. |
| `POSTGRES_URL_NON_POOLING` | Direct URL alias/fallback. |

Runtime client: `src/lib/server/db/client.ts`.

Runtime fallback order:

1. `DATABASE_URL`
2. `POSTGRES_URL`
3. `DATABASE_URL_UNPOOLED`
4. `POSTGRES_URL_NON_POOLING`
5. `postgres://app:app@localhost:5432/casa_luma`

The runtime client sets `prepare: false` for pgbouncer compatibility.

Migration config: `drizzle.config.ts`. It prefers unpooled/direct URLs.

## Schema location

Current schema lives in a single TypeScript file:

```text
src/lib/server/db/schema.ts
```

Migration SQL files live in:

```text
drizzle/
```

Workflow:

1. Edit `src/lib/server/db/schema.ts`.
2. Run `pnpm db:generate`.
3. Run `pnpm db:migrate`.
4. Commit schema and migration files together.

## Commands

```bash
pnpm db:generate       # Generate migration files from schema changes
pnpm db:migrate        # Apply pending migrations with drizzle-kit
pnpm db:push           # Push schema directly; dev only
pnpm db:studio         # Open Drizzle Studio
pnpm db:migrate:neon   # Alternative migration path via @neondatabase/serverless
```

Receipt-specific tools:

```bash
pnpm receipts:reconcile -- --date-from <iso> --date-to <iso> --json
pnpm receipts:backfill -- --date-from <iso> --date-to <iso> --dry-run
pnpm receipts:backfill -- --date-from <iso> --date-to <iso>
```

## Receipt analytics optimization notes

The receipts tool analytics tab should use database-side aggregation, not full receipt hydration.

Current optimized path:

```text
src/routes/tools/receipts/+page.svelte
  -> getReceiptAnalytics()
  -> src/lib/receipts.remote.ts
  -> queryReceiptAnalyticsFromDb()
  -> src/lib/server/db/receipt-analytics.ts
  -> Neon/Postgres aggregate queries
```

Why: loading long date ranges as fully shaped receipts pulls receipts plus line items, modifiers, discounts, taxes, and payments into the browser, then performs many repeated client-side passes for each metric/chart. For multi-month ranges this is slow and can block rendering. Analytics-style screens should push `sum`, `count`, `group by`, top-N, and trend calculations into Postgres and return only compact chart data.

Implementation added in this optimization session:

- `getReceiptAnalytics` remote function for summary/chart data.
- `queryReceiptAnalyticsFromDb` for Neon-side aggregation.
- Shared analytics DTO types in `src/lib/receipts/analytics.ts`.
- `ReceiptsAnalytics.svelte` now accepts precomputed `analytics` data, with a receipt-array fallback for compatibility.
- The analytics tab shows a live elapsed-time indicator while Neon calculates and a final “calculated in …” timing.
- The tools tab still needs detailed receipt payloads, so it keeps paginated loading but now shows receipt/page progress.

Indexes added to support receipt analytics and pagination:

```sql
CREATE INDEX IF NOT EXISTS "receipts_created_at_idx" ON "receipts" ("created_at");
CREATE INDEX IF NOT EXISTS "receipts_store_created_at_idx" ON "receipts" ("store_id", "created_at");
CREATE INDEX IF NOT EXISTS "receipts_updated_receipt_key_idx" ON "receipts" ("updated_from_event_at", "receipt_key");
```

Migration file:

```text
drizzle/0002_receipt_analytics_indexes.sql
```

Apply to Neon with:

```bash
pnpm db:migrate:neon
```

Future analytics work should prefer adding fields to `ReceiptAnalytics` and SQL aggregates in `receipt-analytics.ts` instead of expanding the analytics tab to fetch all receipt details.

## Vercel / production checklist

Set these in Vercel before relying on receipt ingestion:

- `DATABASE_URL` — Neon pooled runtime URL.
- `DATABASE_URL_UNPOOLED` — Neon direct URL for migrations/tools.
- `LOYVERSE_WEBHOOK_SECRET` — optional but recommended; must match Loyverse `x-webhook-token`.
- `LOYVERSE_ACCESS_TOKEN` — needed only where backfill/reconciliation scripts are run.
- `LOYVERSE_MERCHANT_ID` — needed for backfill/reconciliation unless passed on CLI.
- Telegram alert vars if incident notifications should be enabled.

Do not use the typo `LOYV4ERSE_STORE_ID`; code and docs expect `LOYVERSE_STORE_ID`.

## Local development without Neon

Use local Postgres only when you explicitly want offline/local DB work:

```bash
docker compose up -d postgres
```

or manually:

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

Then set:

```bash
DATABASE_URL=postgres://app:app@localhost:5432/casa_luma
```

Note: `drizzle.config.ts` currently sets SSL for migrations, which is appropriate for Neon and may need adjustment before running migrations against local Docker Postgres.

## Known issue: Node.js Happy Eyeballs timeout

Local DB commands include:

```bash
NODE_OPTIONS='--no-network-family-autoselection --dns-result-order=ipv4first'
```

This avoids WSL2/high-latency connection failures where Node.js abandons IPv4/IPv6 connection attempts too quickly. Production on Vercel is not expected to need this workaround.
