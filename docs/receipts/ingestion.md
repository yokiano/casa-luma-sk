# Receipt ingestion

Source files:

- `src/routes/api/webhooks/receipt/+server.ts`
- `src/lib/server/db/ingest-receipt-webhook.ts`
- `src/lib/server/db/ingest-receipt-core.ts`
- `src/lib/server/receipts/process-receipt-webhook.ts`
- `src/lib/server/receipts/replay-receipt-webhook.ts`
- `src/lib/server/db/schema.ts`

## Webhook route responsibilities

`POST /api/webhooks/receipt` does the HTTP-facing work:

1. Optionally verifies `x-webhook-token` against `LOYVERSE_WEBHOOK_SECRET`.
2. Parses JSON.
3. Normalizes one `items` receipt or a `receipts` batch into per-receipt payloads.
4. Reports warning incidents for invalid shapes or empty batches.
5. Calls the shared `processReceiptWebhook` pipeline once per receipt.
6. Runs automations and validation only for receipts whose ingest status is `processed`.
7. Returns HTTP 400 for malformed JSON or clearly invalid client payloads, HTTP 503 for retryable database/network failures, and HTTP 500 for unexpected non-retryable failures.
8. Logs summary counts and returns a 2xx response to Loyverse for handled payloads.

Invalid JSON returns HTTP 400. Database/network failures return HTTP 503 when their code, SQLSTATE, retryability flag, cause chain, or message identifies a retryable condition. Other unexpected processing failures return HTTP 500. Responses remain compact and never include raw payloads or error details.

The shared pipeline is also used by the manager-protected replay endpoint. See [`docs/receipts/replay.md`](./replay.md).

## Ingestion entrypoint

`src/lib/server/db/ingest-receipt-webhook.ts` exports:

```ts
export const ingestReceiptWebhook = async (payload: LoyverseReceiptWebhookPayload) => {
  return ingestReceiptWebhookWithDb(db, payload);
};
```

The wrapper keeps production code bound to the app `db`, while `ingestReceiptWebhookWithDb(database, payload)` remains easier to test with an injected database.

## Required payload fields

`ingestReceiptWebhookWithDb` requires:

- `merchant_id`
- `type`
- `created_at`
- `items.receipt_number`

It also requires `created_at` to parse as a valid date.

## Dedupe key

The dedupe key is SHA-256 over:

```text
merchant_id | type | created_at | receipt_number | items.updated_at | items.total_money
```

Implementation: `createDedupeKey` in `src/lib/server/db/ingest-receipt-core.ts`.

The key is inserted into `webhook_events.dedupe_key`, which has a unique index. If insertion conflicts, an already processed event returns `duplicate` and does not update receipt tables. An unprocessed event is claimed and retried. A short-lived `processing_started_at` claim prevents concurrent duplicate processing; an abandoned claim becomes retryable after the claim timeout.

## Receipt key

The app uses a stable receipt key:

```text
merchant_id:receipt_number
```

This becomes `receipts.receipt_key` and is used by all receipt child tables.

## Stale event protection

After a new webhook event is inserted, ingestion checks the existing receipt row. If the existing `updated_from_event_at` is newer than the incoming webhook `created_at`, the event is marked processed but the receipt is not overwritten. Status returned: `stale`.

## Transactional upsert

For accepted events, ingestion opens a transaction and:

1. Upserts the `receipts` row by `receipt_key`.
2. Deletes all existing child rows for the receipt from:
   - `receipt_line_items`
   - `receipt_line_modifiers`
   - `receipt_discounts`
   - `receipt_line_discounts`
   - `receipt_taxes`
   - `receipt_line_taxes`
   - `receipt_payments`
3. Reinserts current child arrays from the Loyverse payload.
4. Marks the webhook event as processed and clears the processing claim/error.

If the receipt transaction fails after the event row is inserted, `webhook_events.error_message` receives a bounded sanitized summary containing useful error name/code/SQLSTATE/retryability/cause information. The original error remains the request failure so incident-reporting errors cannot mask it.

This replace-children strategy means child rows represent the latest accepted webhook state, while `webhook_events.payload` keeps the raw event history.

## Field mapping notes

The ingester maps Loyverse snake_case fields into Drizzle camelCase columns. Dates pass through `toDate`, which converts missing/invalid values to `null` for optional receipt fields.

Nested data preserved in child tables includes:

- receipt-level discounts/taxes/payments
- line items
- line taxes
- line discounts
- line modifiers
- payment details JSON
