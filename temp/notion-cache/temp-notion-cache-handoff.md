# TEMP Notion cache implementation handoff

> **Ephemeral implementation artifact.** Update this at the end of each implementation session. Delete it with `temp/notion-cache/` after implementation is complete, merged, and persistent docs/runbook are updated.

## Done this session
- Completed **memberships list caching** (`getMembershipsData`):
  - Added `src/lib/server/memberships-cache.ts` with `createGetMembershipsDataReader()` wrapping the full paginated membership + flexi-pass aggregation.
  - Cache key: normalized `search`, `cursor`, `pageSize`; TTL 5 minutes; caches `{ items, nextCursor, hasMore }`.
  - Refactored `src/lib/server/memberships.ts` to delegate list reads to the cache reader; create/update/delete and `getFamilyDetailsData` remain uncached.
  - Added `src/lib/server/memberships-cache.test.ts` with cache-hit and kill-switch coverage.
- Updated `docs/notion/notion-cache-runbook.md` integrated surfaces and key examples.
- Updated `temp/notion-cache/temp-notion-cache-progress.md` and this handoff.

## Previous sessions had already done
- Completed T0 Discovery and resolved open questions.
- Completed cache foundation (`src/lib/server/cache/*`) with Keyv/Postgres, fail-open read helper, deterministic keys, env kill switch, debug events, coalescing, and tests.
- Integrated website-images pilot in `src/lib/server/website-images.ts` and added `src/lib/server/website-images.test.ts`.
- Implemented T5-menu and runbook updates for website-images/menu.
- Fresh-session review/cleanup for menu cache keys, coalescing rejection cleanup, e2e smoke for `/` and `/menu`, Neon table confirmation.
- Added packageManager pin `pnpm@10.30.1` because global pnpm v11 initially refused this repo's existing workspace config/store.
- Completed **T5-families** with `src/lib/server/families-cache.ts`, migrated `families.server.ts` off in-memory cache, and added tests.

## Verified
- `pnpm test:unit --run --project server src/lib/server/memberships-cache.test.ts src/lib/server/families-cache.test.ts src/lib/menu.remote.test.ts src/lib/server/cache/notion-cache.test.ts src/lib/server/cache/notion-cache-keys.test.ts src/lib/server/website-images.test.ts src/lib/server/workshops-cache.test.ts` — 7 files / 27 tests passed on 2026-06-11.
- Prior session verification still valid unless contradicted above:
  - `pnpm notion:generate` — exit 0, no `generic-db.ts` hash change.
  - Keyv/Postgres smoke and `public.notion_cache` table confirmation.
  - E2e smoke for `/` and `/menu` with cache miss/stored/hit behavior.

## Not done / deferred
- No careers integration (still deferred).
- No menu print/modifiers integration.
- No `/tools` Notion hotspot inventory committed.
- No explicit invalidation beyond TTL/namespace/kill-switch and single-key helper for memberships list (same as other surfaces).
- No `mgmt-dashboard.remote.ts` Loyverse/department mapping caches.
- No workshops/events or `/tools/memberships` e2e HTTP smoke in this session.
- No `pnpm check`, `svelte check`, or `pnpm build` run (project rule forbids them).
- Disposable temp logs/test outputs should stay cleaned; keep the three continuity docs until implementation/merge/final docs are complete.

## Next session should
1. Read this handoff, progress, and plan.
2. Review the current diff, especially:
   - `src/lib/server/memberships-cache.ts`
   - `src/lib/server/memberships.ts`
   - `src/lib/server/memberships-cache.test.ts`
   - `docs/notion/notion-cache-runbook.md`
3. Re-run focused tests from Verified.
4. Either pause for review/merge prep, or continue with exactly one more target: `mgmt-dashboard.remote.ts` mapping caches, menu print/modifiers, or a specific `/tools` sub-route.
5. Optional: e2e smoke for `/tools/memberships` with `NOTION_CACHE_ENABLED=true` and `NOTION_CACHE_DEBUG=true`.

## Risks noticed
- Direct Notion UI edits to memberships/flexi-pass list data can be stale up to 5 minutes while cache is enabled; create/update/delete bypass cache but list views won't reflect other edits until TTL.
- Direct Notion UI edits to families can be stale up to 5 minutes while cache is enabled; Loyverse sync warms only the by-id cache key.
- Direct Notion UI edits to events can be stale up to 5 minutes while cache is enabled.
- Upcoming/type event queries use TTL-bucketed `on_or_after` in cache keys; within a bucket the live Notion filter may drift slightly from wall-clock `now`, but TTL bounds staleness.
- RSVP duplicate-check and admin `getAllEvents` remain uncached by design.
- Blanket generated-SDK hook would over-cache correctness-sensitive reads; keep integrations explicit until invalidation matures.
- `.pi/` is untracked pre-existing local session data; do not add it.

## Files touched
- `src/lib/server/memberships-cache.ts` (new)
- `src/lib/server/memberships-cache.test.ts` (new)
- `src/lib/server/memberships.ts`
- `docs/notion/notion-cache-runbook.md`
- `temp/notion-cache/*`
