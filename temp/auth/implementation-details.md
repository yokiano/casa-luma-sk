# Internal Auth Implementation Details / Plan

This is the detailed implementation plan for replacing the current `/tools` static-password gate with a first-party internal auth system.

Persistent conceptual documentation lives at:

- `docs/auth/internal-auth-how-it-works.md`

This file is intentionally more tactical and can be used by an implementation agent.

## Current state summary

Relevant current files:

- `src/hooks.server.ts`
  - currently gates `/tools` using `casa_luma_tools_auth` cookie
  - cookie value is currently a raw role string such as `staff` or `manager`
  - `MANAGER_PASSWORD_BYPASS === '1'` can grant manager access when no cookie exists
  - server-side manager-only routes currently appear incomplete

- `src/routes/tools/login/+page.server.ts`
  - currently imports `AUTH_PASSWORD` and `MANAGER_PASSWORD`
  - accepts a single password field
  - sets cookie to raw role string

- `src/routes/tools/login/+page.svelte`
  - currently renders a single password field

- `src/routes/tools/logout/+server.ts`
  - currently deletes `casa_luma_tools_auth`

- `src/routes/tools/+layout.server.ts`
  - currently returns `locals.role`

- `src/routes/tools/+layout.svelte`
  - currently owns the tab list locally
  - uses `managerOnly: true` for some nav items
  - checks `role === 'manager'`

- `src/app.d.ts`
  - currently has `interface Locals { role: string | undefined }`

- `src/lib/server/db/schema.ts`
  - existing Drizzle schema file
  - no auth tables yet

- `src/lib/server/db/client.ts`
  - existing Drizzle/Postgres runtime client

- `drizzle.config.ts`
  - existing Drizzle Kit migration config

Project instruction:

- Do **not** run `pnpm check`, `svelte check`, or `pnpm build` in this project.

## Implementation goals

1. Add DB-backed internal users in `staff_users`.
2. Add DB-backed sessions in `staff_sessions`.
3. Login with email + password.
4. Store only opaque session token in an HttpOnly cookie.
5. Resolve current user/session in `hooks.server.ts` into `event.locals`.
6. Add central protected route registry.
7. Use registry for both server-side route protection and tools navigation.
8. Support explicit role/route rules, not only a strict hierarchy.
9. Add owner-only user management UI as part of the first version.
10. Audit existing remote functions/endpoints before deciding full function-level enforcement.

## Naming decisions

Use these names unless implementation discovers a strong reason to change:

- Users table: `staff_users`
- Sessions table: `staff_sessions`
- Auth cookie: `casa_luma_internal_session`
- Roles type: `StaffRole` or `InternalRole`
- User type: `StaffUser` or `InternalUser`
- Route registry: `protectedRoutes` or `toolRoutes`

Avoid names that imply this is public customer auth.

## Suggested file structure

Suggested new files:

```txt
src/lib/auth/types.ts
src/lib/auth/roles.ts
src/lib/auth/protected-routes.ts
src/lib/auth/authorization.ts
src/lib/server/auth/password.ts
src/lib/server/auth/session.ts
src/lib/server/auth/guards.ts
```

Possible owner management route:

```txt
src/routes/tools/admin/users/+page.server.ts
src/routes/tools/admin/users/+page.svelte
```

Possible user create/edit routes/actions can either live in the same page server file or nested routes, depending on desired UX.

## Data model

### `staff_users`

Add to `src/lib/server/db/schema.ts`.

Recommended fields:

```ts
export const staffUsers = pgTable('staff_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  roles: jsonb('roles').$type<InternalRole[]>().notNull().default(['staff']),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true })
});
```

Notes:

- `roles` as JSON array gives immediate flexibility for non-hierarchical/horizontal roles.
- If preferred, a single `role` enum/text column can be used at first, but JSON array better matches the user's stated desire for explicit permissions later.
- `email` should be normalized to lowercase/trimmed before insert/login.
- Add an index on `email` if unique does not create suitable index automatically in the Drizzle output.

Alternative stricter schema:

```ts
role: text('role').$type<InternalRole>().notNull().default('staff')
```

But prefer array roles unless there is a reason to avoid JSON.

### `staff_sessions`

Recommended fields:

```ts
export const staffSessions = pgTable('staff_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => staffUsers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
  userAgent: text('user_agent'),
  ipHash: text('ip_hash')
});
```

