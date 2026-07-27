# Receipt validation and alerts

Source files:

- Webhook integration: `src/routes/api/webhooks/receipt/+server.ts`
- Validation engine: `src/lib/receipts/validation/engine.ts`
- Default suite: `src/lib/receipts/validation/default-suite.ts`
- Validation types: `src/lib/receipts/validation/types.ts`
- Rules: `src/lib/receipts/validation/rules/`
- Incident reporting: `src/lib/server/incidents/`
- Violation dashboard analytics: `src/lib/server/incidents/violation-analytics.ts`
- Tool helpers used by validation: `src/lib/receipts/receipt-tools.ts`

## When validation runs

Validation runs only after `ingestReceiptWebhook(receiptPayload)` returns `processed`.

It does not run for:

- `duplicate` events
- `stale` events
- invalid payload shapes
- batches with no valid receipts
- requests that fail before ingestion completes

## Operational SOP (Check-In Timing)

Because receipt validations are post-facto (running after a ticket or receipt is closed on Loyverse), they cannot block register transactions before payment. To prevent validation alerts from arriving too late (e.g., after the customer has stayed, eaten, and left), the venue enforces the following standard operating procedure (SOP):

1. **Open the customer ticket:** Attach the customer and add the relevant 0-baht check-in marker. For Flexi, add `Flexi Entrance` and choose the number of kids.
2. **Keep the same ticket open:** At departure, punch only the holes earned during this visit, add `Flexi Checkout`, choose that visit's total hours, keep quantity at `1`, and close the same ticket.
3. **Prompt alerting:** Webhook validation checks customer, variant, and balance data. It does not infer pairing from timestamps and it never treats elapsed time or cumulative card holes as Checkout usage.


## Runtime context passed to rules

The webhook route calls:

```ts
await runReceiptValidationSuite(validationSuite, receiptPayload.items, {
  merchantId: receiptPayload.merchant_id,
  receiptKey: result.receiptKey,
  eventType: receiptPayload.type,
  eventCreatedAt: receiptPayload.created_at
});
```

Rules receive both the raw Loyverse receipt and this context.

## Engine behavior

`runReceiptValidationSuite` executes every rule in the suite and flattens findings. The engine is async-capable: rules may return findings directly or return a Promise, so server-backed rules can await Notion/Neon lookups while existing synchronous rules keep working.

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

1. `RECEIPT_CLOSED_WITHOUT_CUSTOMER`
2. `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP`
3. `FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS`
4. `FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS`
5. `DISCOUNT_100_PRESENT`
6. `DISCOUNT_TOTAL_OVER_THRESHOLD`
7. `ONE_HOUR_NOT_CONVERTED`
8. any `extraRules`

The webhook can inject an always-fail rule when:

```env
RECEIPT_VALIDATION_FORCE_FAIL=1
```

That mode is for alert pipeline testing.

## Current validation rules

### `RECEIPT_CLOSED_WITHOUT_CUSTOMER`

Source: `src/lib/receipts/validation/rules/missing-customer.ts`

Purpose: warn when a non-refund, non-cancelled receipt is closed without `receipt.customer_id`.

Defaults:

- `skipRefunds: true`
- `skipCancelled: true`
- severity: `warning`

Finding details include the receipt type, total, item count, and a compact item summary.

### `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP`

Source: `src/lib/receipts/validation/rules/member-valid-visit.ts`

Purpose: warn when `Member Valid Visit` appears but the receipt customer cannot be verified against a valid Notion membership for the receipt date.

The rule is efficient: it calls Notion only when the receipt contains the hardcoded `Member Valid Visit` item ID. If the item appears without `receipt.customer_id`, it emits a finding immediately.

Finding reasons include `missing_customer`, `family_not_found`, and `no_active_membership`.

### Flexi check-in and checkout

Sources: `src/lib/receipts/validation/rules/flexi-checkin.ts` and `flexi-checkout.ts`.

`Flexi Entrance` validates the child-count variant, quantity `1`, customer, and at least one usable hour. It does not reduce balance. `Flexi Checkout` validates one variant from `1` to `8` hours, quantity `1`, customer, and enough balance. The selected hours are holes punched for this visit only. Unknown, malformed, multiple, or incorrectly-quantified Checkout lines produce review findings and do not mutate Notion usage.

