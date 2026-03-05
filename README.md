# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Project docs

- Loyverse receipt data foundation plan: `docs/loyverse/receipt-data-foundation-plan.md`
- Loyverse receipt validation engine: `docs/loyverse/receipt-validation-engine.md`

## Local Postgres for webhooks

```sh
docker compose up -d postgres
pnpm db:migrate
```

Set local environment variables:

```sh
DATABASE_URL=postgres://app:app@localhost:5432/casa_luma
# Optional header guard for webhook endpoint
LOYVERSE_WEBHOOK_SECRET=
# Optional Telegram alerts for severe incidents
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_MESSAGE_THREAD_ID=
TELEGRAM_ALERT_TIMEOUT_MS=3000
INCIDENT_REPORT_BASE_URL=http://localhost:5174
# Set to 1 for temporary forced validation alert testing
RECEIPT_VALIDATION_FORCE_FAIL=0
```

Webhook endpoint:

- `POST /api/webhooks/receipt`
- optional header when secret is set: `x-webhook-token`

Receipt webhook payload shape supports either:

- single receipt in `items`
- batch receipts in `receipts[]`

Severe webhook incidents are persisted to `reported_errors` and sent to Telegram when configured.
If `INCIDENT_REPORT_BASE_URL` is set, Telegram incident alerts include a direct link to `/tools/incidents/:id`.