Indexes:

- unique index on `token_hash`
- index on `user_id`
- index on `expires_at`

Notes:

- Store `tokenHash`, not the raw session token.
- `ipHash` is optional and should avoid storing raw IP if not needed.
- Expired sessions can be cleaned lazily during login/session validation or via a later maintenance job.

## Auth types

Create app-owned types, probably in `src/lib/auth/types.ts`.

Recommended first version:

```ts
export const INTERNAL_ROLES = ['staff', 'mgmt', 'owner'] as const;
export type InternalRole = (typeof INTERNAL_ROLES)[number];

export type InternalUser = {
  id: string;
  email: string;
  name: string;
  roles: InternalRole[];
  active: boolean;
};

export type InternalSession = {
  id: string;
  userId: string;
  expiresAt: Date;
};
```

Keep these types independent from Drizzle's generated types where convenient, so `event.locals.user` remains a stable safe shape.

## `src/app.d.ts`

Update locals from raw role string to structured auth state.

Example:

```ts
import type { InternalSession, InternalUser } from '$lib/auth/types';

declare global {
  namespace App {
    interface Locals {
      user?: InternalUser;
      session?: InternalSession;
    }
  }
}

export {};
```

If keeping `locals.role` temporarily for migration, derive it from `locals.user.roles` and remove later.

## Password hashing

Use current stack without adding auth framework.

Preferred minimal approach:

- Node `crypto.scrypt` or `crypto.scryptSync`
- per-password random salt
- constant-time compare with `timingSafeEqual`

Suggested format:

```txt
scrypt:v1:<N>:<r>:<p>:<salt-base64>:<hash-base64>
```

Implementation file:

```txt
src/lib/server/auth/password.ts
```

Functions:

```ts
export async function hashPassword(password: string): Promise<string>;
export async function verifyPassword(password: string, storedHash: string): Promise<boolean>;
```

Security notes:

- Reject very short passwords in user creation/reset actions.
- Avoid logging passwords or hashes.
- Use constant-time comparison when comparing derived hash bytes.
- If adding a dependency is acceptable later, Argon2id can be considered, but first version can use Node crypto.

## Session helpers

Implementation file:

```txt
src/lib/server/auth/session.ts
```

Suggested constants:

```ts
export const SESSION_COOKIE_NAME = 'casa_luma_internal_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
```

Functions:

```ts
export function generateSessionToken(): string;
export function hashSessionToken(token: string): string;
export async function createSession(userId: string, event?: RequestEvent): Promise<{ session: InternalSession; token: string }>;
export async function getSessionFromToken(token: string): Promise<{ session: InternalSession; user: InternalUser } | null>;
export async function validateRequestSession(event: RequestEvent): Promise<{ session: InternalSession; user: InternalUser } | null>;
export async function deleteSession(sessionId: string): Promise<void>;
export async function deleteUserSessions(userId: string): Promise<void>;
export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void;
export function clearSessionCookie(cookies: Cookies): void;
```

Cookie options:

```ts
{
  path: '/',
  httpOnly: true,
  sameSite: 'lax', // or 'strict'; choose intentionally
  secure: dev ? false : true,
  expires: expiresAt
}
```

Use SvelteKit `dev` from `$app/environment` or another safe environment check so local HTTP login works.

Session validation behavior:

1. Read cookie.
2. Hash token.
3. Find matching session.
4. Reject if expired.
5. Load user.
6. Reject if user missing or inactive.
7. Optionally update `lastUsedAt` periodically, not necessarily every request.
8. Return sanitized `InternalUser` and `InternalSession`.

## Authorization helpers

Implementation file:

```txt
src/lib/auth/authorization.ts
```

Suggested helpers:

```ts
export function hasAnyRole(userRoles: InternalRole[], allowedRoles: InternalRole[]): boolean;
export function isAuthorized(user: InternalUser | undefined, rule: AccessRule | undefined): boolean;
```

Access rule shape:

```ts
export type AccessRule = {
  allowedRoles?: InternalRole[];
  requiredPermissions?: string[]; // reserved/future-compatible
};
```

First-version semantics:

- no rule = public/allowed
- empty `allowedRoles` = no role restriction
- otherwise user must have at least one allowed role
- owner is not automatically allowed unless owner is included in the rule, unless a deliberate `ownerBypass` policy is chosen