New codes are `FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS`, `FLEXI_CHECKIN_INVALID_VARIANT`, `FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS`, and `FLEXI_CHECKOUT_INVALID_VARIANT`. Historical `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS` incidents remain supported.

See also:

- `docs/casa-luma/memberships/data-model.md`
- `docs/casa-luma/memberships/receipt-validation.md`

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

## Management dashboard

Receipt validation triage now lives under the management dashboard:

- `/mgmt-dashboard/violations` aggregates incidents by the underlying validation code from `reported_errors.context` / `reported_errors.payload`, including `context.failedChecks`, `context.primaryFindingCode`, `context.validationFindingsSummary`, and `payload.validationFindings`. It supports 7-day, 30-day, 90-day, 12-month, and all-time filters plus daily/weekly/monthly trend buckets.
- `/mgmt-dashboard/violations/[id]` reuses the incident detail data and adds validation-code metadata so staff can inspect individual incidents from the dashboard.
- `/mgmt-dashboard/incidents` is the manager-only generic incident list and `/mgmt-dashboard/incidents/[id]` is the generic incident detail page.
- The legacy `/tools/incidents` URL redirects to `/mgmt-dashboard/incidents` for existing bookmarks.

Dashboard labels and descriptions come from shared receipt validation metadata in `src/lib/receipts/validation/metadata.ts`, backed by the default suite rule descriptions where possible.

## Telegram notifications

`incidentReporter` is built with `createTelegramAlertPublisherFromEnv()` and notifies critical incidents by default.

Membership/Flexi automation success and review incidents are also sent by default so staff can see every automatic Membership or Flexi Pass creation. Other warning incidents are persisted/logged but are not sent to Telegram by default.

Notification status is written back to `reported_errors`:

- `notified`
- `notified_at`
- `notify_error`

Flexi Pass creation notifications use `FLEXI_PASSES_CREATED` info incidents and include the receipt, Family, card count, entries granted/left, validity dates, and links when configured.

Receipt validation Telegram messages start with a human alert label, for example:

- `Receipt Violation — One Hour Not Converted`
- `Receipt Alert — 100% Discount Used`
- `Receipt Alert — Discount Total Over ฿400`

They show the receipt number early, then a short `Details` section for known receipt validation codes, and use named HTML links instead of raw URLs.

Known detail formatters include:

- `DISCOUNT_100_PRESENT`: concise receipt-level discount names/percentages and up to three line-level item/discount pairs.
- `DISCOUNT_TOTAL_OVER_THRESHOLD`: total discount amount, threshold amount, currency, and up to three discount names.
- `ONE_HOUR_NOT_CONVERTED`: calculated duration in minutes/hours, threshold plus grace period, start/checkout times, timezone, and a plausibility hint for the duration calculation.
- `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP`: reason, customer ID, Family, checked date, and member-entry quantity.
- `FLEXI_CHECKIN_*` and `FLEXI_CHECKOUT_*`: reason, item/variant identifiers, selected holes punched for this visit, purchased/used counts, and remaining balance before/after the receipt. Historical `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS` details remain supported.
- `RECEIPT_CLOSED_WITHOUT_CUSTOMER`: total, item count, and compact item names.

The Telegram formatter escapes all human-sourced text as HTML and avoids dumping raw finding JSON. Unknown validation codes keep the generic friendly check-list formatting.

If `INCIDENT_REPORT_BASE_URL` is configured, Telegram messages can include:

```text
<INCIDENT_REPORT_BASE_URL>/mgmt-dashboard/receipts/<receiptNumber>
<INCIDENT_REPORT_BASE_URL>/mgmt-dashboard/incidents/<incidentId>
```

The app routes for receipt details and generic incident details are `/mgmt-dashboard/receipts/<receiptNumber>` and `/mgmt-dashboard/incidents/<incidentId>`. Legacy `/tools/receipts/<receiptNumber>` and `/tools/incidents/<incidentId>` URLs redirect to the management dashboard.
