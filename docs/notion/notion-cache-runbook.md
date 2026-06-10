# Notion read cache runbook

_Last updated: 2026-06-11_

## What this cache is / is not

This is a read-through JSON cache for selected Notion reads. It stores raw Notion API responses in Postgres/Neon through Keyv + `@keyv/postgres`, then lets the existing DTO/mapping code parse the same response shapes it already handled.

It is not a Redis deployment, a full Notion sync, or a source-of-truth replacement. Notion remains authoritative.

## Planned next (not implemented)

> **Reminder when touching this feature:** the current 5-minute TTL is an MVP default, not the target steady state. Casa Luma portal traffic is low, so short TTL mostly causes cold misses without keeping data fresh after Notion UI edits.

**Target architecture:** long TTL per surface + Notion webhook invalidation.

| Piece | Intent |
| --- | --- |
| Long TTL (safety net) | 12–24h+ by surface; covers missed webhook deliveries, not primary freshness. |
| Notion webhooks (primary) | Subscribe per database (`page.content_updated`, schema events). Handler verifies signature, maps `database_id` / `page_id` → cache keys, deletes via `invalidateNotionCacheKey()`. |
| Coarse invalidation first | Any edit in Menu DB → drop all `menu.*` keys; same pattern per integrated surface. Optimize to surgical keys only if needed. |
| Write-path invalidation | Portal create/update/delete should invalidate affected list/query keys in addition to webhooks. |
| Stay uncached | RSVP duplicate checks, collision checks, and other write-adjacent reads — regardless of TTL policy. |

**Suggested implementation order:**

1. Raise TTLs by surface (interim win without webhooks).
2. Add verified webhook endpoint + idempotent handler.
3. Add database → cache-key-prefix invalidation map.
4. Wire write-path invalidation for list views after portal mutations.
5. Optional: staff “refresh from Notion” button calling existing invalidation helpers.

Primitives already exist: `invalidateNotionCacheKey()` in `src/lib/server/cache/notion-cache.ts`; families has `invalidateFamilyByIdCache()` as a single-key example.

## Quick triage: stale Notion data

1. Check whether `NOTION_CACHE_ENABLED=true` is set in the runtime environment.
2. If enabled, check the surface TTL in the integrated surfaces table below.
3. If content was edited directly in the Notion UI, expect staleness until TTL expiry unless that surface has explicit invalidation.
4. If only one page/surface is wrong, inspect that surface's cache key/TTL first.
5. Use the kill switch if stale data affects customers or operations.

## Kill switch

Set:

```env
NOTION_CACHE_ENABLED=false
```

Then restart/redeploy the app if the hosting environment requires it. With debug enabled, logs should show `outcome: 'disabled'` for cached Notion reads.

## Env vars

| Env var | Default | Safe prod value | Notes |
| --- | --- | --- | --- |
| `NOTION_CACHE_ENABLED` | `false` | `true` only after pilot verification | Global kill switch; false means fetch from Notion normally. |
| `NOTION_CACHE_DEFAULT_TTL_SECONDS` | `300` | `300` | Used when a caller does not pass an explicit TTL. |
| `NOTION_CACHE_NAMESPACE` | `casa-luma:notion:v1` | `casa-luma:notion:v1` | Bump to invalidate all old keys. |
| `NOTION_CACHE_DEBUG` | `false` | `false` | Set true temporarily for hit/miss/stored logs. |
| `NOTION_CACHE_PG_POOL_MAX` | `2` | `2` | Separate small pg pool for cache traffic. |

Runtime DB URL selection mirrors `src/lib/server/db/client.ts`: `DATABASE_URL`, `POSTGRES_URL`, `DATABASE_URL_UNPOOLED`, then `POSTGRES_URL_NON_POOLING`.

## Key format

Keys are deterministic strings:

```text
<namespace>:<operation>:<id>:<sha256-of-stable-json-params>
```

Example operation names:

- `websiteImages.queryActive`
- `menu.queryActivePages`, `menu.retrieveCategoryOrder`
- `events.queryUpcoming`, `events.queryBySlug`, `events.queryByType`, `events.queryByDateRange`
- `families.searchAggregated`, `families.byIds`, `families.byLoyverseCustomerId`, `families.queryMatches`
- `memberships.listAggregated`

Object key ordering does not affect the hash.

## TTL table

| Data category | TTL | Notes |
| --- | ---: | --- |
| Website images | 5 minutes | Matches the previous in-process cache behavior. |
| Public menu/content | 5–30 minutes | Use shorter TTL for prices/status when integrated. |
| Public events | 5–15 minutes | Do not cache RSVP read-before-write paths. |
| Semi-admin lists/searches | 30–120 seconds | Cache only UI reads; command/write decisions should re-read. |
| Write-adjacent duplicate/collision checks | no cache | Keep fresh by default. |

## Integrated surfaces

| Surface | File | Operations cached | TTL | Invalidation |
| --- | --- | --- | ---: | --- |
| Website images | `src/lib/server/website-images.ts` | Active Website Images database query raw response | 5 minutes | TTL only; bump namespace or disable cache for emergency refresh. |
| Public menu | `src/lib/server/menu-cache.ts`, consumed by `src/lib/menu.remote.ts` | Aggregated active menu pages and menu data-source/category-order metadata | 5 minutes | TTL only; bump namespace or disable cache for emergency refresh. |
| Public events/workshops | `src/lib/server/workshops-cache.ts`, consumed by `src/lib/workshops.remote.ts` | Upcoming events, event-by-slug, events-by-type, and events-by-date-range raw page lists | 5 minutes | TTL only; RSVP duplicate-check and admin `getAllEvents` remain uncached. Upcoming/type queries bucket `on_or_after` to the TTL window for stable keys. |
| Families / memberships tools | `src/lib/server/families-cache.ts`, consumed by `src/lib/tools/families/families.server.ts` | Aggregated family search, family-by-ids batch reads, Loyverse-customer lookup, and family query matches used for membership search | 5 minutes | TTL only; Loyverse sync warms the by-id cache entry when cache is enabled. Write/mutation paths remain uncached. |
| Memberships / flexi-pass list | `src/lib/server/memberships-cache.ts`, consumed by `src/lib/server/memberships.ts` | Paginated membership + flexi-pass list aggregation (search, cursor, page size) | 5 minutes | TTL only; create/update/delete and single-item reads remain uncached. |

## Observability

Cache events have this shape:

```ts
{
  source: 'notion-cache',
  outcome: 'hit' | 'miss' | 'disabled' | 'error' | 'coalesced' | 'stored',
  key: string,
  op?: string,
  ttlMs?: number,
  error?: unknown
}
```

Non-error events log only when `NOTION_CACHE_DEBUG=true`. Errors log with `[notion-cache]` and fail open.

## Fail-open behavior

If the cache client cannot be created, a cache read fails, or a cache write fails, the app logs a light cache error and fetches from Notion normally. Cache failures should not break pages.

## Manual invalidation

Preferred emergency options:

1. Set `NOTION_CACHE_ENABLED=false` and restart/redeploy.
2. Bump `NOTION_CACHE_NAMESPACE` to a new version, e.g. `casa-luma:notion:v2`.
3. If necessary, delete rows for the namespace from the Keyv-owned `public.notion_cache` table. Confirm table shape in Neon first because it is owned by `@keyv/postgres`.

## Rollback

1. Disable `NOTION_CACHE_ENABLED`.
2. Redeploy/restart if needed.
3. Optionally clear/truncate `public.notion_cache` after confirming no other Keyv users share the table.

## Known limitations

- Invalidation is TTL-only today. See **Planned next** above for long TTL + webhook invalidation.
- Direct Notion UI edits remain stale until TTL expiry (up to 5 minutes with current settings).
- Pagination is cached only at app-owned aggregate facades in the MVP; broad admin scans and write-adjacent reads are intentionally not cached yet.
- `generic-db.ts` survived `pnpm notion:generate`, but the MVP does not use a blanket SDK hook because many generated-SDK reads are correctness-sensitive or write-adjacent.
