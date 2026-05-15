# Code Context

## Files Retrieved
1. `package.json` (lines 1-86) - framework, scripts, Svelte/Kit/Drizzle/Postgres versions.
2. `svelte.config.js` (lines 1-33) - SvelteKit adapter and experimental remote functions enabled.
3. `src/hooks.server.ts` (lines 1-56) - existing global request hook and current `/tools` auth gate.
4. `src/app.d.ts` (lines 1-15) - `App.Locals` shape used by auth.
5. `src/routes/tools/+layout.server.ts` (lines 1-8) - passes auth role to tools UI.
6. `src/routes/tools/+layout.svelte` (lines 1-120) - tools shell/nav and role-based tab visibility.
7. `src/routes/tools/login/+page.server.ts` (lines 1-31) - existing password login action/cookie creation.
8. `src/routes/tools/logout/+server.ts` (lines 1-12) - logout cookie deletion.
9. `src/lib/server/db/client.ts` (lines 1-59) - runtime Drizzle/Postgres client and env precedence.
10. `drizzle.config.ts` (lines 1-31) - migration config and Neon/local URL handling.
11. `.env.example` (lines 1-35) - documented env var pattern; auth vars are not documented here.
12. `src/lib/server/db/schema.ts` (lines 1-220) - Drizzle schema exists, mostly receipts/webhook/reporting tables.
13. `src/lib/receipts.remote.ts` (lines 1-32), `src/lib/salary.remote.ts` (lines 1-60), `src/lib/tools/menu-assistant.remote.ts` (lines 1-44), `src/routes/tools/graphics/graphics.remote.ts` (lines 1-31) - examples of SvelteKit remote functions used by tools.

## Key Code

Framework/deps:
```json
// package.json lines 30-31, 51, 60, 70, 76, 79
"@sveltejs/adapter-auto": "^6.0.0",
"@sveltejs/kit": "^2.22.0",
"svelte": "^5.0.0",
"vite": "^7.0.4",
"@neondatabase/serverless": "^1.0.2",
"drizzle-orm": "^0.45.1",
"postgres": "^3.4.8"
```
`svelte.config.js` enables `kit.experimental.remoteFunctions: true` (lines 16-23) and Svelte async compiler option (lines 26-30).

Existing `/tools` auth is already present in `src/hooks.server.ts`:
```ts
// lines 19-49
if (event.url.pathname.startsWith('/tools')) {
  const isBypass = MANAGER_PASSWORD_BYPASS === '1';
  if (event.url.pathname === '/tools/login') return resolve(event);
  let authCookie = event.cookies.get('casa_luma_tools_auth');
  if (isBypass && !authCookie) authCookie = 'manager';
  if (!authCookie) throw redirect(303, '/tools/login');
  const isManager = authCookie === 'manager';
  event.locals.role = authCookie;
  const managerOnlyRoutes = ['/tools/salary-payment'];
  if (managerOnlyRoutes.some(route => event.url.pathname.startsWith(route)) && !isManager) {
    throw redirect(303, '/tools');
  }
}
```

Login action:
```ts
// src/routes/tools/login/+page.server.ts lines 1-23
import { AUTH_PASSWORD, MANAGER_PASSWORD } from '$env/static/private';
// password === MANAGER_PASSWORD => role 'manager'; password === AUTH_PASSWORD => role 'staff'
cookies.set('casa_luma_tools_auth', role, {
  path: '/', httpOnly: true, sameSite: 'strict', secure: true, maxAge: 60 * 60 * 24 * 7
});
```

Locals/UI:
```ts
// src/app.d.ts lines 6-8
interface Locals { role: string | undefined; }
// src/routes/tools/+layout.server.ts lines 3-7 returns { role }
```
`src/routes/tools/+layout.svelte` has staff tabs (lines 11-16), manager tabs (lines 18-22), filters manager tabs by `role === 'manager'` (lines 25-27), and hides nav/logout on `/tools/login` (lines 63-73, 95-116).

