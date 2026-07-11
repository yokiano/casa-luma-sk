# Email automations

## Current goal

Use Cloudflare Email Routing as the email interceptor, then forward matched emails into the app for automation dispatch.

The app records every received email as an email-automation event, classifies it with enabled database rules first, falls back to built-in safe defaults, and only notifies Telegram for actionable success/review outcomes. Email events are not incidents. Telegram messages should stay human-first: clear title, short type, then label/value blocks on separate lines instead of dense `Label: value` rows.

## Architecture

```text
Gmail filter / direct sender
  -> automations@casalumakpg.com
  -> Cloudflare Email Routing
  -> Worker: process-email-trigger
  -> POST /api/webhooks/email
  -> durable email event + classification
  -> Neon runtime settings gate
  -> module handler (Financial Ledger for confirmed expenses, or other handlers as added)
  -> readable Telegram notification when needed
```

Keep the Worker thin. It should only extract safe email metadata/body preview and POST to the SvelteKit app. Business rules, dedupe, Notion/DB writes, Telegram formatting, and future automation dispatch should live in this repo.

## Repo locations

- Cloudflare Worker source: `scripts/cloudflare/process-email-trigger/src/index.ts`
- Worker config: `scripts/cloudflare/process-email-trigger/wrangler.toml`
- App webhook: `src/routes/api/webhooks/email/+server.ts`
- Email automation service: `src/lib/server/email-automation/index.ts`
- Pure classifier: `src/lib/server/email-automation/classifier.ts`
- Default seed rules (mirror the built-in matchers): `src/lib/server/email-automation/seed-rules.ts`
- Modular Telegram templates: `src/lib/server/email-automation/notifications/` (`templates.ts`, `render.ts`, `send.ts`, `helpers.ts`, `builtin-dummies.ts`)
- Dashboard: `/mgmt-dashboard/email-automation` with intake totals, DB rule management (enable/disable, reorder, preview, Send test), built-in classifier previews, subtype outcomes, handler activity, and recent events.
- Smoke test script: `scripts/live-test-email-automation.ts`
- This documentation: `docs/email-automations/README.md`

## Required secrets/config

### App / hosting environment

Set this wherever the SvelteKit app runs:

- `EMAIL_WEBHOOK_SECRET` — shared secret checked by `/api/webhooks/email`
- Email automation Telegram env must also be configured:
  - `TELEGRAM_BOT_TOKEN`
  - `EMAIL_AUTOMATION_TELEGRAM_CHAT_ID`
  - optional `EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID`
  - `EMAIL_AUTOMATION_LEDGER_ENABLED` is now only a pre-migration fallback. Normal runtime control lives in Neon `email_automation_settings` and is editable from the dashboard.

### Cloudflare Worker

Set in `scripts/cloudflare/process-email-trigger/wrangler.toml`:

```toml
[vars]
EMAIL_WEBHOOK_URL = "https://www.casalumakpg.com/api/webhooks/email"
```

Set the matching secret in Cloudflare:

```bash
pnpm cf:email:secret
```

The value must equal the app's `EMAIL_WEBHOOK_SECRET`.

You do not need to change `EMAIL_WEBHOOK_URL` when changing classification or side-effect modules. Keep it pointed at the same app route. The Worker is only the intake transport; classification, dedupe, Telegram behavior, Ledger/Notion updates, and future modules live in the app.

For deploys from a developer machine, either set `CLOUDFLARE_API_TOKEN` for non-interactive CI-style deploys or use Wrangler's browser OAuth flow (`pnpm dlx wrangler login`) and approve the login in Cloudflare. OAuth is fine for personal/local deploys; an API token is better for automation.

## Deploy/update Worker

```bash
pnpm cf:email:deploy
```

This uses `pnpm dlx wrangler@latest`, so Wrangler does not need to be installed in the repo.

If Wrangler asks you to log in, use the Cloudflare account that owns `casalumakpg.com` and the existing `process-email-trigger` Worker.

## Cloudflare dashboard setup

Already intended setup:

