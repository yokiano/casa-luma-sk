# Research: SvelteKit auth options for Neon Postgres (2025-2026)

## Summary
For a SvelteKit app that already has Neon Postgres and wants minimal stack, server-side cookies, and maintainable code, the best default is **custom database sessions in SvelteKit hooks**, optionally adding **Arctic** only for OAuth providers. Use **Better Auth** when you want a fuller productized auth feature set (email/password, verification, reset, passkeys, social auth) and accept its schema/client/plugin stack. Avoid starting new work on **Lucia v3** itself: it is deprecated; its docs are now best used as implementation guidance.

## Recommendation
**Recommended path:** implement a small first-party auth layer:
- `user` table in Neon plus `session` table with opaque random session tokens stored server-side.
- `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`, `Path=/`, expiring session cookie.
- Validate cookie in `src/hooks.server.ts`, load user/session into `event.locals`, and protect routes/actions server-side.
- If social login is needed, add **Arctic** for OAuth authorization-code/PKCE/state handling, then create your own local user/session.

Choose **Better Auth** instead if you need multiple auth features quickly (verification emails, password reset, passkeys, 2FA/admin/org plugins) and are comfortable adopting its tables, migrations, client package, and conventions. Choose **Auth.js/SvelteKit** mainly if OAuth-provider login and Auth.js adapter conventions fit the app; it is less ideal for a minimal custom server-session design or production passkeys.

