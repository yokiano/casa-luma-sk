# Plan: Receipt discount validations + digestible Telegram alerts

Date: 2026-05-22
Project: `/home/yardenavirav/dev/casa-luma-sk/casa-luma-sk`

## What I found

### Existing receipt validation flow

- Webhook entry point: `src/routes/api/webhooks/receipt/+server.ts`
- Validation suite exports: `src/lib/receipts/validation/index.ts`
- Default rules: `src/lib/receipts/validation/default-suite.ts`
- Existing rules: `src/lib/receipts/validation/rules/`
- Validation tests: `src/lib/receipts/validation/validation-suite.test.ts`
- Incident persistence + Telegram notification: `src/lib/server/incidents/reporter.ts` and `src/lib/server/incidents/telegram.ts`
- Telegram formatter tests: `src/lib/server/incidents/telegram.test.ts`
- Receipt list/detail card UI: `src/routes/tools/receipts/+page.svelte`, `src/lib/components/receipts/ReceiptRowCompact.svelte`, `ReceiptRowExpanded.svelte`
- Incident detail page already exists at `src/routes/tools/incidents/[id]/+page.svelte` and server load at `+page.server.ts`.

Current runtime path:

1. `POST /api/webhooks/receipt` parses one receipt under `items` or a batch under `receipts[]`.
2. For each `processed` receipt from `ingestReceiptWebhook`, it runs `createDefaultReceiptValidationSuite()`.
3. If `validationReport.hasFailures`, it persists one incident with code `RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED` (or engine error) and payload `{ receipt, validationFindings }`.
4. `incidentReporter` inserts `reported_errors`, then calls `buildIncidentAlertPayload()` with a generated `reportUrl` if `INCIDENT_REPORT_BASE_URL` is set.
5. Telegram uses `parse_mode: HTML`, so we can use `<a href="...">Label</a>` hyperlinks.

### Existing validations

`createDefaultReceiptValidationSuite()` already includes:

1. `DISCOUNT_100_PRESENT` from `discount-hundred-percent.ts`
   - Detects receipt-level and line-level discounts where `percentage >= 99.99`.
   - Severity is `warning`.
   - Skips refunds by default.
2. `ONE_HOUR_NOT_CONVERTED` from `one-hour-not-converted.ts`
   - Detects one-hour tickets over `75` minutes without conversion.
   - Severity is `critical`.

Important note: even though discount findings are `warning`, the webhook currently reports **any validation finding** as a `critical` incident, so a 100% discount already triggers the Telegram critical-only notifier. The docs say warning incidents are not sent by default, but receipt validation findings are wrapped in a critical incident today.

### Existing links

- Incident page route is already the wanted shape: `/tools/incidents/17`.
- `reporter.ts` currently builds `${INCIDENT_REPORT_BASE_URL}/tools/incidents/${incidentId}`.
- Telegram currently prints the report URL as raw escaped text, not a friendly hyperlink.
- There is no single-receipt page yet. `/tools/receipts` is a filterable list only; it has no `receiptNumber` filter and no route like `/tools/receipts/[receiptNumber]`.

## Goals

1. Keep the one-hour violation working exactly as-is.
2. Ensure Telegram notification for:
   - any 100% discount usage (already implemented, but tests/docs/message should make it explicit),
   - total receipt discount over 400 baht (new rule).
3. Make Telegram messages start with the human meaning of the alert, not with generic incident plumbing.
4. Add useful links:
   - receipt detail page link for receipt-related alerts,
   - incident detail link as `/tools/incidents/<id>`.
5. Add an “open in new tab” link/icon to receipt cards once a receipt detail route exists.

## Implementation plan

### 1. Add a direct receipt lookup helper

File: `src/lib/server/db/receipt-queries.ts`

Add an exported helper, likely near `queryReceiptsFromDb`:

```ts
export const queryReceiptByNumberFromDb = async ({
  receiptNumber,
  merchantId
}: {
  receiptNumber: string;
  merchantId?: string;
}): Promise<LoyverseReceipt | null> => { ... }
```

Recommended implementation:

- Query `receipts` where `receipts.receiptNumber === receiptNumber`.
- If `merchantId` is provided, also filter by `receipts.merchantId === merchantId`.
- Limit to `1`.
- Reuse the existing shaping logic if possible. The current `buildReceiptShape` is private and good; avoid duplicating the mapping if you can factor the “load related rows and build shaped receipts” part out of `queryReceiptsFromDb`.
- If not refactoring deeply, a pragmatic implementation can call a small new private helper like `hydrateReceiptRows(selectedRows)` used by both list and single lookup.