1. Email Routing enabled for `casalumakpg.com`.
2. Address/routing target: `automations@casalumakpg.com`.
3. Route action: send to Worker `process-email-trigger`.

If routing breaks, check Cloudflare Email Routing first, then Worker logs, then app webhook logs.

## Gmail forwarding setup

Create a Gmail filter for the receipt/email type and forward matching messages to:

```text
automations@casalumakpg.com
```

Gmail is a coarse filter only. The app webhook must remain the source of truth for filtering, dedupe, and automation decisions.

## Local workflow

Use local work for classifier and module changes. Keep the Cloudflare Worker URL pointed at production unless you specifically want live email routing to hit a preview/local tunnel.

1. Make pure classifier changes in `src/lib/server/email-automation/classifier.ts`; keep DB loading, persistence, Telegram, and side-effect changes in `src/lib/server/email-automation/index.ts`.
2. Use `/mgmt-dashboard/email-automation` to control automation, Financial Ledger writes, and Telegram notifications from Neon-backed runtime settings.
3. Run the direct smoke test against a local or preview app URL:

```bash
EMAIL_AUTOMATION_TEST_WEBHOOK_URL="http://localhost:5173/api/webhooks/email" \
  pnpm tsx scripts/live-test-email-automation.ts
```

The script posts a synthetic PromptPay success payload twice. The first response should have `duplicate: false`; the second should have `duplicate: true`. It also checks `email_events` using the local DB connection string when available.

For production smoke tests, the script requires explicit intent because a success payload can create a Ledger page if Ledger is enabled remotely:

```bash
pnpm tsx scripts/live-test-email-automation.ts --production --allow-ledger-risk
```

## Test procedure

1. Deploy the email-automation database migration before deploying the app.
2. Ensure app env has `EMAIL_WEBHOOK_SECRET` and the dedicated email-automation Telegram vars.
3. Ensure Worker has the same `EMAIL_WEBHOOK_SECRET` and a real `EMAIL_WEBHOOK_URL`.
4. Deploy Worker with `pnpm cf:email:deploy` only when Worker extraction/config changed. Classifier and Ledger/Notion module changes only require app deploy.
5. Forward an original representative email to `automations@casalumakpg.com`.
6. Confirm the Email automation dashboard shows the event/classification and Telegram receives an actionable result. A matching `Status ... (Approved)` email should be stored as ignored and should not notify.
7. Only then enable Ledger writes in `/mgmt-dashboard/email-automation` and verify a unique success email creates one Financial Ledger page.

For a pre-mail smoke test, post a normalized payload with a unique Message-ID to the production webhook from a machine where the secret is available. Keep Ledger creation disabled for this test:

```bash
curl -X POST "https://www.casalumakpg.com/api/webhooks/email" \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: $EMAIL_WEBHOOK_SECRET" \
  --data '{"receivedAt":"2026-07-09T10:00:00Z","from":"K BIZ <KBIZ@kasikornbank.com>","to":"automations@casalumakpg.com","subject":"Result of PromptPay Funds Transfer (Success)","messageId":"<email-automation-smoke-unique-id@example.test>","attachmentCount":0,"textBody":"Reference Number: PPFS260709TEST01 Amount (THB): 123.45"}'
```

The first response must have `duplicate: false`; re-running the exact same request must return `duplicate: true` and must not produce another Telegram notification.

## DB-backed classification rules

The `email_classification_rules` table is now active. On every webhook intake the app loads enabled rows ordered by `priority` then `id`, tries those rules first, and falls back to built-in defaults when no row matches. This keeps production safe if the table is empty.

Rule fields:

- `enabled`: disabled rows are ignored.
- `priority`: lower numbers match first.
- `sender_pattern`, `subject_pattern`: optional case-insensitive patterns. Plain text means "contains". Use `regex:<expression>` or `/expression/flags` only when a regex is really needed; invalid regexes fail closed and do not match.
- `body_patterns`: optional JSON. An array means all patterns must match the normalized text/html body. Use `{ "mode": "any", "patterns": ["statement", "e-document"] }` when any listed pattern is enough.
- `classification`: one of `expense`, `income`, `ignore`, `review`.
- `subtype`: stored on the event and used in Telegram labels.
- `handler_key`: stored in the classifier result for side-effect dispatch. It is intentionally generic so future non-Ledger handlers can be routed from the classifier result. Financial Ledger expense creation requires `handler_key='company_ledger_expense'` and remains gated by the Neon-backed `ledger_enabled` setting.
- `ledger_defaults`: reserved handler defaults for future Ledger dispatch refinements.
- `notify_policy`: `review_and_success` by default. Also supports `never`, `always`, `review_only`, and `success_only`.
- `dummy_input`: optional JSON sample email (`from`, `to`, `subject`, `textBody`, `messageId`, `attachmentCount`, `receivedAt`) used by the dashboard for per-rule Telegram previews and the "Send test" button.

For DB-backed `expense`/`income` rules, the classifier still extracts transaction reference and amount from the subject/body. Missing reference or amount keeps the event in `review` instead of `ready`.

### Default seed rules

Migration `drizzle/0005_email_classification_rules_dummy_input.sql` adds the `dummy_input` column and seeds eight default rules that mirror the built-in matchers (approved shadow, bill payment, other-bank transfer, PromptPay transfer, K SHOP settlement failure, merchant fee failure, security/admin, statement/e-document). The seed only runs when the table is empty, so it is safe to re-apply and never clobbers manually-added rules. The seeded definitions live in `src/lib/server/email-automation/seed-rules.ts`; keep that file in sync with the migration INSERT.

### Deprecation intention for built-in matchers

The specific matchers in `builtInClassify` (`classifier.ts`) are now mirrored as DB rules. DB rules run first, so those built-in matchers are effectively dead code once the seed is applied. The plan is to remove the duplicated matchers from `builtInClassify` and keep only the final `unrecognized_*` catch-all fallback, so all editable classification logic lives in the DB. The deprecation note in `classifier.ts` and the `deprecated` flag on the built-in classifier registry (`notifications/builtin-dummies.ts`) track this.

## Notification templates

Telegram messages are rendered by modular, code-backed templates in `src/lib/server/email-automation/notifications/`. Templates stay in code (not the DB) so changes are version-controlled and tested. Each notification kind has its own template function in `templates.ts`:

- `expenseRecorded` - a Ledger page was created
- `actionReady` - classified and ready, but side effects are still disabled
- `reviewNeeded` - needs a human decision
- `ignored` - intentionally quiet (shown in dashboard previews only; production never sends these because `notify=false`)

`render.ts` selects the template from the classification outcome. `send.ts` publishes to Telegram using the same publisher as production, and `sendEmailAutomationTestNotification` wraps the body with a visible `🧪 TEST` banner for dashboard Send-test buttons. `builtin-dummies.ts` holds the sample inputs used for built-in classifier previews and tests.

## Dashboard rule management

The Email automation dashboard lets you:

- Toggle DB rules on/off (enable/disable) without touching SQL.
- Reorder rules with up/down buttons, which swap priorities so DB rules match in the intended order.
- See a per-rule Telegram preview rendered with the exact same code as production, using each rule's `dummy_input`.
- Send a real demo message to the Telegram group (`EMAIL_AUTOMATION_TELEGRAM_CHAT_ID`) for any DB rule or built-in classifier, wrapped with a `🧪 TEST` banner so it is clearly not a live automation message.

Send test posts to the same chat as production. If `TELEGRAM_BOT_TOKEN` or `EMAIL_AUTOMATION_TELEGRAM_CHAT_ID` are missing, the action reports `not_configured` instead of sending.

## Automation dispatcher

Current shape:

1. Normalize email metadata and parsed body.
2. Dedupe by a stable hash of `Message-ID`, sender, recipient, subject, and body preview.
3. Match enabled DB rules, then built-in fallback rules.
4. Dispatch to automation handlers; confirmed expenses are handled by the Financial Ledger module only when `email_automation_settings.ledger_enabled=true`.
5. Store result and notify Telegram only for success/review/failure depending on the rule.

Do not put heavy parsing/OCR or business logic in the Worker.
