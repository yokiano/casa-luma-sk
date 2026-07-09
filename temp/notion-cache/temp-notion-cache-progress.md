# TEMP Notion cache implementation progress

> **Ephemeral implementation artifact.** Keep this file only while the Notion cache work is active. Delete it with the rest of `temp/notion-cache/` after implementation is complete, merged, and persistent docs/runbook are updated.

## Current phase
Website-images, public menu, public workshops/events, families tool reads, and memberships/flexi-pass list reads are implemented; next session can merge-prep or add one more target (`mgmt-dashboard` mapping caches, menu print/modifiers, or another `/tools` route).

## Completed
- [x] T0 Discovery — `generic-db.ts` is copied by `notion-ts-client` only when the core destination folder is missing; `pnpm notion:generate` on 2026-06-09 exited 0 and left `src/lib/notion-sdk/core/src/generic-db.ts` hash unchanged (`68263a0c9655ec05f1e9ec0324f46f7639629fb9c17c44f3f4ffda1aa934b0a4`). Disposable generator log was cleaned after recording this result.
- [x] T0 target inventory — strongest pilots are website images, public menu, menu print/modifiers, workshops/events, careers. Disposable subagent notes were cleaned after summarizing here.
- [x] T0 baseline measurements — before-cache directional HTTP timings were recorded, then disposable timing/log files were cleaned.
- [x] T0 integration decision — use app-owned facade/wrapper integration for MVP rather than a blanket `generic-db.ts` hook. Reason: the core file is stable enough for tiny hooks, but many generated-SDK reads are write-adjacent/correctness-sensitive and raw Notion hotspots would not be covered by a core hook anyway. Reconsider an opt-in hook later only after MVP surfaces are safe.
- [x] T1 Cache foundation — added `keyv` + `@keyv/postgres`, `src/lib/server/cache/keyv.ts`, `notion-cache.ts`, `notion-cache-keys.ts`, README, env vars, fail-open cache helper, key builder, debug events, coalescing, and unit tests.
- [x] T2 Test harness/fakes — added in-memory fake stores in unit tests; real Postgres integration remains optional/deferred.
- [x] T3 Facade-only integration path — no generated SDK hook for MVP.
- [x] T4 First target integration — `src/lib/server/website-images.ts` now caches the raw active Website Images query response through `cachedNotionRead`, preserving DTO mapping and replacing module-level memory cache/coalescing with persistent-cache + helper coalescing.
- [x] Runbook draft — `docs/notion/notion-cache-runbook.md` documents shipped MVP behavior, env vars, kill switch, keys, TTLs, and integrated surfaces.
- [x] T5-menu implementation — added `src/lib/server/menu-cache.ts`, wired `src/lib/menu.remote.ts` to cached menu page aggregation and category-order retrieval, and added `src/lib/menu.remote.test.ts`.
- [x] T5-events/workshops implementation — added `src/lib/server/workshops-cache.ts`, wired `src/lib/workshops.remote.ts` for public event reads (upcoming, slug, type, date range), left admin/RSVP paths uncached, and added `src/lib/server/workshops-cache.test.ts`.
- [x] Fresh-session review/cleanup — reviewed diff, fixed cache coalescing rejection cleanup, made menu cache keys use the actual MENU data source id, and reran focused tests.
- [x] Changed-file lint/type cleanup pass — no repo lint script exists, so used targeted `tsc --noEmit` over changed TS/test files and fixed cache-change type issues. Remaining `tsc` errors were pre-existing generated Notion SDK errors in `src/lib/notion-sdk/dbs/memberships/patch.dto.ts`, which is outside this cache change and normally excluded by root `tsconfig`.
- [x] Disposable temp cleanup — removed logs, timing files, latest test output, subagent scratch output, and temporary tsconfig/test artifacts. Kept only plan/progress/handoff continuity docs under `temp/notion-cache/`.
- [x] T5-families implementation — added `src/lib/server/families-cache.ts`, migrated `src/lib/tools/families/families.server.ts` off the 5m in-memory `Map` cache to persistent read-through cache readers, and added `src/lib/server/families-cache.test.ts`.
- [x] T5-memberships-list implementation — added `src/lib/server/memberships-cache.ts`, wired `src/lib/server/memberships.ts` list reads through `createGetMembershipsDataReader()`, left create/update/delete uncached, and added `src/lib/server/memberships-cache.test.ts`.

