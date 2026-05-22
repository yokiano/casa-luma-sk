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
2. `DISCOUNT_TOTAL_OVER_THRESHOLD`
3. `ONE_HOUR_NOT_CONVERTED`
4. any `extraRules`

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

### `DISCOUNT_TOTAL_OVER_THRESHOLD`

Source: `src/lib/receipts/validation/rules/discount-total-over-threshold.ts`

Purpose: warn when a non-refund receipt has a total discount strictly over the configured amount.

Defaults:

- `thresholdAmount: 400`
- `skipRefunds: true`
- severity: `warning`

The rule primarily uses `receipt.total_discount`. If that value is missing, it falls back to summing finite line-level `total_discount` values and receipt-level discount `money_amount` values. The comparison is strictly greater than `400` baht, so `400` exactly is allowed.

Finding details include the threshold, discount total, `THB` currency, value source, and up to five discount names.

### `ONE_HOUR_NOT_CONVERTED`

Source: `src/lib/receipts/validation/rules/one-hour-not-converted.ts`

Purpose: critical alert when a one-hour ticket exceeds the duration threshold and no one-hour-to-day conversion item exists.

The duration threshold includes the intentional 15-minute grace period: `60` one-hour minutes + `15` grace minutes = `75` minutes. A receipt at 1 hour 5 minutes is allowed and must not alert.

Defaults:

- `skipRefunds: true`
- `thresholdMinutes: 75`
- severity: `critical`

It uses `getReceiptToolsMeta(receipt)` from `src/lib/receipts/receipt-tools.ts`.

Current tool constants:

- One-hour item: `e034b61e-88e0-43bc-a72b-eec3a301a7b2`
- One-hour-to-day conversion item: `c86ad6d4-f8ff-4a43-bd9d-e4988d98c0c5`
- One-hour base duration: `60` minutes
- Grace period: `15` minutes
- Not-converted threshold: `75` minutes

The helper parses:

- order number from `#<digits>` in `receipt.order`
- the last time in `receipt.order` as the start time
- checkout time from `created_at` or `receipt_date`
- checkout local clock time in `Asia/Bangkok`, independent of the server timezone

`isNotConverted` is true when:

```text
has one-hour item
AND does not have one-hour-to-day item
AND durationMinutes > 75
```

This comparison is strictly greater than `75`; durations up to and including the grace threshold are allowed.

```text
Allowed: 65 minutes
Allowed: 75 minutes
Alert:   76+ minutes
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
- primary finding code/message in context
- compact primary finding details in context for Telegram-friendly formatting
- a compact validation findings summary in context, including selected detail fields only
- receipt URL in context when `INCIDENT_REPORT_BASE_URL` is configured

Receipt validation findings currently create one critical validation incident, so Telegram is sent even when an individual discount rule finding has `warning` severity.

## Telegram notifications

`incidentReporter` is built with `createTelegramAlertPublisherFromEnv()` and notifies only critical incidents by default.

Warning incidents are persisted/logged but are not sent to Telegram by the default `shouldNotifyCriticalOnly` policy.

Notification status is written back to `reported_errors`:

- `notified`
- `notified_at`
- `notify_error`

Receipt validation Telegram messages start with a human alert label, for example:

- `Receipt Violation — One Hour Not Converted`
- `Receipt Alert — 100% Discount Used`
- `Receipt Alert — Discount Total Over ฿400`

They show the receipt number early, then a short `Details` section for known receipt validation codes, and use named HTML links instead of raw URLs.

Known detail formatters include:

- `DISCOUNT_100_PRESENT`: concise receipt-level discount names/percentages and up to three line-level item/discount pairs.
- `DISCOUNT_TOTAL_OVER_THRESHOLD`: total discount amount, threshold amount, currency, and up to three discount names.
- `ONE_HOUR_NOT_CONVERTED`: calculated duration in minutes/hours, threshold plus grace period, start/checkout times, timezone, and a plausibility hint for the duration calculation.

The Telegram formatter escapes all human-sourced text as HTML and avoids dumping raw finding JSON. Unknown validation codes keep the generic friendly check-list formatting.

If `INCIDENT_REPORT_BASE_URL` is configured, Telegram messages can include:

```text
<INCIDENT_REPORT_BASE_URL>/tools/receipts/<receiptNumber>
<INCIDENT_REPORT_BASE_URL>/tools/incidents/<incidentId>
```

The app route for receipt details is `/tools/receipts/<receiptNumber>`. The incident route is `/tools/incidents/<incidentId>`.
