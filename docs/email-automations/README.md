# Email automations

## Current goal

Use Cloudflare Email Routing as the email interceptor, then forward matched emails into the app for automation dispatch.

The app records every received email as an email-automation event, classifies it with enabled database rules first, falls back to built-in safe defaults, and only notifies Telegram for actionable success/review outcomes. Email events are not incidents. Telegram messages should stay human-first: clear title, short type, then label/value blocks on separate lines instead of dense `Label: value` rows.

## Current hardening status

The durable-action foundation is implemented in migration `0006_email_automation_hardening.sql`. A separate Phase 1 attention-review table is in migration `0007_email_attention_reviews.sql`. After explicit production-target confirmation and migration approval on 2026-07-14, `pnpm db:migrate` applied the journal through `0007`; read-only production checks found 9 eligible historical review/failed events, 9 review rows, zero missing/orphan/duplicate links, and zero action links. Isolated PostgreSQL concurrency validation remains outstanding before unattended processing or broader canary confidence.

### Durable processing model

```text
Webhook -> immutable email event + decision snapshot (one DB transaction)
        -> durable action intent (unique handler/idempotency key)
        -> independent Telegram outbox intent
        -> bounded processor claim -> external action or notification
        -> append-only attempt/audit history
```

An action and a Telegram notification are separate work items. Telegram failure never re-runs the external action, and notifications for events with a still-pending action are deferred so Telegram does not consume the only message before the Ledger outcome is known. Processor completion is fenced by the current lease token, so an expired worker cannot overwrite a newer claim. Semantic duplicates link each event to the existing durable action instead of leaving an orphan queued state. Automatic scheduling is intentionally not enabled yet.

### Human-facing state contract

The dashboard and Telegram messages use four labeled facts: **What happened**, **Action taken**, **Current state**, and **Next step**. A queued or failed action is never described as completed. Open `/mgmt-dashboard/email-automation/<eventId>` for the durable action, attempt, parser-completeness, and report-only authenticity evidence.

### MIME fail-safe boundary

The Worker now sends bounded parser metadata. Multipart, malformed/non-text messages, decode failures, unsupported transfer encodings, truncated previews, and messages with attachments are marked incomplete and route otherwise-ready financial emails to human review. The Worker still is not a general MIME parser: attachment bytes are neither read nor retained. A later parser replacement requires Cloudflare runtime validation and a storage/privacy decision.

### Phase 1 email-attention review workflow

Migration `0007_email_attention_reviews.sql` adds a dedicated one-record-per-event table for classifier review and terminal action failure. It is separate from `email_automation_actions` and `email_notification_outbox`. The migration backfills existing `review` and terminal `failed` events with bounded evidence and a historical diagnostics note. New review events are inserted in the same intake transaction, and terminal action failures or safety blocks create a record without creating a second action or Telegram queue item.

The dashboard at `/mgmt-dashboard/email-automation` has a separate open review queue. Event detail pages let a manager save a summary and analysis, record manual provenance, copy or download a provider-neutral Markdown review bundle, mark the review done, and reopen a completed review. The bundle contains bounded saved sender, subject, body-preview, and MIME evidence, deterministic database-rule evaluations and final classifier output, plus explicit future-provider fields. Email content and notes are treated as untrusted text. No OpenRouter, GLM, or automatic LLM processing is used.

A new review uses the existing durable Telegram outbox when the notification policy and settings allow it. The message includes a direct event dashboard link when the optional `EMAIL_AUTOMATION_PUBLIC_URL` is set, with `https://www.casalumakpg.com` as the current fallback. Saving or completing a review does not claim, retry, reconcile, cancel, or otherwise mutate external-action or Telegram work.

### Manager command authorization

Every email-automation remote command performs a server-side manager-role check at the command boundary, including reads, test sends, settings, rule mutations, retry, and reconciliation. Login now issues a server-signed, seven-day role session derived from existing server-only login password material. Literal legacy cookies such as `manager` are rejected and require a new login. This proves the server issued the role, but it does not identify an individual person; do not treat the audit actor as personal attribution.

### Operations health

