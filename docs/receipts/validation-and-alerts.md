# Receipt validation and alerts

Source files:

- Webhook integration: `src/routes/api/webhooks/receipt/+server.ts`
- Validation engine: `src/lib/receipts/validation/engine.ts`
- Default suite: `src/lib/receipts/validation/default-suite.ts`
- Validation types: `src/lib/receipts/validation/types.ts`
- Rules: `src/lib/receipts/validation/rules/`
- Incident reporting: `src/lib/server/incidents/`
- Tool helpers used by validation: `src/lib/receipts/receipt-tools.ts`

## When validation runs

Validation runs only after `ingestReceiptWebhook(receiptPayload)` returns `processed`.

It does not run for:

- `duplicate` events
- `stale` events
- invalid payload shapes
- batches with no valid receipts
- requests that fail before ingestion completes

## Runtime context passed to rules

The webhook route calls:

```ts
runReceiptValidationSuite(validationSuite, receiptPayload.items, {
  merchantId: receiptPayload.merchant_id,
  receiptKey: result.receiptKey,
  eventType: receiptPayload.type,
  eventCreatedAt: receiptPayload.created_at
});
```

Rules receive both the raw Loyverse receipt and this context.

## Engine behavior

`runReceiptValidationSuite` executes every rule in the suite and flattens findings.

If a rule throws, the engine converts that exception into a critical finding:

```text
RULE_EXECUTION_ERROR:<rule.code>
```

The returned report includes:

- `receiptNumber`
- `receiptKey`
- `findings`
- `totalRules`
- `failedRules`
- `hasFailures`

`failedRules` is currently the number of findings, not a distinct count of rule codes.

## Default suite

`createDefaultReceiptValidationSuite` creates suite name `receipt-default-suite` with:

1. `DISCOUNT_100_PRESENT`
2. `ONE_HOUR_NOT_CONVERTED`
3. any `extraRules`

The webhook can inject an always-fail rule when:

```env
RECEIPT_VALIDATION_FORCE_FAIL=1
```

That mode is for alert pipeline testing.

## Current validation rules

### `DISCOUNT_100_PRESENT`

Source: `src/lib/receipts/validation/rules/discount-hundred-percent.ts`

Purpose: warn when a non-refund receipt contains a receipt-level or line-level discount at or above the threshold.

Defaults:

- `minPercentage: 99.99`
- `skipRefunds: true`
- severity: `warning`

Finding details include matched receipt-level discounts and line-level discounts.

### `ONE_HOUR_NOT_CONVERTED`

Source: `src/lib/receipts/validation/rules/one-hour-not-converted.ts`

Purpose: critical alert when a one-hour ticket exceeds the duration threshold and no one-hour-to-day conversion item exists.

Defaults:

- `skipRefunds: true`
- severity: `critical`

It uses `getReceiptToolsMeta(receipt)` from `src/lib/receipts/receipt-tools.ts`.

Current tool constants:

- One-hour item: `e034b61e-88e0-43bc-a72b-eec3a301a7b2`
- One-hour-to-day conversion item: `c86ad6d4-f8ff-4a43-bd9d-e4988d98c0c5`
- Not-converted threshold: `75` minutes

The helper parses:

- order number from `#<digits>` in `receipt.order`
- the last time in `receipt.order` as the start time
- checkout time from `created_at` or `receipt_date`

`isNotConverted` is true when:

```text
has one-hour item
AND does not have one-hour-to-day item
AND durationMinutes > 75
```

### `FORCED_TEST_FAILURE`

Source: `src/lib/receipts/validation/rules/always-fail.ts`

Purpose: test the incident and Telegram alert pipeline. It is only added by the webhook route when `RECEIPT_VALIDATION_FORCE_FAIL=1`.

## Incident reporting

If validation has failures, the webhook route reports a critical incident.

Codes:

- `RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED` — normal validation failure.
- `RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR` — at least one finding code starts with `RULE_EXECUTION_ERROR:`.

Incident payload includes:

- the receipt
- validation findings
- receipt number in context
- unique failed check codes in context

## Telegram notifications

`incidentReporter` is built with `createTelegramAlertPublisherFromEnv()` and notifies only critical incidents by default.

Warning incidents are persisted/logged but are not sent to Telegram by the default `shouldNotifyCriticalOnly` policy.

Notification status is written back to `reported_errors`:

- `notified`
- `notified_at`
- `notify_error`

If `INCIDENT_REPORT_BASE_URL` is configured, Telegram messages include a report URL:

```text
<INCIDENT_REPORT_BASE_URL>/tools/incidents/<incidentId>
```