Important: because the user explicitly prefers explicit permissions per route, do not silently implement a strict hierarchy unless the route registry includes owner in the allowed list.

Example:

```ts
hasAnyRole(['owner'], ['mgmt', 'owner']) === true
hasAnyRole(['owner'], ['mgmt']) === false // unless policy says owner bypasses all
```

Decide this explicitly during implementation. The safer interpretation of the user's answer is: route rules list the roles that can access.

## Central protected route registry

Implementation file:

```txt
src/lib/auth/protected-routes.ts
```

Because the registry is used by both server and UI, keep it free of server-only imports.

Suggested shape:

```ts
import type { InternalRole } from './types';

export type ProtectedRoute = {
  id: string;
  path: string;
  label: string;
  section?: string;
  nav?: boolean;
  exact?: boolean;
  allowedRoles?: InternalRole[];
  children?: ProtectedRoute[];
};
```

Potential registry:

```ts
export const protectedRoutes: ProtectedRoute[] = [
  {
    id: 'tools',
    path: '/tools',
    label: 'Internal Tools',
    nav: false,
    allowedRoles: ['staff', 'mgmt', 'owner'],
    children: [
      { id: 'tools.checklist', path: '/tools/checklist', label: 'Checklist', section: 'Staff Tools', nav: true, allowedRoles: ['staff', 'mgmt', 'owner'] },
      { id: 'tools.closeShift', path: '/tools/close-shift', label: 'Close Shift', section: 'Staff Tools', nav: true, allowedRoles: ['staff', 'mgmt', 'owner'] },
      { id: 'tools.families', path: '/tools/families', label: 'Families', section: 'Staff Tools', nav: true, allowedRoles: ['staff', 'mgmt', 'owner'] },
      { id: 'tools.memberships', path: '/tools/memberships', label: 'Memberships', section: 'Staff Tools', nav: true, allowedRoles: ['staff', 'mgmt', 'owner'] },
      { id: 'tools.recipes', path: '/tools/recipes', label: 'Casa Luma Recipes', section: 'Staff Tools', nav: true, allowedRoles: ['staff', 'mgmt', 'owner'] },
      { id: 'tools.onboardingKitchen', path: '/tools/onboarding/kitchen', label: 'Onboarding', section: 'Staff Tools', nav: true, allowedRoles: ['staff', 'mgmt', 'owner'] },

      { id: 'tools.salaryPayment', path: '/tools/salary-payment', label: 'Payroll', section: 'Management Tools', nav: true, allowedRoles: ['mgmt', 'owner'] },
      { id: 'tools.posSync', path: '/tools/pos-sync', label: 'POS Sync', section: 'Management Tools', nav: true, allowedRoles: ['mgmt', 'owner'] },
      { id: 'tools.receipts', path: '/tools/receipts', label: 'Receipts', section: 'Management Tools', nav: true, allowedRoles: ['mgmt', 'owner'] },
      { id: 'tools.incidents', path: '/tools/incidents', label: 'Incidents', section: 'Management Tools', nav: true, allowedRoles: ['mgmt', 'owner'] },
      { id: 'tools.expenseScan', path: '/tools/expense-scan', label: 'Expense Scan', section: 'Management Tools', nav: true, allowedRoles: ['mgmt', 'owner'] },

      { id: 'tools.adminUsers', path: '/tools/admin/users', label: 'Users', section: 'Owner Tools', nav: true, allowedRoles: ['owner'] }
    ]
  }
];
```

Potential route matching helpers:

```ts
export function findProtectedRoute(pathname: string): ProtectedRoute | undefined;
export function getAuthorizedNavRoutes(user: InternalUser | undefined): ProtectedRoute[];
```

Matching rules:

- exact route match should win over prefix match
- for nested tool pages, prefix match may be okay, e.g. `/tools/receipts/details`
- `/tools/login` and `/tools/logout` should be handled specially as auth routes, not blocked as normal protected routes
- consider route groups/future protected areas outside `/tools`

## Hooks implementation

Update `src/hooks.server.ts`.

Recommended sequence:

1. Keep existing API/webhook CSRF/origin behavior intact.
2. Resolve auth session for every request or at least every request under protected areas.
3. Set `event.locals.user` and `event.locals.session`.
4. Handle auth route bypasses.
5. Check protected route registry.
6. Redirect unauthenticated users to login with `continueTo`.
7. Throw 403 for authenticated but unauthorized users.

