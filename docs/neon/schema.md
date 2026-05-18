# Neon schema reference

Source of truth: `src/lib/server/db/schema.ts`

## Webhook event table

### `webhook_events`

Stores raw Loyverse webhook events and deduplication state.

Important columns:

- `id` — identity primary key.
- `received_at` — when the webhook was received by this app.
- `merchant_id`, `event_type`, `event_created_at` — webhook metadata.
- `dedupe_key` — SHA-256 key built by `ingest-receipt-core.ts`.
- `payload` — raw webhook payload as JSONB.
- `processed`, `processed_at`, `error_message` — processing state.

Indexes:

- Unique: `webhook_events_dedupe_key_uidx` on `dedupe_key`.
- Lookup: `webhook_events_merchant_event_created_idx` on `(merchant_id, event_created_at)`.

## Receipt fact table

### `receipts`

One row per `(merchant_id, receipt_number)`, keyed by `receipt_key`.

`receipt_key` is built as:

```ts
`${merchantId}:${receipt.receipt_number}`
```

Important columns:

- Identity/source: `receipt_key`, `merchant_id`, `receipt_number`, `receipt_type`, `source`.
- Customer/store: `customer_id`, `employee_id`, `store_id`, `pos_device_id`, `dining_option`.
- Time fields: `created_at`, `receipt_date`, `cancelled_at`, `updated_from_event_at`, `synced_at`.
- Money fields: `total_money`, `total_tax`, `total_discount`, `tip`, `surcharge`.
- Loyalty fields: `points_earned`, `points_deducted`, `points_balance`.
- Notes/order: `note`, `order`, `refund_for`.

Indexes:

- Primary key: `receipt_key`.
- Unique: `(merchant_id, receipt_number)`.
- Query/analytics: `receipt_date`, `created_at`, `(store_id, created_at)`, `(updated_from_event_at, receipt_key)`, `store_id`.

## Receipt child tables

Child rows use `receipt_key` plus source-order indexes to preserve the Loyverse receipt shape.

- `receipt_line_items`
  - Unique: `(receipt_key, line_index)`.
  - Indexed by `item_id`.
- `receipt_line_modifiers`
  - Unique: `(receipt_key, line_index, modifier_index)`.
- `receipt_discounts`
  - Receipt-level discounts.
  - Unique: `(receipt_key, discount_index)`.
- `receipt_line_discounts`
  - Line-level discounts.
  - Unique: `(receipt_key, line_index, discount_index)`.
- `receipt_taxes`
  - Receipt-level taxes.
  - Unique: `(receipt_key, tax_index)`.
- `receipt_line_taxes`
  - Line-level taxes.
  - Unique: `(receipt_key, line_index, tax_index)`.
- `receipt_payments`
  - Unique: `(receipt_key, payment_index)`.
  - Indexed by `type`.

The ingestion transaction deletes all child rows for a receipt before reinserting the current child arrays. This makes receipt updates simple and keeps child data in sync with the latest accepted webhook event.

## Incident table

### `reported_errors`

Stores operational incidents and notification status.

Important columns:

- `source`, `code`, `severity`, `message` — incident classification.
- `merchant_id`, `receipt_key`, `webhook_event_id` — optional receipt/webhook correlation.
- `context`, `payload` — JSONB context and payload snapshots.
- `error_name`, `error_message`, `error_stack` — serialized thrown error details.
- `notified`, `notified_at`, `notify_error` — Telegram alert status.

Indexes:

- `created_at`
- `(source, created_at)`
- `code`
- `(merchant_id, created_at)`
- `receipt_key`