Why: the receipt detail route should not need to page through `/tools/receipts` to find one receipt.

### 2. Create a receipt detail page

New route files:

- `src/routes/tools/receipts/[receiptNumber]/+page.server.ts`
- `src/routes/tools/receipts/[receiptNumber]/+page.svelte`

Server load:

- Decode `params.receiptNumber` automatically via SvelteKit params.
- Validate it is non-empty.
- Call `queryReceiptByNumberFromDb({ receiptNumber: params.receiptNumber })`.
- If not found, `error(404, 'Receipt not found')`.
- Return `{ receipt }`.

Page UI:

- Reuse `ReceiptRowExpanded` for the full content.
- Header: `Receipt <number>`, back link to `/tools/receipts`.
- Optional small metadata: created date / total if convenient.

URL design:

- Use `/tools/receipts/${encodeURIComponent(receiptNumber)}` for links.
- Receipt numbers seen in tests are like `R-1000` and `1-4595`, so this route is fine.

### 3. Add “open in new tab” links to receipt cards

Files:

- `src/lib/components/receipts/ReceiptRowCompact.svelte`
- `src/lib/components/receipts/ReceiptRowExpanded.svelte`

Add a helper in each component or shared util:

```ts
const receiptHref = $derived(`/tools/receipts/${encodeURIComponent(receipt.receipt_number)}`);
```

Compact card:

- In the receipt number row, add a small `<a>` with `href={receiptHref}`, `target="_blank"`, `rel="noreferrer"`, and accessible label like `Open receipt ${receipt.receipt_number} in new tab`.
- There is `lucide-svelte` in dependencies, but current components mostly avoid icons. You can either import `ExternalLink` from `lucide-svelte` or use a simple `↗` to keep it lightweight.

Expanded card:

- Add the same link next to the `<h3>` receipt number.

Be careful inside `<summary>` in compact cards: nested interactive elements can be awkward in summaries. If the anchor causes toggle issues, call `onclick={(event) => event.stopPropagation()}` on the link.

### 4. Add total-discount-over-400 validation rule

New file:

- `src/lib/receipts/validation/rules/discount-total-over-threshold.ts`

Suggested factory:

```ts
export interface DiscountTotalOverThresholdRuleOptions {
  thresholdAmount?: number; // default 400
  skipRefunds?: boolean; // default true
}

export const createDiscountTotalOverThresholdRule = (...): ReceiptValidationRule => ({
  code: 'DISCOUNT_TOTAL_OVER_THRESHOLD',
  description: 'Notify when total receipt discount exceeds threshold',
  validate: ({ receipt }) => { ... }
});
```

Computation recommendation:

- Primary source: `receipt.total_discount` when it is a finite number.
- Use `Math.abs(receipt.total_discount)` only if refunds/negative values are expected; since refunds are skipped by default, plain positive should work. To be safer with data quirks, use `Math.abs` in the comparison but include original value in details.
- Fallback only if `receipt.total_discount` is missing: sum line-level `lineItem.total_discount` values that are finite, and/or discount `money_amount` values. Avoid double-counting when `receipt.total_discount` exists.
- Trigger only when `discountTotal > thresholdAmount` (strictly over 400, as requested). If business wants 400 exactly, change to `>=` later.
- Finding severity: `warning` to match the existing 100% discount rule.
- Details should include `thresholdAmount`, `discountTotal`, `currency: 'THB'`, and maybe a few discount names/line indices.

Wire it into:

- `src/lib/receipts/validation/default-suite.ts`
  - Add options field `discountTotalRule?: DiscountTotalOverThresholdRuleOptions`.
  - Include the rule after 100% discount and before/after one-hour rule.
- `src/lib/receipts/validation/index.ts`
  - Export the new rule.
- `src/lib/receipts/validation/validation-suite.test.ts`
  - Add tests:
    - flags `total_discount: 401`, code `DISCOUNT_TOTAL_OVER_THRESHOLD`.
    - does not flag `total_discount: 400`.
    - skips refunds by default.

### 5. Enrich validation incident context for Telegram

File: `src/routes/api/webhooks/receipt/+server.ts`

Currently context only has:

```ts
context: {
  receiptNumber: receiptPayload.items.receipt_number,
  failedChecks
}
```

Add more digestible context:

- `validationFindingsSummary`: compact objects, e.g. `{ code, severity, message }` for first few findings.
- `primaryFindingCode`: first finding code, or first critical finding if present.
- `primaryFindingMessage`: first/primary finding message.
- `receiptNumber` (already exists).
- `receiptUrl` if `INCIDENT_REPORT_BASE_URL` is set:
  - `${base}/tools/receipts/${encodeURIComponent(receiptNumber)}`
- Optional `receiptKey` if useful for incident page, but avoid cluttering Telegram.

Helper to build base URL can either live in the webhook route or a small shared helper. Since `reporter.ts` already has `buildReportUrl`, consider extracting URL helpers to avoid duplicated base trimming.

### 6. Rewrite Telegram formatter around alert labels and links

File: `src/lib/server/incidents/telegram.ts`

Current message begins:

```text
🚨 receipt-webhook incident

Receipt processed, but one or more validation checks failed.
Code: ...
Severity: ...
Receipt: ...
Failed checks...
Context...
Report: raw-url
```

Replace receipt validation formatting with a specialized branch for `RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED` and `RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR`.

Suggested label mapping:

```ts
const VALIDATION_LABEL_BY_CODE: Record<string, string> = {
  ONE_HOUR_NOT_CONVERTED: 'Receipt Violation — One Hour Not Converted',
  DISCOUNT_100_PRESENT: 'Receipt Alert — 100% Discount Used',
  DISCOUNT_TOTAL_OVER_THRESHOLD: 'Receipt Alert — Discount Total Over ฿400',
  FORCED_TEST_FAILURE: 'Receipt Alert — Forced Test Failure'
};
```

Message shape:

```html
<b>Receipt Alert — 100% Discount Used</b>
🧾 Receipt: <code>1-4595</code>

<b>Checks</b>
• 100% Discount Used
• Discount Total Over ฿400

<b>Links</b>
• <a href="https://.../tools/receipts/1-4595">Open receipt</a>
• <a href="https://.../tools/incidents/17">Open incident</a>
```

For one-hour:

```html
<b>Receipt Violation — One Hour Not Converted</b>
🧾 Receipt: <code>1-4595</code>
...
```

Rules:

- Put the label first.
- Receipt number second.
- Links near the top/bottom, but before raw context.
- Avoid dumping codes in Telegram unless there is no better label. Codes remain available in the incident page payload/context.
- Use hyperlinks with proper names:
  - `<a href="...">Open receipt</a>`
  - `<a href="...">Open incident</a>`
- Only create `<a href>` for absolute `http://` or `https://` URLs because Telegram links should be absolute. If the URL is absent or invalid, omit the link rather than showing broken markup.
- Continue escaping HTML text and hrefs.

Implementation detail:

- Keep generic incident formatting for non-receipt incidents.
- Add helpers:
  - `isHttpUrl(value: unknown): value is string`
  - `formatHtmlLink(label: string, url: string)`
  - `humanizeCheckCode(code: string)` fallback from code to title case.
- Change the `title` if desired to something less generic for validation incidents, e.g. `🚨 Receipt alert`.

### 7. Confirm/fix incident link generation

File: `src/lib/server/incidents/reporter.ts`

`buildReportUrl()` already returns `/tools/incidents/${incidentId}` appended to `INCIDENT_REPORT_BASE_URL`. Keep that route shape.

Double-check during implementation:

- No old `/tools/incidents?id=17` shape is produced anywhere.
- The Telegram formatter uses `reportUrl` as a hyperlink, not raw text.
- If the user's actual production link is broken, the likely cause is `INCIDENT_REPORT_BASE_URL` being unset or incorrect in environment. Code should still be correct, but document this in final notes.

### 8. Tests to update/add

Run targeted tests after implementation:

```bash
cd /home/yardenavirav/dev/casa-luma-sk/casa-luma-sk
npm run test:unit -- --run src/lib/receipts/validation/validation-suite.test.ts src/lib/server/incidents/telegram.test.ts
npm run check
```

Test additions:

1. `validation-suite.test.ts`
   - total discount over 400 flags.
   - total discount equal 400 does not flag.
   - refunds skipped.
   - default suite includes the new rule.
