# Receipt ingestion

Source files:

- `src/routes/api/webhooks/receipt/+server.ts`
- `src/lib/server/db/ingest-receipt-webhook.ts`
- `src/lib/server/db/ingest-receipt-core.ts`
- `src/lib/server/db/schema.ts`

## Webhook route responsibilities

`POST /api/webhooks/receipt` does the HTTP-facing work:

1. Optionally verifies `x-webhook-token` against `LOYVERSE_WEBHOOK_SECRET`.
2. Parses JSON.
3. Normalizes one `items` receipt or a `receipts` batch into per-receipt payloads.
4. Reports warning incidents for invalid shapes or empty batches.
5. Calls `ingestReceiptWebhook` once per receipt.
6. Runs validation for receipts whose ingest status is `processed`.
7. Logs summary counts and returns a 2xx response to Loyverse for handled payloads.

Invalid JSON goes through the catch path and returns HTTP 400 with `Invalid request body`.

Database connection refusal (`ECONNREFUSED`) returns HTTP 503.

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

The key is inserted into `webhook_events.dedupe_key`, which has a unique index. If insertion conflicts, ingestion returns `duplicate` and does not update receipt tables.

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
4. Marks the webhook event as processed.

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