Pseudo-code:

```ts
export const handle: Handle = async ({ event, resolve }) => {
  // preserve existing webhook/origin logic

  const auth = await validateRequestSession(event);
  event.locals.user = auth?.user;
  event.locals.session = auth?.session;

  const pathname = event.url.pathname;

  if (pathname === '/tools/login') {
    if (event.locals.user) {
      throw redirect(303, event.url.searchParams.get('continueTo') || '/tools');
    }
    return resolve(event);
  }

  if (pathname === '/tools/logout') {
    return resolve(event);
  }

  const route = findProtectedRoute(pathname);
  if (route) {
    if (!event.locals.user) {
      const continueTo = `${event.url.pathname}${event.url.search}`;
      throw redirect(303, `/tools/login?continueTo=${encodeURIComponent(continueTo)}`);
    }

    if (!isAuthorized(event.locals.user, route)) {
      throw error(403, 'Forbidden');
    }
  }

  return resolve(event);
};
```

Consider app-wide login route later:

- Current first version can keep `/tools/login`.
- If auth truly becomes app-wide, consider `/login` as canonical later and redirect `/tools/login` to it.

## Login page changes

Files:

```txt
src/routes/tools/login/+page.server.ts
src/routes/tools/login/+page.svelte
```

Server load:

- read `continueTo`
- if already logged in, redirect to `continueTo` or `/tools`
- return safe `continueTo` value

Action:

1. Read `email`, `password`, `continueTo`.
2. Normalize email.
3. Find user by email.
4. Reject missing/inactive user with same generic error as wrong password.
5. Verify password.
6. Create session.
7. Set session cookie.
8. Update `lastLoginAt`.
9. Redirect to safe `continueTo`.

Important safety:

- Validate `continueTo` is a local path beginning with `/`, not `//`, not absolute URL.
- Return generic error: `Incorrect email or password`.
- Optionally add basic rate limiting later; not required for first pass unless exposed publicly.

Svelte page:

- replace single password input with email + password fields
- preserve current Casa Luma styling
- keep progressive enhancement if currently used

## Logout changes

File:

```txt
src/routes/tools/logout/+server.ts
```

Behavior:

- read current `locals.session` or cookie token
- delete DB session if available
- clear session cookie
- redirect to `/tools/login`

Support both GET and POST as current file does, unless you choose to make POST canonical.

## Tools layout changes

Files:

```txt
src/routes/tools/+layout.server.ts
src/routes/tools/+layout.svelte
```

Server load:

- require user should already be enforced in hook, but layout can defensively redirect if missing
- compute authorized nav routes from central registry
- return current user and nav routes

Example return:

```ts
return {
  user: locals.user,
  navSections: getAuthorizedToolNavSections(locals.user)
};
```

Svelte layout:

- remove hardcoded `allTabs` and `managerOnly`
- render `data.navSections`
- use user display info if useful
- update role names from old `manager` to `mgmt`
- keep logout hidden on login page
- preserve special layout behavior for onboarding and salary payment unless refactoring separately

## Owner user management UI

Add route:

```txt
src/routes/tools/admin/users/+page.server.ts
src/routes/tools/admin/users/+page.svelte
```

Registry:

```ts
allowedRoles: ['owner']
```

Server load:

- list staff users, excluding password hashes
- maybe include session count or last login if easy

Actions:

- `createUser`
- `updateUserRoles`
- `setActive`
- `resetPassword`
- optionally `updateProfile`

Create user inputs:

- name
- email
- temporary password
- roles
- active

Validation:

- email required and valid-ish
- normalize email
- password minimum length
- at least one role
- roles must be valid `INTERNAL_ROLES`
- cannot remove the last active owner accidentally

Important owner safety rules:

- Prevent an owner from disabling themselves if they are the only active owner.
- Prevent removing `owner` from the last active owner.
- Consider requiring current password for sensitive user-management operations later; not required in first pass unless desired.
- Never return password hashes to the client.

UI:

- simple table of users
- create form
- per-user role controls or edit form
- disable/reactivate button
- password reset field/button

Keep this UI basic. The goal is functionality, not a full admin product.

## Bootstrap strategy

Because user management is owner-only, the system needs a first owner.

Recommended options:

### Option A: one-time seed script

Create a script such as:

```txt
scripts/create-owner-user.ts
```