2. `telegram.test.ts`
   - one-hour validation formats with `Receipt Violation — One Hour Not Converted` at/near the beginning.
   - 100% discount formats with friendly label.
   - high discount formats with friendly label.
   - receipt and incident URLs render as `<a href="...">Open receipt</a>` / `<a href="...">Open incident</a>`.
   - no raw technical context/code dump appears before the label.
   - generic unknown incident still uses fallback behavior.

### 9. Docs to update

Files:

- `docs/receipts/validation-and-alerts.md`
- optionally `docs/loyverse/receipt-validation-engine.md`

Update:

- Add `DISCOUNT_TOTAL_OVER_THRESHOLD` to default suite/rule list.
- Clarify that receipt validation findings currently create one critical validation incident so Telegram is sent even for discount warning findings.
- Document the receipt detail link shape: `/tools/receipts/<receiptNumber>`.
- Document alert links:
  - receipt URL uses `INCIDENT_REPORT_BASE_URL` + `/tools/receipts/<receiptNumber>`.
  - incident URL uses `INCIDENT_REPORT_BASE_URL` + `/tools/incidents/<incidentId>`.

## Suggested implementation order

1. Add `DISCOUNT_TOTAL_OVER_THRESHOLD` rule + tests + exports/default suite.
2. Add/adjust Telegram formatter tests for the desired message shape.
3. Implement the Telegram specialized receipt validation formatter.
4. Add receipt URL to validation incident context.
5. Add direct receipt query helper.
6. Add `/tools/receipts/[receiptNumber]` page.
7. Add open-in-new-tab links on receipt cards.
8. Update docs.
9. Run targeted tests and `npm run check`.

## Notes / decisions for implementer

- Do not break the one-hour rule threshold: it is strictly `> 75` minutes, not `>= 75`.
- Keep discount rules `skipRefunds: true` by default.
- For the over-400 rule, interpret “over 400 baht” as `> 400`, not `>= 400`.
- Keep code/payload details in the incident page, but make Telegram concise.
- Telegram supports HTML parse mode already; use named hyperlinks.
- If `INCIDENT_REPORT_BASE_URL` is absent, links cannot be generated for Telegram. The app should still send a readable message without links.
- The incident route already exists and expects `/tools/incidents/[id]`.

## Prompt for a new implementation session

Use this prompt to start a fresh coding session:

```text
We need to implement the receipt validation/Telegram alert plan in `/home/yardenavirav/dev/casa-luma-sk/casa-luma-sk`. Read `temp/receipt-validation-alerts-plan.md` first and follow it.

Goals:
1. Add a new validation rule `DISCOUNT_TOTAL_OVER_THRESHOLD` for non-refund receipts where total receipt discount is strictly over 400 THB.
2. Keep/confirm the existing `DISCOUNT_100_PRESENT` notification behavior.
3. Make receipt validation Telegram messages much easier to digest: start with a human label like “Receipt Violation — One Hour Not Converted” or “Receipt Alert — 100% Discount Used”, show receipt number early, and include named HTML hyperlinks for “Open receipt” and “Open incident”. Keep technical codes/details in the incident page, not prominent in Telegram.
4. Add a receipt detail route `/tools/receipts/[receiptNumber]`, a DB lookup helper for one receipt, and open-in-new-tab links/icons from receipt cards to that route.
5. Ensure incident links use `/tools/incidents/<id>` and receipt links use `/tools/receipts/<receiptNumber>` based on `INCIDENT_REPORT_BASE_URL` when available.
6. Update tests and docs.

Important files:
- `src/routes/api/webhooks/receipt/+server.ts`
- `src/lib/receipts/validation/default-suite.ts`
- `src/lib/receipts/validation/index.ts`
- `src/lib/receipts/validation/rules/`
- `src/lib/receipts/validation/validation-suite.test.ts`
- `src/lib/server/incidents/reporter.ts`
- `src/lib/server/incidents/telegram.ts`
- `src/lib/server/incidents/telegram.test.ts`
- `src/lib/server/db/receipt-queries.ts`
- `src/routes/tools/receipts/+page.svelte`
- `src/lib/components/receipts/ReceiptRowCompact.svelte`
- `src/lib/components/receipts/ReceiptRowExpanded.svelte`
- `docs/receipts/validation-and-alerts.md`

Run after implementation:
`npm run test:unit -- --run src/lib/receipts/validation/validation-suite.test.ts src/lib/server/incidents/telegram.test.ts`
then `npm run check`.
```