## Findings
1. **Lucia package is not a current library choice.** Lucia v3 is explicitly deprecated; the official migration page says “Lucia v3 has been deprecated” and Lucia is now “a learning resource for implementing sessions and more.” The maintainer rationale is that implementing sessions from scratch became easier/faster than maintaining a low-level adapter library. [Lucia migration](https://lucia-auth.com/lucia-v3/migrate)

2. **SvelteKit’s official model matches server-side session cookies.** The SvelteKit auth docs distinguish database session IDs from JWTs: DB sessions can be revoked immediately but require a DB lookup; JWTs avoid lookups but generally cannot be immediately revoked. SvelteKit’s integration point is checking auth cookies in server hooks and storing user info in `locals`. [SvelteKit auth docs](https://svelte.dev/docs/kit/auth)

3. **Custom sessions are the smallest stack for Neon.** The Lucia replacement guidance shows the core pattern: generate a high-entropy session ID, store it with `user_id` and expiry, validate/refresh/delete it in the DB, and set cookies with `HttpOnly`, `SameSite=Lax`, `Secure` in production, expiry, and `Path=/`. This maps directly to Neon Postgres and SvelteKit hooks without adding an auth framework. [Lucia migration/session guidance](https://lucia-auth.com/lucia-v3/migrate)

4. **Arctic is a good minimal OAuth add-on, not a full auth system.** Arctic is a lightweight, typed, runtime-agnostic OAuth 2.0 client supporting authorization code flow; its PKCE guide requires generated `state`/`code_verifier`, storing them in `HttpOnly` cookies, comparing state on callback, then validating the authorization code. You still own user linking, account tables, sessions, and authorization. [Arctic docs](https://arcticjs.dev/) [PKCE guide](https://arcticjs.dev/guides/oauth2-pkce)

5. **Auth.js/SvelteKit is mature for provider-based auth, but adds framework conventions.** Auth.js has an official SvelteKit integration exposing `SvelteKitAuth`, `handle`, `signIn`, and `signOut`, and supports route protection via SvelteKit handles. Its database docs say sessions are saved in a cookie by default and database adapters are optional unless persisting users or using flows such as email magic links. [Auth.js SvelteKit](https://authjs.dev/reference/sveltekit) [Auth.js database adapters](https://authjs.dev/getting-started/database)

6. **Auth.js has a Neon adapter, but it brings Auth.js schema and adapter model.** The official Neon adapter uses `@auth/neon-adapter` plus `@neondatabase/serverless` and creates Auth.js tables such as `users`, `accounts`, `sessions`, and `verification_token`. This is convenient if you accept Auth.js’s data model; less minimal if the app already has a custom user/session model. [Auth.js Neon adapter](https://authjs.dev/getting-started/adapters/neon)

7. **Auth.js passkeys are not the production recommendation.** Auth.js docs mark WebAuthn/Passkeys as experimental and “not recommended for production use,” with adapter/framework limitations and extra schema. For production passkeys, prefer Better Auth’s passkey plugin or a dedicated WebAuthn implementation over Auth.js passkeys today. [Auth.js WebAuthn](https://authjs.dev/getting-started/authentication/webauthn)

8. **Better Auth is now first-class in SvelteKit tooling, but is a larger dependency choice.** SvelteKit docs link Better Auth from the auth page, and the Svelte CLI add-on says it creates a complete SvelteKit auth setup with Drizzle, email/password by default, and optional demo login/registration pages. Better Auth’s SvelteKit integration mounts a handler in `hooks.server.ts`, but you must explicitly populate `event.locals.user` and `event.locals.session` if server code needs them. [SvelteKit auth docs](https://svelte.dev/docs/kit/auth) [Svelte CLI Better Auth](https://svelte.dev/docs/cli/better-auth) [Better Auth SvelteKit](https://better-auth.com/docs/integrations/svelte-kit)

9. **Better Auth works with Postgres/Neon-style connection strings and manages migrations.** Better Auth’s PostgreSQL adapter accepts a `pg` `Pool` with a connection string and supports CLI schema generation/migration. This is a strong option if you want batteries included over minimal hand-written SQL. [Better Auth PostgreSQL](https://better-auth.com/docs/adapters/postgresql)

10. **Better Auth has broader built-in auth features than Auth.js/SvelteKit or Arctic.** It includes email/password, email verification, password reset, social auth, and plugin support. Its password docs say it hashes passwords with Node-native `scrypt` by default and allows custom Argon2; its passkey plugin is powered by SimpleWebAuthn and stores passkey data in a DB table. [Better Auth email/password](https://www.better-auth.com/docs/authentication/email-password) [Better Auth passkey](https://better-auth.com/docs/plugins/passkey)

## Comparison
| Option | Fit for minimal Neon + server cookies | Strengths | Tradeoffs |
|---|---:|---|---|
| **Custom sessions + optional Arctic** | **Best** | Fewest dependencies; full control over schema; explicit revocation; aligns with SvelteKit hooks/locals; Arctic adds OAuth only when needed | You own security details, account linking, password reset, email verification, rate limits, passkeys |
| **Better Auth** | Good if features matter | Current SvelteKit ecosystem support; Postgres adapter; built-in email/password, verification/reset, social, passkeys/plugins | More stack/schema/client/plugin surface; may duplicate existing DB patterns; less “minimal” |
| **Auth.js/SvelteKit** | Good for OAuth-first apps | Official SvelteKit integration; many providers; Neon adapter; familiar Auth.js ecosystem | Adapter schema/conventions; default cookie/JWT behavior may not match custom DB-session goal; passkeys experimental/not production-recommended |
| **Hand-rolled email/password/passkeys** | Good only with discipline | Maximum control and no framework lock-in; passkeys can be added with SimpleWebAuthn | Highest security burden: hashing, reset tokens, enumeration, throttling, WebAuthn edge cases, recovery flows |
| **Lucia v3 package** | Do not choose | Docs remain valuable as a guide | Deprecated; maintenance ended/ending; not a forward-looking dependency |

## Security considerations
- Use opaque random session tokens; store only a hash of the token in the DB if feasible, so DB leaks do not immediately become active sessions.
- Cookies: `HttpOnly`, `Secure` in production, `SameSite=Lax` or `Strict`, explicit expiry, `Path=/`; avoid broad cross-subdomain cookies unless necessary.
- Validate sessions in `hooks.server.ts`; put authenticated user/session in `event.locals`; enforce authorization in server loads/actions/endpoints, not only UI.
- Rotate/extend sessions deliberately and revoke on logout, password reset, suspicious activity, or account changes.
- For email/password: use Argon2id or scrypt with strong parameters, normalize emails, verify email ownership, avoid user enumeration, add rate limiting and bot protection, and use single-use expiring reset/verification tokens.
- For OAuth: always validate `state`; use PKCE where supported/required; validate provider email verification before trusting email identity; design account-linking rules carefully.
- For passkeys: prefer a maintained WebAuthn implementation; configure RP ID/origin correctly; keep recovery/account-loss flows secure. Avoid Auth.js passkeys for production while official docs mark them experimental.
- Neon/serverless: avoid excessive per-request connection churn; use the Neon serverless driver or pooling strategy appropriate for deployment, and index `session.expires_at`, `session.user_id`, and token hash/id fields.

## Sources
- Kept: SvelteKit Auth docs (https://svelte.dev/docs/kit/auth) — official SvelteKit guidance on sessions, cookies, hooks, and Better Auth link.
- Kept: Lucia migration docs (https://lucia-auth.com/lucia-v3/migrate) — primary source for Lucia deprecation and replacement session/cookie patterns.
- Kept: Arctic docs (https://arcticjs.dev/) and PKCE guide (https://arcticjs.dev/guides/oauth2-pkce) — primary source for lightweight OAuth behavior and state/PKCE handling.
- Kept: Auth.js SvelteKit docs (https://authjs.dev/reference/sveltekit) — primary source for SvelteKit integration and route protection.
- Kept: Auth.js database/Neon/WebAuthn docs (https://authjs.dev/getting-started/database, https://authjs.dev/getting-started/adapters/neon, https://authjs.dev/getting-started/authentication/webauthn) — primary source for adapter model, Neon schema, and passkey status.
- Kept: Better Auth SvelteKit/PostgreSQL/cookies/email-password/passkey docs (https://better-auth.com/docs/integrations/svelte-kit, https://better-auth.com/docs/adapters/postgresql, https://better-auth.com/docs/concepts/cookies, https://www.better-auth.com/docs/authentication/email-password, https://better-auth.com/docs/plugins/passkey) — primary source for integration, DB, cookies, and feature support.
- Dropped: SEO/tutorial posts and vendor passkey tutorials — useful examples but less authoritative than SvelteKit/Auth.js/Better Auth/Lucia/Arctic primary docs.

## Gaps
- Exact current npm download counts, release cadence, and unresolved CVEs were not compared; check npm/GitHub advisories before final dependency choice.
- Better Auth’s long-term API stability should be assessed against the project’s tolerance for adopting a fast-moving auth framework.
- If passkeys are a near-term requirement, prototype Better Auth passkeys and a SimpleWebAuthn hand-roll before committing to schema and recovery UX.
