# Internal Auth: How It Works

This document describes the intended authentication and authorization model for Casa Luma internal/admin areas. It is intentionally implementation-agnostic enough to support future private app areas, while the first practical target is the existing `/tools` section.

## Goal

Replace the current static password gate for `/tools` with a first-party auth system using the app's existing stack:

- SvelteKit server hooks and server loads
- Drizzle ORM
- Neon/Postgres
- HttpOnly cookies
- Existing Svelte UI patterns

No external auth framework is planned for this phase.

## Mental model

There are two related but separate concerns:

1. **Authentication** — who is using the app?
2. **Authorization** — what is that user allowed to access or do?

Authentication happens once per request and resolves the current session into an app-owned user object.

Authorization happens after authentication and checks the requested route or server action against central access rules.

Client-side UI checks are useful for hiding links and buttons, but they are not the security boundary. Server-side route checks and server-side action/function checks are the security boundary.

## Core request flow

Every request passes through `src/hooks.server.ts`.

The auth flow should be:

1. Read the internal auth session cookie.
2. Hash/validate the session token against the `staff_sessions` table.
3. If the session is valid and not expired, load the matching active `staff_users` record.
4. Put the resolved user/session into `event.locals`.
5. Run protected-route authorization for matching private routes.
6. Continue to SvelteKit route handling.

Conceptually:

```ts
event.locals.user = authenticatedUser ?? undefined;
event.locals.session = authenticatedSession ?? undefined;
```

The user object in `event.locals.user` is the server-side source of truth for the current request.

## User model

Internal users live in a database table named `staff_users`.

Despite the name, this table is intended to be the foundation for app-wide internal auth, not only basic staff users.

A user should have, conceptually:

- `id`
- `email`
- `name`
- password hash
- active/disabled status
- one or more roles or permissions
- timestamps

Login uses **email + password**.

There should be no public registration flow. Users are created and managed by authorized owner users.

## Session model

Sessions live in a database table such as `staff_sessions`.

The browser cookie stores only a random opaque token. The database stores a hash of that token, not the raw token.

This means:

- DB sessions can be revoked immediately.
- Logout can delete the current session.
- Disabling a user blocks future requests even if they still have a cookie.
- Cookie contents do not contain the user's role or permissions.

The session cookie should be:

- `HttpOnly`
- `Secure` in production
- `SameSite=Lax` or `SameSite=Strict`
- `Path=/`
- expiring

## Authorization model

Authorization should be route-based and explicit.

Although the first roles are expected to be:

- `staff`
- `mgmt`
- `owner`

The system should not assume all access is a simple vertical hierarchy forever.

The route policy should allow rules like:

```ts
allowedRoles: ['mgmt', 'owner']
```

and should be shaped so it can later evolve toward more granular permissions like:

```ts
requiredPermissions: ['tools.payroll.view']
```

This gives flexibility for future horizontal roles or non-hierarchical permissions.

## Central protected route registry

Protected routes should be defined in one central registry.

The registry should describe protected internal routes and their metadata, for example:

- route path or route prefix
- label
- navigation group
- whether it appears in navigation
- allowed roles and/or required permissions

The same registry should power both:

1. Server-side route authorization.
2. Navigation/menu visibility.

Security still comes from the server-side check. The menu is only a convenience layer.

## Initial `/tools` access shape

The current `/tools` section should be migrated from static password access to registered route access.

Initial broad mapping:

### Staff-level tools

Basic internal tools such as:

- Checklist
- Close Shift
- Families
- Memberships
- Casa Luma Recipes
- Onboarding

### Management-level tools

Current manager-only tools such as:

- Payroll / Salary Payment
- POS Sync
- Receipts
- Incidents
- Expense Scan

### Owner-level tools

Owner access exists from the start. Some current sensitive tools may become owner-only after route-by-route review, and future owner dashboards/tools should use this level.

Owner-only user management should be part of the first auth version.

## Login flow

The login page should collect:

- email
- password

Server-side login action:

1. Normalize email.
2. Find active user by email.
3. Verify password hash.
4. Reject inactive users.
5. Create DB session.
6. Set session cookie.
7. Redirect to the original requested path if present, otherwise a sensible internal default.

Unauthenticated protected requests should redirect to login with a continuation parameter, for example:

```txt
/tools/login?continueTo=/tools/receipts
```

After successful login, the user returns to the original destination if allowed.

## Logout flow

Logout should:

1. Delete the current DB session if present.
2. Clear the session cookie.
3. Clear `event.locals.user` for that request.
4. Redirect to login or a public page.

## Protected layout propagation

Protected layouts can return the current user from `locals` to the client:

```ts
return {
  user: locals.user,
  availableRoutes
};
```

The tools layout can then render navigation based on the route registry and current user.

Client-side helpers may answer questions like:

- should this link be shown?
- should this button be visible?
- what is the user's display name?

But any sensitive route, load, action, endpoint, or remote function must still verify permission server-side.

## Server functions and API-like code

Some tools use SvelteKit remote functions and server-side operations.

Route protection alone may not protect all sensitive server functions if they can be called independently.

Before enforcing function-level permission checks, audit existing remote functions and endpoints.

After the audit, sensitive functions should call shared helpers such as:

```ts
requireUser();
requireRole(['mgmt', 'owner']);
requirePermission('tools.receipts.view');
```

The exact helper names can be decided during implementation.

## Owner user management

The first version should include an owner-only user management area.

It should support at least:

- listing internal users
- creating users
- setting name/email
- assigning role(s)
- disabling/reactivating users
- setting or resetting passwords

It does not need public signup, email verification, or email-based password reset in the first version unless separately requested.

## Important principles

- Do not store role or permission claims directly in an unsigned cookie.
- Do not trust UI hiding as authorization.
- Do not spread route rules across many files if a central registry can express them.
- Do not add an auth framework for this phase.
- Keep auth types app-owned, not provider-owned.
- Keep the route registry flexible enough for future non-hierarchical roles/permissions.