The dashboard reports live durable queue health: oldest due action/notification, stale leases, terminal failed work, and parser warnings from the last 24 hours. Each warning includes exact remediation that keeps Telegram retry separate from external actions and states whether Ledger canary gates are active. Scheduler heartbeat is explicitly shown as **not configured**; event timestamps are not used as a misleading proxy. The recommended scheduler is Vercel Cron every five minutes. Cadence means the invocation interval. A private `CRON_SECRET` bearer token prevents arbitrary public callers from triggering the bounded processor. A real heartbeat requires the authenticated endpoint, expected cadence, and durable run records including idle runs. Scheduling retries cannot bypass Ledger canary gates.

### Sender authenticity

Events currently record `unverified` authenticity state. No SPF/DKIM/DMARC enforcement or new HMAC transport secret is introduced in this pass. **Company Ledger writes are now available only as a narrow canary**, and only when all gates pass: the dashboard Ledger switch is on, `EMAIL_AUTOMATION_LEDGER_CANARY_ENABLED=true` is present in the deployment environment, the dashboard settings name exact visible sender emails or domains, MIME completeness is `complete`, a transaction reference and THB amount are extracted, and the amount is at or below the dashboard canary amount limit. Do not assume the visible `From` address proves sender authenticity; this is a temporary operational compromise until real transport-authentication evidence is enforced.

## Architecture

The current production deployment runs the SvelteKit app on Vercel at `www.casalumakpg.com`, backed by PostgreSQL/Neon. Cloudflare hosts only the email-routing Worker, which forwards bounded intake data to the Vercel webhook. This makes Vercel Cron the simplest future scheduler because the processor and database access stay in the app deployment; Cloudflare Cron would add a second invocation path and secret lifecycle without moving the processor to the Worker.

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
- Dashboard data + mutations: `src/lib/server/email-automation/dashboard.ts`
- Review bundle format: `src/lib/server/email-automation/review-bundle.ts`
- Runtime settings loader: `src/lib/server/email-automation/settings.ts`
- Remote functions (dashboard commands): `src/lib/email-automation.remote.ts`
- Modular Telegram templates: `src/lib/server/email-automation/notifications/` (`templates.ts`, `render.ts`, `send.ts`, `helpers.ts`, `builtin-dummies.ts`)
- Dashboard: `/mgmt-dashboard/email-automation` with a separate email-attention review queue, collapsible cards, compact classifier rule table with expandable rows (enable/disable, reorder, preview, Send test), built-in classifier previews, subtype outcomes, handler activity, recent events, and an in-product safety-gap/implementation roadmap. Event detail pages provide bounded review evidence, Markdown bundle copy/download, manual notes, and done/reopen controls. The roadmap states what exists, what is missing, external gates, and the next concrete action so operators do not need to remember this document.
- Email automation scripts: `scripts/email-automations/`
  - Smoke test: `scripts/email-automations/live-test-email-automation.ts`
  - Local Gmail reader: `scripts/email-automations/gmail-read-recent.ts`
  - Telegram test-group lookup: `scripts/email-automations/telegram-list-chat-ids.ts`
  - Real EML template runner: `scripts/email-automations/test-email-automation-eml-telegram.ts`
- This documentation: `docs/email-automations/README.md`

## Required secrets/config

### App / hosting environment

Set this wherever the SvelteKit app runs:

- `EMAIL_WEBHOOK_SECRET`: shared secret checked by `/api/webhooks/email`
- Email automation Telegram env must also be configured:
  - `TELEGRAM_BOT_TOKEN`
  - `EMAIL_AUTOMATION_TELEGRAM_CHAT_ID`
  - optional `EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID`
  - local testing only: `EMAIL_AUTOMATION_TELEGRAM_TEST_CHAT_ID` for a dedicated test group; the EML test runner refuses to use the production chat ID
  - optional `EMAIL_AUTOMATION_PUBLIC_URL` for absolute links in review Telegram messages
  - `EMAIL_AUTOMATION_LEDGER_ENABLED` is legacy only and is not sufficient for this hardening slice.
  - `EMAIL_AUTOMATION_LEDGER_CANARY_ENABLED=true`: the only deployment-level opt-in for the guarded Company Ledger canary.
  - Normal runtime control lives in Neon `email_automation_settings` and is editable from the dashboard, including the Company Ledger switch, exact visible-sender allowlist, and canary amount ceiling.

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

## Local Gmail read access for testing

