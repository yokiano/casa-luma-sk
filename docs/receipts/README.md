# Receipts module

The receipts system has three layers:

1. Loyverse webhook ingestion into Neon/Postgres.
2. Receipt validation and incident/Telegram alerting.
3. Receipt query and analytics APIs for the receipts tool.

## Main source files

- Webhook route: `src/routes/api/webhooks/receipt/+server.ts`
- Database entrypoint: `src/lib/server/db/ingest-receipt-webhook.ts`
- Core ingestion: `src/lib/server/db/ingest-receipt-core.ts`
- Database client/schema: `src/lib/server/db/client.ts`, `src/lib/server/db/schema.ts`
- Query API for Svelte remote functions: `src/lib/receipts.remote.ts`
- Receipt DB queries: `src/lib/server/db/receipt-queries.ts`
- Receipt analytics: `src/lib/server/db/receipt-analytics.ts`
- Validation suite: `src/lib/receipts/validation/`
- Tool-specific receipt analysis helpers: `src/lib/receipts/receipt-tools.ts`
- Shared receipt types: `src/lib/receipts/types.ts`
- Incident reporting: `src/lib/server/incidents/`

## End-to-end flow

```text
Loyverse webhook
  -> POST /api/webhooks/receipt
  -> optional x-webhook-token check against LOYVERSE_WEBHOOK_SECRET
  -> normalize single receipt or receipt batch
  -> ingestReceiptWebhook(...)
  -> insert webhook_events dedupe record
  -> upsert receipts + child tables in Neon
  -> run receipt validation suite for processed receipts
  -> report incidents and send Telegram for critical incidents
  -> receipts tool calls getReceipts/getReceiptAnalytics remote functions
  -> receipt queries/analytics read from Neon
```

## Webhook payload shapes

`src/routes/api/webhooks/receipt/+server.ts` accepts two shapes after the shared top-level metadata is present:

```ts
{
  merchant_id: string;
  type: string;
  created_at: string;
  items: { receipt_number: string; ... };
}
```

or a batch shape:

```ts
{
  merchant_id: string;
  type: string;
  created_at: string;
  receipts: Array<{ receipt_number: string; ... }>;
}
```

Invalid payload shapes are acknowledged with HTTP 200 and status `ignored_invalid_payload`, after reporting a warning incident. Batches with no valid receipt-like records are acknowledged as `ignored_no_valid_receipts`.

## Webhook auth

If `LOYVERSE_WEBHOOK_SECRET` is set, the route requires:

```http
x-webhook-token: <LOYVERSE_WEBHOOK_SECRET>
```

Missing or mismatched token returns HTTP 401.

## Processing statuses

`ingestReceiptWebhookWithDb` returns:

- `processed` — event was new and receipt tables were updated.
- `duplicate` — `webhook_events.dedupe_key` already exists.
- `stale` — event was new, but the receipt already has a later `updated_from_event_at`; the event is marked processed and receipt tables are not overwritten.

The route returns `processed_batch` when multiple receipts were accepted in one webhook request.

## Related docs

- `docs/receipts/ingestion.md`
- `docs/receipts/validation-and-alerts.md`
- `docs/receipts/query-and-analytics.md`
- `docs/neon/README.md`
- `docs/neon/schema.md`