It reads env vars:

```txt
INITIAL_OWNER_EMAIL=
INITIAL_OWNER_NAME=
INITIAL_OWNER_PASSWORD=
```

Then inserts an active owner if no owner exists.

### Option B: migration seed

Not recommended for passwords because secrets should not be committed into migrations.

### Option C: temporary local/admin action

Not recommended unless carefully removed.

Best recommendation: create a one-time script or documented SQL/tsx command to create the first owner.

If adding script, update `package.json` with a safe script name only if appropriate, but do not run broad checks/builds.

## Environment variables

Remove dependency on old static-password vars once migration is complete:

- `AUTH_PASSWORD`
- `MANAGER_PASSWORD`
- `MANAGER_PASSWORD_BYPASS`

Update `.env.example` to include optional bootstrap vars if using seed script:

```txt
# Internal auth bootstrap; used only by the owner creation script
INITIAL_OWNER_EMAIL=
INITIAL_OWNER_NAME=
INITIAL_OWNER_PASSWORD=
```

Do not require these vars at app runtime if they are only for the seed script.

Avoid importing bootstrap vars with `$env/static/private` in normal app code.

## Migration steps

1. Add auth types and route registry.
2. Add Drizzle schema tables.
3. Generate/add SQL migration.
4. Add password hashing helpers.
5. Add session helpers.
6. Update `src/app.d.ts`.
7. Update `src/hooks.server.ts` to resolve sessions and authorize protected routes.
8. Update login action/page to email/password.
9. Update logout route.
10. Update tools layout server/client to use central nav registry.
11. Add owner user management route and actions.
12. Add first-owner bootstrap script or documented mechanism.
13. Remove/deprecate old static password env usage.
14. Audit remote functions/endpoints.
15. Add server-side guards to sensitive remote functions/endpoints based on audit.
16. Manually test login/logout/access flows.

## Drizzle migration notes

Do not run noisy project checks.

You may inspect existing migration conventions:

```txt
drizzle/0000_*.sql
drizzle/0001_*.sql
drizzle/0002_*.sql
drizzle/meta/
```

Depending on the project's usual workflow, either:

- use Drizzle Kit to generate a migration, or
- manually write a migration matching project style.

If running a command, avoid `pnpm check`, `svelte check`, or `pnpm build`.

Safe-ish commands to consider only if needed:

- inspect package scripts with `read package.json`
- use Drizzle migration generation if configured and not noisy

## Route registry detailed behavior

Implement route matching carefully.

Requirements:

- `/tools/login` is public for unauthenticated users.
- `/tools/logout` is reachable for authenticated users and should clear session even if session is stale.
- `/tools` itself requires at least staff/mgmt/owner.
- routes listed in registry should match direct path and child subpaths.
- most specific match wins.
- if no protected route matches, current public app behavior should remain unchanged unless deliberately expanding protection.

Potential implementation:

```ts
function matchesRoute(route: ProtectedRoute, pathname: string) {
  if (route.exact) return pathname === route.path;
  return pathname === route.path || pathname.startsWith(`${route.path}/`);
}
```

Flatten children before matching and sort by path length descending so deeper paths win first.

## Initial route policy questions to resolve during implementation

The user selected both:

- mgmt for current manager tools
- owner for future tools
- owner for some current sensitive tools

Therefore before finalizing registry, do a quick route-by-route review and ask/confirm if necessary.

Likely starting assumption unless user says otherwise:

- Staff routes: basic existing tools.
- Mgmt + owner routes: current manager tools.
- Owner-only routes: user management plus any explicitly confirmed sensitive dashboards/tools.

Potential owner-only candidates to ask about:

- Payroll / Salary Payment
- Receipts financial analytics
- Expense Scan
- future dashboards

Do not silently make all financial tools owner-only unless confirmed.

## Remote function / endpoint audit

Before implementing function-level guards, list relevant files.

Known examples from prior context:

- `src/lib/receipts.remote.ts`
- `src/lib/salary.remote.ts`
- `src/lib/tools/menu-assistant.remote.ts`
- `src/routes/tools/graphics/graphics.remote.ts`

Audit should answer:

1. Which remote functions exist?
2. Which routes/pages call them?
3. What data do they read or mutate?
4. Which role/permission should be required?
5. Are any reachable without a protected page load?
6. Should they call `requireUser`, `requireRole`, or a more specific helper?