The local Pi/WSL workflow can read recent messages directly from `casalumakpg@gmail.com` through the Gmail API. This is separate from Cloudflare Email Routing and does not change the production intake path.

The reader uses the OAuth scope `https://www.googleapis.com/auth/gmail.readonly`. It can search any message in the account, including archived mail and, with `in:anywhere`, Spam and Trash. It cannot send, delete, move, label, or otherwise modify messages. No Gmail label is required.

Keep this access local. Do not put the OAuth client JSON, refresh token, or Gmail settings in Vercel or Cloudflare deployment secrets. The client JSON is stored under the ignored `.secrets/` directory, and the refresh token is stored outside the repository with file mode `600`.

### One-time Google Cloud setup

1. Create or select a Google Cloud project.
2. Enable **Gmail API** under **APIs & Services -> Library**.
3. Under **Google Auth Platform -> Branding** (or **APIs & Services -> OAuth consent screen**), create the consent screen for an **External** app and leave it in **Testing** status.
4. Under **Data Access**, add only `https://www.googleapis.com/auth/gmail.readonly`.
5. Under **Audience**, add `casalumakpg@gmail.com` as a test user.
6. Under **Google Auth Platform -> Clients** (or **APIs & Services -> Credentials**), create an OAuth client ID with application type **Desktop app**.
7. Download the client JSON outside version control. Do not publish the OAuth app or add broader Gmail scopes.

### Local configuration

Add path-only settings to `.env.local`; keep the client JSON and token contents out of chat and Git:

```dotenv
GMAIL_OAUTH_CLIENT_FILE=/absolute/path/to/.secrets/client-secret.json
GMAIL_OAUTH_TOKEN_FILE=/home/<user>/.config/casa-luma/gmail-token.json
GMAIL_QUERY="in:anywhere newer_than:30d"
GMAIL_MAX_MESSAGES=20
```

The first reader run opens a local OAuth callback flow and saves the refresh token to `GMAIL_OAUTH_TOKEN_FILE`. If the browser reports **Authorization complete**, the local process has received the callback and can continue.

Run a metadata/body-read verification without printing email contents:

```bash
pnpm exec tsx scripts/email-automations/gmail-read-recent.ts --limit 1
```

Search arbitrary messages with Gmail search syntax:

```bash
pnpm exec tsx scripts/email-automations/gmail-read-recent.ts \
  --query 'in:anywhere subject:"PromptPay Funds Transfer" newer_than:90d' \
  --limit 5
```

Download matching raw messages for local parser testing only when explicitly needed:

```bash
pnpm exec tsx scripts/email-automations/gmail-read-recent.ts --limit 5 --download
```

Downloads are written outside the repository under `~/.cache/casa-luma/gmail` with file mode `600` by default. For durable local email-automation fixtures, use the ignored repository-local directory `.secrets/email-automation/fixtures/`:

```bash
GMAIL_DOWNLOAD_DIR=.secrets/email-automation/fixtures \
  pnpm exec tsx scripts/email-automations/gmail-read-recent.ts \
  --query 'in:anywhere from:(kasikornbank.com) subject:"Result of PromptPay Funds Transfer (Success)"' \
  --limit 5 --download
```

The fixture directory is ignored by Git because raw emails can contain financial and personal information. Keep its files mode `600`. The local manifest at `.secrets/email-automation/fixtures/manifest.json` records the selected representative files and known gaps without copying email contents into the repository. The default query remains intentionally bounded to recent mail, but the command supports any explicit Gmail query.

## Local workflow

Use local work for classifier and module changes. Keep the Cloudflare Worker URL pointed at production unless you specifically want live email routing to hit a preview/local tunnel.

1. Make pure classifier changes in `src/lib/server/email-automation/classifier.ts`; keep DB loading, persistence, Telegram, and side-effect changes in `src/lib/server/email-automation/index.ts`.
2. Use `/mgmt-dashboard/email-automation` as the operational source of truth for general automation, Telegram notifications, and the Company Ledger canary. The Ledger switch can only enable writes when the deployment canary flag is set and the dashboard sender allowlist/amount limit are configured.
3. Run the direct smoke test against a local or preview app URL:

```bash
EMAIL_AUTOMATION_TEST_WEBHOOK_URL="http://localhost:5173/api/webhooks/email" \
  pnpm tsx scripts/email-automations/live-test-email-automation.ts
```

