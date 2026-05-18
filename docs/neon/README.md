# Neon database

This project uses Neon/Postgres through Drizzle. The live database layer is defined in code, with migrations kept in `drizzle/`.

## Runtime connection

Source: `src/lib/server/db/client.ts`

- The runtime database client is `db` from `src/lib/server/db/client.ts`.
- It uses `drizzle-orm/postgres-js` with the `postgres` driver, not `drizzle-orm/neon-http`.
- The exported `db` is a lazy `Proxy`; the Postgres connection is only created on first use.
- Connection pool settings currently are:
  - `max: 10`
  - `idle_timeout: 20`
  - `connect_timeout: 10`
  - `prepare: false`

Environment variables are checked in this order:

1. `DATABASE_URL`
2. `POSTGRES_URL`
3. `DATABASE_URL_UNPOOLED`
4. `POSTGRES_URL_NON_POOLING`

`getDatabaseEnvKey()` returns the selected key. The selected value must start with `postgres://` or `postgresql://`; otherwise startup/query code throws.

## Drizzle migrations

Sources: `drizzle.config.ts`, `drizzle/`

Scripts from `package.json`:

- `pnpm db:generate` — generate migrations from `src/lib/server/db/schema.ts`.
- `pnpm db:migrate` — run Drizzle migrations with the normal config.
- `pnpm db:migrate:neon` — run the Neon migration helper in `scripts/db-migrate-neon.ts`.
- `pnpm db:push` — push schema directly.
- `pnpm db:studio` — open Drizzle Studio.

`drizzle.config.ts` loads `.env`, then `.env.local` with override. For migrations it prefers unpooled connection strings first:

1. `DATABASE_URL_UNPOOLED`
2. `POSTGRES_URL_NON_POOLING`
3. `DATABASE_URL`
4. `POSTGRES_URL`

If no URL exists and `CI` is not set, the config falls back to local development Postgres at `postgres://app:app@localhost:5432/casa_luma`.

## Schema ownership

Source of truth: `src/lib/server/db/schema.ts`

Current database areas:

- Receipt webhook/event ingestion:
  - `webhook_events`
  - `receipts`
  - receipt child tables: line items, modifiers, discounts, taxes, payments
- Incident reporting / Telegram notification audit:
  - `reported_errors`

Generated migrations currently include:

- `drizzle/0000_ancient_bromley.sql` — receipt ingestion tables and indexes.
- `drizzle/0001_black_avengers.sql` — `reported_errors` table and indexes.
- `drizzle/0002_receipt_analytics_indexes.sql` — extra analytics/query indexes on receipts.

## Local reference

The older Neon setup notes are in `temp/neon-database-related-info.md`. That file lists the Vercel/Neon environment variables available locally, but the implementation has since standardized on `postgres` + `drizzle-orm/postgres-js` in `src/lib/server/db/client.ts`.
