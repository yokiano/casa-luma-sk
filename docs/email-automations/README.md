# Email automations

## Current goal

Use Cloudflare Email Routing as the email interceptor, then forward matched emails into the app for automation dispatch.

Initial sanity check: every email received by the Cloudflare Worker should produce a Telegram notification via the existing app alert plumbing.

## Architecture

```text
Gmail filter / direct sender
  -> automations@casalumakpg.com
  -> Cloudflare Email Routing
  -> Worker: process-email-trigger
  -> POST /api/webhooks/email
  -> Telegram notification + incident row
  -> future automation dispatcher
```

Keep the Worker thin. It should only extract safe email metadata/body preview and POST to the SvelteKit app. Business rules, dedupe, Notion/DB writes, Telegram formatting, and future automation dispatch should live in this repo.

## Repo locations

- Cloudflare Worker source: `scripts/cloudflare/process-email-trigger/src/index.ts`
- Worker config: `scripts/cloudflare/process-email-trigger/wrangler.toml`
- App webhook: `src/routes/api/webhooks/email/+server.ts`
- This documentation: `docs/email-automations/README.md`

## Required secrets/config

### App / hosting environment

Set this wherever the SvelteKit app runs:

- `EMAIL_WEBHOOK_SECRET` — shared secret checked by `/api/webhooks/email`
- Existing Telegram env must also be configured:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`
  - optional `TELEGRAM_MESSAGE_THREAD_ID`

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

## Test procedure

1. Ensure app env has `EMAIL_WEBHOOK_SECRET` and Telegram vars.
2. Ensure Worker has the same `EMAIL_WEBHOOK_SECRET` and a real `EMAIL_WEBHOOK_URL`.
3. Deploy Worker with `pnpm cf:email:deploy`.
4. Send a test email to `automations@casalumakpg.com`.
5. Expect Telegram message titled `📬 Email automation trigger`.
6. Check incident persistence for source `email-webhook`, code `EMAIL_RECEIVED`.

## Future automation dispatcher

Planned shape:

1. Normalize email metadata and parsed body.
2. Dedupe by `Message-ID` or a stable hash of sender/subject/date/body.
3. Match against explicit rules, for example sender + subject + body keywords.
4. Dispatch to automation handlers.
5. Store result and notify Telegram only for success/review/failure depending on the rule.

Do not put heavy parsing/OCR or business logic in the Worker.