The script posts a synthetic PromptPay success payload twice. The first response should have `duplicate: false`; the second should have `duplicate: true`. It also checks `email_events` using the local DB connection string when available.

For production smoke tests, the script still requires explicit intent. Keep the explicit flag as a guard because a correctly configured canary can create a real Ledger page for allowed senders:

```bash
pnpm tsx scripts/email-automations/live-test-email-automation.ts --production --allow-ledger-risk
```

## Test procedure

1. Deploy the email-automation database migration before deploying the app.
2. Ensure app env has `EMAIL_WEBHOOK_SECRET` and the dedicated email-automation Telegram vars.
3. Ensure Worker has the same `EMAIL_WEBHOOK_SECRET` and a real `EMAIL_WEBHOOK_URL`.
4. Deploy Worker with `pnpm cf:email:deploy` only when Worker extraction/config changed. Classifier and Ledger/Notion module changes only require app deploy.
5. Forward an original representative email to `automations@casalumakpg.com`.
6. Confirm the Email automation dashboard shows the event/classification and Telegram receives an actionable result. A matching `Status ... (Approved)` email should be stored as ignored and should not notify.
7. For the first live canary, keep the dashboard Ledger amount limit conservative, enable the dashboard Ledger switch only after the deployment canary env is confirmed, forward one representative low-risk transaction email, and verify exactly one Financial Ledger row is created or reconciled. Then turn the dashboard switch off if anything looks unclear.

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
- `handler_key`: stored in the classifier result for typed dispatch. Non-Ledger handlers are not accidentally gated by the legacy Ledger toggle. `company_ledger_expense` maps to the current Financial Ledger SDK/database, which is the code path for the Company Ledger canary, and runs only when all canary gates pass.
- `ledger_defaults`: reserved handler defaults for future Ledger dispatch refinements.
- `notify_policy`: `review_and_success` by default. Also supports `never`, `always`, `review_only`, and `success_only`.
- `dummy_input`: optional JSON sample email (`from`, `to`, `subject`, `textBody`, `messageId`, `attachmentCount`, `receivedAt`) used by the dashboard for per-rule Telegram previews and the "Send test" button.

For DB-backed `expense`/`income` rules, the classifier extracts the transaction reference, amount, and K BIZ note from the subject/body. It accepts both Thai and English labels, including `หมายเลขอ้างอิง` / `Reference Number` and `บันทึกช่วยจำ` or `บันทึกของท่าน` / `Your Note` / `Memo`. Missing reference or amount keeps the event in `review` instead of `ready`.

### K BIZ Ledger field mapping

For a successful K BIZ expense email, the extracted note becomes the Financial Ledger `Description` title, with the email subject as a fallback. The extracted Thai or English reference becomes `Reference Number`. For example, `บันทึกช่วยจำ: Makto` or `Your Note: Makto` creates a Ledger description of `Makto`, and `หมายเลขอ้างอิง: BILS260715313032359` creates the matching reference.

The email flow uses the same Notion `Expense Scan Rules` database and recipient-match behavior as the expense OCR screen: lowercase the note, remove whitespace, and use the first rule whose `Recipient Match` is contained in that value. Its `Category Name`, `Department Name`, and first `Auto-Supplier` relation fill missing Ledger defaults while explicit email-rule defaults remain authoritative. A missing match, missing category/department, invalid Ledger category/department value, or unavailable rules lookup routes the event to review before any external write.

Each created Ledger page includes a durable trace in `Notes`, for example `Neon processing ID: email_event=123, action=456`. `email_event` links to `email_events.id`, and `action` links to `email_automation_actions.id`; both can be followed from the email-automation dashboard and event detail.

### Default seed rules

Migration `drizzle/0005_email_classification_rules_dummy_input.sql` adds the `dummy_input` column and seeds eight default rules that mirror the built-in matchers (approved shadow, bill payment, other-bank transfer, PromptPay transfer, K SHOP settlement failure, merchant fee failure, security/admin, statement/e-document). The seed only runs when the table is empty, so it is safe to re-apply and never clobbers manually-added rules. The seeded definitions live in `src/lib/server/email-automation/seed-rules.ts`; keep that file in sync with the migration INSERT.

### Deprecation intention for built-in matchers