Potential guard file:

```txt
src/lib/server/auth/guards.ts
```

Possible helpers:

```ts
export function getCurrentUser(): InternalUser;
export function requireUser(): InternalUser;
export function requireAnyRole(roles: InternalRole[]): InternalUser;
export function requirePermission(permission: string): InternalUser;
```

For SvelteKit remote functions, investigate the correct way to access request event/locals in the current SvelteKit version, likely via `$app/server` APIs or `getRequestEvent` if available. Do not guess; inspect existing remote function docs in `docs/svelte/remote-functions.md` and current code before implementing.

## Backward compatibility / deployment transition

Potential transition strategy:

1. Ship DB tables and owner seed first.
2. Deploy with new login but keep old static password code only if explicitly needed as fallback.
3. Remove old static password envs after successful login confirmation.

However, because the current cookie stores raw roles, do not keep it as an authorization fallback in production unless clearly marked temporary and gated by an explicit safe env var.

If a temporary bypass is kept for local development, it must not grant production access accidentally.

## Manual test plan

Do not run project-wide checks/build per instructions.

Manual/browser flows to test:

### Authentication

- unauthenticated visit `/tools` redirects to login
- unauthenticated visit `/tools/checklist` redirects to login with `continueTo`
- wrong email/password shows generic error
- disabled user cannot log in
- valid staff user logs in and redirects correctly
- logout deletes session and redirects to login
- after logout, back/refresh cannot access protected pages

### Authorization

- staff sees only staff nav routes
- staff direct visit to mgmt route returns 403 or safe redirect, depending chosen UX
- mgmt sees staff + mgmt routes if registry lists both
- mgmt cannot access owner-only users page
- owner can access owner user management
- unknown protected child routes behave predictably

### User management

- owner can create staff user
- owner can create mgmt user
- owner can disable user
- disabled user loses access on next request
- owner can reset password
- app prevents removing/disabling last active owner
- password hashes never render in page data

### Sessions

- session cookie is HttpOnly
- cookie is secure in production and works locally in dev
- expired sessions redirect to login
- deleting a session invalidates that browser

### Navigation

- nav comes from registry, not duplicated hardcoded arrays
- current route active state still works
- onboarding and print layout special cases still work

## Security considerations

- Always use generic login error messages.
- Never store raw passwords.
- Never store raw session token in DB.
- Never expose password hashes in loads/actions.
- Do not rely on UI hiding for security.
- Validate `continueTo` to prevent open redirects.
- Use `secure: !dev` or equivalent for session cookie.
- Disable old `MANAGER_PASSWORD_BYPASS` behavior.
- Re-check user active status on session validation.
- Invalidate sessions when user is disabled, or reject them at validation time.
- Consider deleting all sessions after password reset.

## Suggested implementation order in code

### Phase 1: Foundation

- Create auth types.
- Create protected route registry.
- Create authorization helpers.
- Update `app.d.ts`.

### Phase 2: DB schema and helpers

- Add `staff_users` and `staff_sessions` schema.
- Add migration.
- Add password helper.
- Add session helper.
- Add first owner bootstrap mechanism.

### Phase 3: Request integration

- Update hooks.
- Update login/logout.
- Update tools layout.

### Phase 4: Owner user management

- Add owner users route.
- Implement create/update/disable/reset actions.
- Add registry/nav entry.

### Phase 5: Audit and hardening

- Audit remote functions/endpoints.
- Add guards to sensitive functions.
- Remove stale static password code/envs.
- Update docs if implementation differs from plan.

## Out of scope unless separately requested

- Public registration
- Customer auth
- Email verification
- Email-based password reset
- OAuth/social login
- Passkeys
- 2FA
- External auth framework adoption
- Full permission management UI beyond basic roles

## Open decisions for implementation session

Ask the user or choose sensible default when implementing:

1. Should `owner` automatically bypass all route role checks, or must each route explicitly include `owner`?
   - Current preferred reading: explicit route roles; include owner where desired.
2. Which current sensitive tools should be owner-only rather than mgmt+owner?
3. Should login route remain `/tools/login` or become app-wide `/login` now?
   - Current likely default: keep `/tools/login` for first pass, structure internals app-wide.
4. Should roles be single-role or multi-role?
   - Current recommendation: multi-role JSON array.
5. Should password reset force delete all existing sessions for that user?
   - Recommended: yes.