## In progress
- [ ] Merge prep or next target selection. Recommended: `mgmt-dashboard.remote.ts` Loyverse/department mapping caches, menu print/modifiers, or `/tools` Notion read inventory.

## Blocked
- none for MVP foundation + website-images/menu/events pilots.

## Open questions / decisions required before coding past discovery
- [x] Default `NOTION_CACHE_ENABLED`: default **false**. Cache is dark-launched unless explicitly enabled; this avoids accidental stale data before pilot verification.
- [x] Dev behavior: persistent cache is **allowed only by explicit opt-in** (`NOTION_CACHE_ENABLED=true`). With unset env in dev, cache is disabled by the default-false rule; tests can still inject fake stores.
- [x] Cache table ownership: use Keyv/@keyv/postgres **auto-created table** for MVP (`public.notion_cache`) rather than Drizzle migration. Document adapter ownership/runbook; revisit explicit migration only if ops needs stricter schema ownership.
- [x] Pagination policy: cache **full aggregated read results at app-owned facades** for MVP (website images/menu/events), not individual Notion API pages. Bypass or very-short-TTL admin scans and write-adjacent reads until invalidation is designed.

## T0 ranked cache targets
1. `src/lib/server/website-images.ts` — public site-wide root-layout load, existing 5m memory cache/coalescing; lowest-risk pilot. **Integrated.**
2. `src/lib/menu.remote.ts` — public `/menu`, paginated active-menu query + schema retrieve; high user-facing impact. **Integrated.**
3. `src/routes/menu/print/+page.server.ts` / `getMenuSummaryWithModifiers()` — heavier menu path including modifiers; operational but cacheable.
4. `src/lib/workshops.remote.ts` — public events list/type/date/slug reads; cache published reads, bypass RSVP read-before-write. **Integrated.**
5. `src/lib/careers.remote.ts` — public jobs list/detail; lower traffic but simple.

## T0 notes
- Existing ad-hoc caches to replace/unify later: `website-images.ts` 5m memory cache + pending request (now replaced), `families.server.ts` 5m family summary memory cache (now replaced), `mgmt-dashboard.remote.ts` Loyverse category and Notion department mapping memory caches.
- Runtime DB env order to mirror: `DATABASE_URL`, `POSTGRES_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING` from `src/lib/server/db/client.ts`.
- Use a separate small Keyv/Postgres pool/client from Drizzle to avoid cache traffic starving app DB queries; the existing Drizzle pool is max 10 and globally cached for HMR.

## Measurements
- Baseline curl timings against existing tmux dev server (`127.0.0.1:4832`), before cache integration: `/` 76.86s then 1.46/1.63s; `/menu` 4.87/3.42/3.31s; `/workshops3` 2.04/1.11/1.12s.
- After website-images integration smoke timings against temporary tmux dev server (`127.0.0.1:5189`, `NOTION_CACHE_ENABLED=true`, `NOTION_CACHE_DEBUG=true`): `/` 29.71s then 5.03/1.92s; `/menu` 5.63/3.89/4.20s. Log shows `miss` + `stored` followed by repeated `hit` for `websiteImages.queryActive`. Note: writing timing/log files under `temp/` triggered Vite SSR reload notices, so use these as directional smoke evidence, not a clean benchmark.
- Unit-level after evidence: website-images integration test proves second call avoids the Notion database query when cache is enabled (`queryMock` called once across two reads).

## Last verification
- `pnpm test:unit --run --project server src/lib/server/memberships-cache.test.ts src/lib/server/families-cache.test.ts src/lib/menu.remote.test.ts src/lib/server/cache/notion-cache.test.ts src/lib/server/cache/notion-cache-keys.test.ts src/lib/server/website-images.test.ts src/lib/server/workshops-cache.test.ts` — 7 files / 27 tests passed on 2026-06-11.
- Prior session: `pnpm notion:generate` — exit 0; no `generic-db.ts` hash change.
- Prior session: Keyv/Postgres smoke and `public.notion_cache` table confirmation; e2e smoke for `/` and `/menu`.