The specific matchers in `builtInClassify` (`classifier.ts`) are now mirrored as DB rules. DB rules run first, so those built-in matchers are effectively dead code once the seed is applied. The plan is to remove the duplicated matchers from `builtInClassify` and keep only the final `unrecognized_*` catch-all fallback, so all editable classification logic lives in the DB. The deprecation note in `classifier.ts` and the `deprecated` flag on the built-in classifier registry (`notifications/builtin-dummies.ts`) track this.

## Notification templates

Telegram messages are rendered by modular, code-backed templates in `src/lib/server/email-automation/notifications/`. Templates stay in code (not the DB) so changes are version-controlled and tested. Each notification kind has its own template function in `templates.ts`:

- `expenseRecorded` - a Ledger page was created
- `actionReady` - classified and ready, but side effects are still disabled
- `reviewNeeded` - needs a human decision; new review records link to the event dashboard when configured
- `ignored` - intentionally quiet (shown in dashboard previews only; production never sends these because `notify=false`)

`render.ts` selects the template from the classification outcome. `send.ts` publishes to Telegram using the same publisher as production, and `sendEmailAutomationTestNotification` wraps the body with a visible `🧪 TEST` banner for dashboard Send-test buttons. `builtin-dummies.ts` holds the sample inputs used for built-in classifier previews and tests.

### Notification information and ordering

The opening line puts the meaningful state first, for example `Expense email - recorded`, `Expense email - ready`, or `Email - review needed`. Monetary facts follow immediately so Telegram preview truncation still exposes the amount and available extracted details.

- **Expense:** subtype, amount and currency when extracted, transaction reference, K BIZ memo as `Description`, `Counterparty` when a classification supplies it, and `Category` when runtime Expense Scan rule matching supplied it. Department is retained for Ledger dispatch but is not currently shown in Telegram. The current classifier does not populate `counterparty`.
- **Income:** the same optional amount, currency, description, reference, and category fields are supported by the renderer, but no income rule is seeded yet.
- **Review and fallback:** subtype and review reason are shown, with any amount, reference, description, or category that was safely extracted. No external action is claimed.
- **Ignored:** the subtype and optional extracted facts are available in previews only. Production notification policy remains quiet.
- **Durable outcomes:** action status controls the title and wording. A recorded title is used only for succeeded or reconciled Ledger work. Queued, retry, failed, and safety-blocked states are not described as completed. Successful Ledger outcomes include an HTTPS Notion page link when a valid page ID is available, and every durable notification includes the internal event dashboard link.

The event dashboard retains a bounded readable body preview of up to 4,000 characters for new events, in addition to classification and MIME evidence. The Worker currently supplies a single text preview and does not reliably distinguish forwarded or quoted chains from the original body. A truncated or incomplete MIME preview is labeled as such; raw MIME and attachments are not retained.

### Gmail message links

Notifications do not currently link directly to the original Gmail message. The intake pipeline receives the RFC 822 `Message-ID`, not Gmail's account-specific internal message ID. A Gmail `rfc822msgid:` search URL is not a reliable direct-message link because forwarding, indexing, account context, and message-ID preservation can vary. It is therefore not emitted as a link or exposed as a safe shortcut. Durable review notifications can link to the app's event dashboard when `EMAIL_AUTOMATION_PUBLIC_URL` is configured; that link is the reliable review path and does not claim to open Gmail.

### Dedicated Telegram test group and real EML files

Use a separate Telegram group for local notification tests. After adding the bot, send a message that mentions it, then list group IDs without printing the bot token:

```bash
pnpm telegram:chat-ids
```

Save the selected ID as `EMAIL_AUTOMATION_TELEGRAM_TEST_CHAT_ID` in the local `.env`. Preview a real EML classification without sending anything:

```bash
pnpm email:test-eml temp/example.eml
```

Send the rendered message only to the dedicated test group:

```bash
pnpm email:test-eml temp/example.eml --send
```

The command uses the Worker body-preview parser, seed classification rules, and production notification renderer. It does not create a database event or Ledger record. Add `--ledger-enabled` only to simulate the successful Ledger notification template; this still creates no external Ledger side effect. The runner has no fallback to `EMAIL_AUTOMATION_TELEGRAM_CHAT_ID` and refuses to send when the test and production chat IDs are equal.

