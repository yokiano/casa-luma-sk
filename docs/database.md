# Database

## Current Setup

- **Provider**: [Neon](https://neon.tech) (serverless Postgres, `us-east-1`)
- **Schema & migrations**: Drizzle ORM + drizzle-kit (code-first)
- **Runtime driver**: `postgres` (postgres.js) via `drizzle-orm/postgres-js`
- **Migration driver**: drizzle-kit's built-in postgres driver (same config)

The app previously ran on a local Docker Postgres container. We migrated to Neon in Feb 2025 for zero-ops hosting and Vercel-friendly serverless connections.

## Connection Strings

All connection strings live in `.env`. Neon provides two endpoints:

| Variable | Endpoint | Use case |
|---|---|---|
| `DATABASE_URL` | Pooler (`-pooler.` hostname) | App runtime queries (pgbouncer, lower latency) |
| `DATABASE_URL_UNPOOLED` | Direct (no `-pooler.`) | Migrations, schema changes, `drizzle-kit studio` |

The runtime client (`src/lib/server/db/client.ts`) uses `DATABASE_URL` with `prepare: false` (required for pgbouncer compatibility).

Migrations and drizzle-kit commands use `DATABASE_URL_UNPOOLED` (falls back through several env var names — see `drizzle.config.ts`).

## Commands

```bash
pnpm db:generate    # Generate migration files from schema changes
pnpm db:migrate     # Apply pending migrations
pnpm db:push        # Push schema directly (no migration files, dev only)
pnpm db:studio      # Open Drizzle Studio (browser-based DB viewer)
pnpm db:migrate:neon  # Migration via @neondatabase/serverless driver (alternative path)
```

## Schema Location

All schema files live under `src/lib/server/db/schema/`. The barrel export is `src/lib/server/db/schema.ts`.

After editing schema files:

1. `pnpm db:generate` — creates a new migration SQL file in `drizzle/`.
2. `pnpm db:migrate` — applies it against the database.
3. Commit both the schema change and the generated migration file together.

## Known Issues

### Node.js Happy Eyeballs timeout (WSL2 / high-latency networks)

**Symptoms**: Every DB command fails with `AggregateError [ETIMEDOUT]` on the first query (`CREATE SCHEMA IF NOT EXISTS "drizzle"` or any other). The error lists multiple IPv4 and IPv6 addresses all timing out.

**Root cause**: Node.js 20+ enables "Happy Eyeballs" (RFC 8305) by default via `autoSelectFamily`. This algorithm tries each resolved address for only **250ms** before abandoning it and moving to the next. In environments where:

- IPv6 is unreachable (WSL2 has no IPv6 connectivity)
- IPv4 TCP handshake takes >250ms (e.g. connecting from Southeast Asia to US-East-1)

...every attempt is abandoned before completing, and the entire connection fails.

**Proof**: Forcing `family: 4` (IPv4 only) connects in ~300ms. Default Happy Eyeballs times out at ~800ms having tried and abandoned all addresses.

**Fix**: The `package.json` scripts include `NODE_OPTIONS` flags that disable this:

```
NODE_OPTIONS='--no-network-family-autoselection --dns-result-order=ipv4first'
```

- `--no-network-family-autoselection` disables Happy Eyeballs, falls back to sequential address resolution with the full connect timeout.
- `--dns-result-order=ipv4first` ensures IPv4 is tried before unreachable IPv6 addresses.

These flags are applied to `dev`, `db:migrate`, `db:push`, `db:studio`, and `db:migrate:neon` scripts.

**Production impact**: None. On Vercel, the app connects to Neon within the same AWS region with sub-millisecond latency. Happy Eyeballs works fine there. The flags in `package.json` only affect local development.

**References**:

- [r1ch.net — Node v20 Happy Eyeballs bug](https://r1ch.net/blog/node-v20-aggregateeerror-etimedout-happy-eyeballs)
- [Node.js issue #54359](https://github.com/nodejs/node/issues/54359)
- [Node.js net docs — `setDefaultAutoSelectFamilyAttemptTimeout`](https://nodejs.org/api/net.html#netsetdefaultautoselectfamilyattempttimeoutvalue)

## Local Development Without Neon

If you need a fully local database (offline work, no Neon access):

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

Then set `DATABASE_URL=postgres://app:app@localhost:5432/casa_luma` in `.env` (comment out the Neon URLs).
