# Email automations

## Current goal

Use Cloudflare Email Routing as the email interceptor, then forward matched emails into the app for automation dispatch.

The app records every received email as an email-automation event, classifies it, and only notifies Telegram for actionable success/review outcomes. Email events are not incidents. Telegram messages should stay human-first: clear title, short type, then label/value blocks on separate lines instead of dense `Label: value` rows.

## Architecture

```text
Gmail filter / direct sender
  -> automations@casalumakpg.com
  -> Cloudflare Email Routing
  -> Worker: process-email-trigger
  -> POST /api/webhooks/email
  -> durable email event + classification
  -> module handler (Ledger for confirmed expenses)
  -> readable Telegram notification when needed
```

Keep the Worker thin. It should only extract safe email metadata/body preview and POST to the SvelteKit app. Business rules, dedupe, Notion/DB writes, Telegram formatting, and future automation dispatch should live in this repo.

## Repo locations

- Cloudflare Worker source: `scripts/cloudflare/process-email-trigger/src/index.ts`
- Worker config: `scripts/cloudflare/process-email-trigger/wrangler.toml`
- App webhook: `src/routes/api/webhooks/email/+server.ts`
- Email automation service/classifier: `src/lib/server/email-automation/index.ts`
- Dashboard: `/mgmt-dashboard/email-automation`
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
  - `EMAIL_AUTOMATION_LEDGER_ENABLED=false` initially; set to `true` only after the parser/notification proof has been reviewed.

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

1. Make classifier or side-effect changes in `src/lib/server/email-automation/index.ts`.
2. Keep the Ledger side effect disabled while testing notifications/parser behavior: `EMAIL_AUTOMATION_LEDGER_ENABLED=false` or unset.
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
7. Only then set `EMAIL_AUTOMATION_LEDGER_ENABLED=true` and verify a unique success email creates one Company Ledger page.

For a pre-mail smoke test, post a normalized payload with a unique Message-ID to the production webhook from a machine where the secret is available. Keep Ledger creation disabled for this test:

```bash
curl -X POST "https://www.casalumakpg.com/api/webhooks/email" \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: $EMAIL_WEBHOOK_SECRET" \
  --data '{"receivedAt":"2026-07-09T10:00:00Z","from":"K BIZ <KBIZ@kasikornbank.com>","to":"automations@casalumakpg.com","subject":"Result of PromptPay Funds Transfer (Success)","messageId":"<email-automation-smoke-unique-id@example.test>","attachmentCount":0,"textBody":"Reference Number: PPFS260709TEST01 Amount (THB): 123.45"}'
```

The first response must have `duplicate: false`; re-running the exact same request must return `duplicate: true` and must not produce another Telegram notification.

## Automation dispatcher

Planned shape:

1. Normalize email metadata and parsed body.
2. Dedupe by `Message-ID` or a stable hash of sender/subject/date/body.
3. Match against explicit rules, for example sender + subject + body keywords.
4. Dispatch to automation handlers; confirmed expenses are handled by the Company Ledger module.
5. Store result and notify Telegram only for success/review/failure depending on the rule.

Do not put heavy parsing/OCR or business logic in the Worker.
