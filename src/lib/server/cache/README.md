# Server cache helpers

App-owned cache utilities live here so generated Notion SDK files stay thin or untouched.

- `keyv.ts` — Keyv/Postgres client factory for the persistent Notion read cache.
- `notion-cache.ts` — fail-open `cachedNotionRead<T>()`, kill switch, debug events, and invalidation helper.
- `notion-cache-keys.ts` — stable key builder and hashing helpers.

Persistent ops documentation: `docs/notion/notion-cache-runbook.md`.

**Planned next (not implemented):** long TTL per surface + Notion webhook invalidation. See the runbook **Planned next** section before changing TTLs or adding invalidation.
