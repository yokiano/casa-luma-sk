# TEMP Notion cache implementation progress

> **Ephemeral implementation artifact.** Keep this file only while the Notion cache work is active. Delete it with the rest of `temp/notion-cache/` after implementation is complete, merged, and persistent docs/runbook are updated.

## Current phase
T0 — Discovery not started

## Completed
- none

## In progress
- none

## Blocked
- Open questions below must be resolved before coding past T0/G0.

## Open questions / decisions required before coding past discovery
- [ ] Default `NOTION_CACHE_ENABLED`: recommend default `false` until pilot passes, then explicit prod enable.
- [ ] Dev behavior: should dev bypass persistent cache globally, or allow opt-in testing?
- [ ] Cache table ownership: Keyv auto-created table vs explicit Drizzle migration.
- [ ] Pagination policy: cache per page, cache full aggregated reads only, or bypass paginated admin scans.

## Last verification
- Not started.

## Notes
- Work branch observed: `plan/notion-cache-neon`.
- This progress file is temporary; persistent shipped behavior belongs in `docs/notion/notion-cache-runbook.md`.
