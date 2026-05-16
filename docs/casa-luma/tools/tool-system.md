# Casa Luma internal tools system

Internal staff/manager tools live under `src/routes/tools/*`.

## Navigation and access

- `/tools` routes are protected in `src/hooks.server.ts` by the `casa_luma_tools_auth` cookie.
- The shared tools layout is `src/routes/tools/+layout.svelte`.
- Add a new visible tool by adding an entry to `allTabs`:
  - Staff tools: omit `managerOnly`.
  - Manager tools: add `managerOnly: true` and also add the route prefix to `managerOnlyRoutes` in `src/hooks.server.ts`.
- Do not rely on hiding a tab for security; server-side manager route protection must match the layout.

## Typical tool structure

A simple SvelteKit tool usually uses:

```txt
src/routes/tools/my-tool/+page.server.ts  # server-side load, Notion/local DB/API calls
src/routes/tools/my-tool/+page.svelte     # staff UI
```

For client-triggered actions after page load, use the project’s remote-function pattern (`$app/server` `query`/`command`) and keep Notion/API secrets server-side.

## Notion-backed tools

Generated Notion database clients live in `src/lib/notion-sdk/dbs/*`. Prefer these over raw Notion property objects when the database already exists.

Common pattern:

1. Instantiate the generated DB with `NOTION_API_KEY`.
2. Prefer remote `query` functions for Notion reads that are not needed for the first paint, so slow databases do not block page mounting.
3. Query list data with only the fields needed for the index/list view.
4. Expand relation-heavy detail data only after the user selects a record.
5. Use `getPageBlocks(pageId)` when the actual Notion page body is the source of rich content.
6. Keep docs in `docs/casa-luma/tools/` updated when behavior or business logic changes.

## Checks

Do not run `pnpm check`, `svelte check`, or `pnpm build` in this project; they produce excessive output for agent sessions.