Database:
```ts
// src/lib/server/db/client.ts lines 5-18
const CONNECTION_ENV_ORDER = ['DATABASE_URL','POSTGRES_URL','DATABASE_URL_UNPOOLED','POSTGRES_URL_NON_POOLING'];
// uses postgres(getConnectionString(), { max: 10, idle_timeout: 20, connect_timeout: 10, prepare: false })
// exports lazy Proxy db and type Database
```
`drizzle.config.ts` loads `.env` then `.env.local` (lines 5-6), prefers unpooled URLs first for migrations (lines 8-15), schema `./src/lib/server/db/schema.ts`, output `./drizzle`, dialect `postgresql`, `ssl: true` (lines 23-30). Migrations present: `drizzle/0000_ancient_bromley.sql`, `0001_black_avengers.sql`, `0002_receipt_analytics_indexes.sql`, `drizzle/meta/`.

Env patterns:
- `$env/static/private` is commonly used for fixed build-time secrets (`NOTION_API_KEY`, `LOYVERSE_ACCESS_TOKEN`, login passwords).
- `$env/dynamic/private` is used where runtime env introspection is needed, e.g. `src/routes/api/db-health/+server.ts` and webhooks.
- `.env.example` documents DB/Notion/Loyverse/Telegram vars but does **not** document `AUTH_PASSWORD`, `MANAGER_PASSWORD`, or `MANAGER_PASSWORD_BYPASS`.
- Local `.env` contains those auth variable names (values redacted): `AUTH_PASSWORD`, `MANAGER_PASSWORD`, `MANAGER_PASSWORD_BYPASS`.

## Architecture

SvelteKit file routes live under `src/routes`. `/tools` has a nested layout and many tool pages:
- Core files: `src/routes/tools/+layout.server.ts`, `+layout.svelte`, `+page.svelte`.
- Auth routes: `src/routes/tools/login/+page.server.ts`, `+page.svelte`; `src/routes/tools/logout/+server.ts`.
- Server-loaded tools: checklist, close-shift, expense-scan, incidents, memberships, onboarding/kitchen.
- Client/remote-function-heavy tools: families, menu-assistant, pos-sync, procurement-import, receipts, salary-payment, graphics.

Request flow: all requests pass through `src/hooks.server.ts`. The hook initializes `event.locals.role`, applies webhook CSRF origin tweaks for selected `/api` routes, then redirects unauthenticated `/tools*` requests to `/tools/login`. Login stores a role string directly in an httpOnly cookie. The tools server layout reads `locals.role` and the Svelte layout uses it only for navigation display.

Data layer is Drizzle ORM over `postgres` package, not the Neon serverless client despite dependency presence. Runtime connection selection is process env based and lazy; migrations use Drizzle Kit with `drizzle/` SQL files.

Remote functions (`$app/server` `query`/`command`) are enabled and widely used by tools. Examples checked do not call `getRequestEvent`, inspect cookies/locals, or enforce auth inside the remote function itself.

## Start Here

Start with `src/hooks.server.ts`. It is the existing central integration point for protecting `/tools`, setting `locals.role`, and adding manager-only route checks. Then open `src/routes/tools/login/+page.server.ts` to understand current credential/cookie behavior.

## Risks / Open Questions

- Auth already exists. If the task is to “add auth”, avoid duplicating; likely needs hardening/extension rather than first implementation.
- Cookie stores raw role (`staff`/`manager`) without signing or server-side session lookup. A client cannot edit httpOnly via JS, but anyone who can set their own cookie could claim `manager`; no cryptographic integrity.
- Cookie uses `secure: true` unconditionally. On plain `http://localhost`, browsers may not persist/send it, making local login appear broken unless using HTTPS or bypass.
- `MANAGER_PASSWORD_BYPASS === '1'` silently grants manager role when no cookie exists. Ensure it is never enabled in production.
- Server manager enforcement only includes `/tools/salary-payment` (`src/hooks.server.ts` lines 43-46), while UI marks POS Sync, Receipts, Incidents, Expense Scan as manager-only (`src/routes/tools/+layout.svelte` lines 18-22). Staff can likely navigate directly to those URLs unless hook list is updated.
- Remote functions used by tools have no explicit auth checks in sampled files. If remote function endpoints are callable independently of `/tools` page loads, sensitive operations/data may bypass the pathname gate. Consider a shared server-side guard using request event/locals for remote functions.
- `.env.example` missing auth vars, so deployments/local setup may fail at build/runtime with `$env/static/private` imports if vars are absent.
- No users/session/auth tables in current Drizzle schema; adding real user auth would require new schema + migration. Current DB schema is receipts/webhook/reporting-oriented.
- Do not run `pnpm check`/`svelte check` per project instruction.
