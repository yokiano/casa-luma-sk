# Receipt Validation Engine

This module provides composable receipt validation rules that can be executed by multiple consumers (webhooks, backfills, scheduled jobs) without coupling to any specific notification channel.

## Architecture

- Core validation engine: `src/lib/receipts/validation/engine.ts`
- Rule contracts and output types: `src/lib/receipts/validation/types.ts`
- Default rules and suite factory: `src/lib/receipts/validation/default-suite.ts`
- Rules:
  - `RECEIPT_CLOSED_WITHOUT_CUSTOMER`
  - `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP`
  - `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS`
  - `DISCOUNT_100_PRESENT`
  - `DISCOUNT_TOTAL_OVER_THRESHOLD`
  - `ONE_HOUR_NOT_CONVERTED`
- Notification sinks (server-only): `src/lib/server/alerts/*`
- Incident reporting pipeline: `src/lib/server/incidents/*`

Webhook usage is orchestration-only:

1. Ingest webhook into DB.
2. If event is `processed`, run validation suite.
3. If findings exist, report incident (console -> DB -> best-effort Telegram for severe incidents).
4. Always return webhook response independently of notification success.

## Rule Coverage (Current)

The rule contract is async-capable. Existing synchronous rules return findings directly; membership/flexi rules await Notion/Neon helpers only after their relevant item IDs appear.

### `RECEIPT_CLOSED_WITHOUT_CUSTOMER`

- Skips refunds and cancelled receipts by default.
- Triggers when `receipt.customer_id` is empty.

### `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP`

- Triggers only for `Member Valid Visit` (`dd4303a3-0bfb-49ed-95bc-fd65b853d22b`).
- Requires a Loyverse customer on the receipt.
- Uses `Families.Loyverse Customer ID` in Notion to find the Family.
- Requires a Membership related to that Family whose date range covers the receipt date.

### `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS`

- Triggers only for `Flexi Single Entrance` (`a94027fa-dd55-43d2-a031-b358877f4752`).
- Requires a Loyverse customer on the receipt.
- Queries Neon receipt history for flexi card purchases and flexi entries for that customer.
- Counts `Flexible Resident` and `flexible Regular` cards as 11 entrances each.

### `DISCOUNT_100_PRESENT`

- Scans both receipt-level and line-level discounts.
- Uses configurable threshold (`minPercentage`, default `99.99`) to avoid floating-point misses.
- Skips refunds by default.

### `ONE_HOUR_NOT_CONVERTED`

- Reuses shared receipt tools (`src/lib/receipts/receipt-tools.ts`).
- Triggers when:
  - one-hour ticket exists,
  - conversion item is missing,
  - duration exceeds threshold.
- The threshold is the one-hour ticket duration plus a 15-minute grace period (`60 + 15 = 75` minutes), so a 65-minute stay is intentionally allowed.
- Duration is calculated against the store-local `Asia/Bangkok` checkout clock, not the server timezone.
- Skips refunds by default.

## Output Contract

Validation returns a stable report payload:

- `receiptNumber`, `receiptKey`
- `findings[]` with `{ code, severity, message, details }`
- aggregate metrics: `totalRules`, `failedRules`, `hasFailures`

This shape is designed for reuse across alert channels and any future persistence layer.

## Alerting

Telegram sink is implemented in `src/lib/server/alerts/telegram.ts`.

Incident reporter is implemented in `src/lib/server/incidents/reporter.ts` and persists incidents in
`reported_errors` before optionally notifying Telegram. The management dashboard violations page at
`/mgmt-dashboard/violations` replaces the old `/tools/incidents` list for receipt-validation triage by
aggregating these rows by underlying validation codes from incident context/payload.

Critical validation incidents use distinct error codes:

- `RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED` for business-rule failures.
- `RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR` when a rule crashes during execution.

Non-validation parsing/shape failures are tracked with separate codes such as:

- `RECEIPT_WEBHOOK_INVALID_JSON`
- `RECEIPT_WEBHOOK_INVALID_PAYLOAD_SHAPE`

Required env vars:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional:

- `TELEGRAM_MESSAGE_THREAD_ID`
- `TELEGRAM_ALERT_TIMEOUT_MS` (default `3000`)
- `RECEIPT_VALIDATION_FORCE_FAIL` (`1` enables a test-only forced failure rule)
- `INCIDENT_REPORT_BASE_URL` (optional absolute base URL for incident links in Telegram)

### Quick alert pipeline test

If you want to verify Telegram delivery without waiting for a real failing receipt:

1. Set `RECEIPT_VALIDATION_FORCE_FAIL=1`.
2. Send any valid receipt webhook that reaches `processed` status.
3. Confirm Telegram alert arrives.
4. Set `RECEIPT_VALIDATION_FORCE_FAIL=0` and redeploy.

## Test Suite

Tests are in `src/lib/receipts/validation/validation-suite.test.ts` and cover:

- healthy receipt -> no findings
- receipt-level 100% discount -> detected
- line-level 100% discount -> detected
- threshold behavior (`99.99` vs `100`)
- async rule support and async execution errors
- missing customer receipt alerts
- membership entry checks with mocked Notion lookup
- flexi entry balance checks with mocked Neon lookup
- one-hour not converted -> detected
- refund skip behavior for one-hour rule

## Edge Cases Covered

- missing `line_items`, `total_discounts`, `line_discounts`
- duplicate/stale events (validation only runs for `processed` in webhook flow)
- notification failures do not fail webhook processing
- rule execution errors are captured as critical findings
- severe incidents are persisted for later replay/debugging

## Implementation Checklist

- [x] Centralized validation engine and typed rule contracts
- [x] Composable suite factory and configurable rules
- [x] Default suite with discount, one-hour, missing-customer, membership, and flexi business rules
- [x] Telegram alert sink and alert formatting
- [x] Webhook orchestration integration
- [x] Unit tests with realistic sample receipts
- [x] Environment variable documentation update