The current local fixture set covers expense, review, ignored, and no-specific-rule fallback emails. There is no seeded `income` classifier rule. K SHOP settlement-failure and merchant-fee-failure emails were not found in the mailbox search, so those remain gaps until representative messages are available.

## Dashboard rule management

The Email automation dashboard uses SvelteKit remote functions (`src/lib/email-automation.remote.ts`) for all mutations, so toggling, reordering, saving settings, and sending tests happen without a page refresh. Toast notifications (`svelte-sonner`, mounted in the mgmt-dashboard layout) confirm each action. All cards are collapsible (`<details>`), and the classifier rules section is a compact data table with expandable rows.

The dashboard lets you:

- Toggle DB rules on/off (enable/disable) without touching SQL.
- Reorder rules with up/down buttons, which swap priorities so DB rules match in the intended order.
- See a per-rule Telegram preview rendered with the exact same code as production, using each rule's `dummy_input`. Previews are rendered with `{@html}` so the HTML formatting displays correctly.
- Send a real demo message to the Telegram group (`EMAIL_AUTOMATION_TELEGRAM_CHAT_ID`) for any DB rule or built-in classifier, wrapped with a `🧪 TEST` banner so it is clearly not a live automation message.
- Hide ignored email events behind a "Show ignored" toggle at the bottom of the recent events section.

Send test posts to the same chat as production. DB-rule and built-in previews run the same final MIME and Ledger canary policy as intake, so a Ledger-looking sample truthfully shows whether it is blocked or canary-eligible. No actual side effects (Ledger pages, DB events) are created by the test. If `TELEGRAM_BOT_TOKEN` or `EMAIL_AUTOMATION_TELEGRAM_CHAT_ID` are missing, the action reports `not_configured` instead of sending.

## Migration and rollout for this hardening slice

> **Deferred operations note:** an isolated PostgreSQL test can later exercise overlapping processors, lease expiry, duplicate linking, review backfill, and action/outbox projection. It is not required for the current manual Phase 1 review workflow. Complete it before enabling unattended processing or broadening the Ledger canary.

### Isolated Neon test database

The repo has normal database connection env names, but no Neon API credential or project ID variable is currently present by name. `neonctl` is not installed locally, though `pnpm dlx neonctl` can run when credentials are supplied. To let an agent create a disposable Neon branch/database without exposing secret values, provide:

- `NEON_API_KEY` or equivalent Neon API token with project/branch creation permission.
- Neon project ID, unless the API key may list projects and the operator confirms which project may be branched.
- Confirmation whether the branch should come from the existing configured project or from a separate test-only project.

Do not run destructive concurrency experiments against the current configured remote database.

1. `0007` is applied to the approved production database and its review backfill/queue-isolation invariants were checked read-only. As a future operations follow-up, validate the durable processor on an isolated PostgreSQL database; do not use the shared configured database for destructive concurrency experiments.
2. Deploy the app with `EMAIL_AUTOMATION_LEDGER_CANARY_ENABLED=true`; keep the strict sender allowlist and conservative amount limit in dashboard settings. Leave the dashboard Ledger switch off until the deploy is verified unless deliberately running the first canary.
3. Test a review-only and duplicate webhook payload first. Then enable the dashboard Ledger switch for one low-risk allowed transaction email and verify exactly one Ledger action/page.
4. Verify a failed Telegram delivery changes only the outbox/notification state and does not create a second Ledger action.
5. Configure an explicit scheduler before relying on automatic retries. Until then, use manager retry/reconcile actions only; they obey the same Ledger canary gates.

## Automation dispatcher

Current shape:

1. Normalize email metadata and parsed body.
2. Dedupe by a stable hash of `Message-ID`, sender, recipient, subject, and body preview.
3. Match enabled DB rules, then built-in fallback rules, while saving deterministic rule diagnostics.
4. Create a separate attention-review record for review classifications and terminal action failures. The record stores bounded evidence and does not claim any work queue.
5. Dispatch eligible handlers. The Company Ledger handler runs only when dashboard switch, deployment canary flag, dashboard sender allowlist, MIME, amount, reference, and idempotency canary gates all pass.
6. Store result and notify Telegram only for success/review/failure depending on the rule. Review notifications use the same outbox and can include the event dashboard link.

Do not put heavy parsing/OCR or business logic in the Worker.
