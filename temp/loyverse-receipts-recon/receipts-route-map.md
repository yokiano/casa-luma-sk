# Code Context

## Files Retrieved
1. `src/routes/tools/receipts/+page.svelte` (lines 1-191) - only populated receipts tool route; calls remote `getReceipts`, owns filters/pagination/tabs, and passes results to UI components.
2. `src/lib/receipts.remote.ts` (lines 1-30) - Svelte remote function `getReceipts`; delegates directly to DB query module.
3. `src/lib/server/db/receipt-queries.ts` (lines 1-335) - Neon/Postgres read path for receipts and child tables; shapes DB rows back into `LoyverseReceipt` objects.
4. `src/lib/server/db/client.ts` (lines 1-26) - Drizzle Postgres client and environment variable fallback order.
5. `src/lib/server/db/schema.ts` (lines 64-240) - Drizzle schema for `receipts`, line items, modifiers, discounts, taxes, and payments.
6. `src/lib/receipts/types.ts` (lines 1-90) - `LoyverseReceipt` API-shaped type used by UI and DB shaping.
7. `src/lib/receipts/receipt-tools.ts` (lines 1-139) - client-side receipt operational analysis/enrichment used by `/tools/receipts` tabs.
8. `src/lib/components/receipts/ReceiptsList.svelte` (lines 1-67) - list UI expects `ReceiptWithTools[]` and only renders passed data.
9. `src/lib/components/receipts/ReceiptsToolbar.svelte` (lines 1-110) - date/store/sort filters passed up to route.
10. `src/lib/components/receipts/ReceiptsTabs.svelte` (lines 1-50) - three UI tabs: receipts, analytics, tools.
11. `src/routes/api/webhooks/receipt/+server.ts` (lines 1-215) - receipt ingestion HTTP route; accepts Loyverse-style webhook payloads and calls DB ingestion.
12. `src/lib/server/db/ingest-receipt-core.ts` (lines 1-312) - write path into Postgres receipt tables from webhook payloads.

## Key Code

Current `/tools/receipts` data source is Neon/Postgres, not a live Loyverse API call.

```ts
// src/routes/tools/receipts/+page.svelte:1-11
import { getReceipts } from '$lib/receipts.remote';
import { ..., enrichReceiptsWithTools, type ReceiptWithTools } from '$lib/components/receipts';
```

```ts
// src/routes/tools/receipts/+page.svelte:63-75
const response = await getReceipts({
  dateFrom: dateFrom ? startOfDayIso(dateFrom) : undefined,
  dateTo: dateTo ? endOfDayIso(dateTo) : undefined,
  storeId: storeId || undefined,
  limit: 250,
  cursor: nextCursor
});
allReceipts.push(...enrichReceiptsWithTools(response.receipts ?? []));
```

```ts
// src/routes/tools/receipts/+page.svelte:92-104
const response = await getReceipts({
  dateFrom: dateFrom ? startOfDayIso(dateFrom) : undefined,
  dateTo: dateTo ? endOfDayIso(dateTo) : undefined,
  storeId: storeId || undefined,
  limit: 50,
  cursor: reset ? undefined : cursor ?? undefined
});
const enriched = enrichReceiptsWithTools(response.receipts ?? []);
receipts = reset ? enriched : receipts.concat(enriched);
cursor = response.cursor;
hasMore = response.hasMore;
```

Remote function:

```ts
// src/lib/receipts.remote.ts:13-22
export const getReceipts = query(
  ReceiptsQuerySchema,
  async ({ dateFrom, dateTo, storeId, limit, cursor }) => {
    const response = await queryReceiptsFromDb({
      dateFrom,
      dateTo,
      storeId,
      limit: limit ?? 50,
      cursor
    });
```

DB read query:

```ts
// src/lib/server/db/receipt-queries.ts:211-216
const rows = await db
  .select()
  .from(receipts)
  .where(whereClause)
  .orderBy(desc(receipts.updatedFromEventAt), desc(receipts.receiptKey))
  .limit(pageSize + 1);
```

```ts
// src/lib/server/db/receipt-queries.ts:226-235
await Promise.all([
  db.select().from(receiptLineItems).where(inArray(receiptLineItems.receiptKey, receiptKeys)),
  db.select().from(receiptLineModifiers).where(inArray(receiptLineModifiers.receiptKey, receiptKeys)),
  db.select().from(receiptLineDiscounts).where(inArray(receiptLineDiscounts.receiptKey, receiptKeys)),
  db.select().from(receiptLineTaxes).where(inArray(receiptLineTaxes.receiptKey, receiptKeys)),
  db.select().from(receiptDiscounts).where(inArray(receiptDiscounts.receiptKey, receiptKeys)),
  db.select().from(receiptTaxes).where(inArray(receiptTaxes.receiptKey, receiptKeys)),
  db.select().from(receiptPayments).where(inArray(receiptPayments.receiptKey, receiptKeys))
]);
```

Environment / DB client:

```ts
// src/lib/server/db/client.ts:6-11
const connectionString =
  env.DATABASE_URL ??
  env.POSTGRES_URL ??
  env.DATABASE_URL_UNPOOLED ??
  env.POSTGRES_URL_NON_POOLING ??
  'postgres://app:app@localhost:5432/casa_luma';
```

```ts
// src/lib/server/db/client.ts:17-24
const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false
});
export const db = drizzle(sql, { schema });
```

Schema tables used by read path:

```ts
// src/lib/server/db/schema.ts:64-99
export const receipts = pgTable('receipts', { ... }, (table) => [
  uniqueIndex('receipts_merchant_receipt_uidx').on(table.merchantId, table.receiptNumber),
  index('receipts_receipt_date_idx').on(table.receiptDate),
  index('receipts_store_id_idx').on(table.storeId)
]);
```

Tools/analytics enrichment is local client logic over receipt payloads:

```ts
// src/lib/receipts/receipt-tools.ts:101-123
export const analyzeReceiptTools = (receipt: LoyverseReceipt): ReceiptToolsMeta => {
  const orderStartTime = parseOrderStartTime(receipt.order);
  const checkoutAt = getCheckoutAt(receipt);
  const oneHourQuantity = getItemQuantity(receipt, ONE_HOUR_ITEM_ID);
  const oneHourToDayQuantity = getItemQuantity(receipt, ONE_HOUR_TO_DAY_ITEM_ID);
  ...
  isNotConverted: hasOneHour && !hasOneHourToDay && exceedsUnconvertedThreshold
};
```

Ingestion into Neon/Postgres is via webhook route, not used directly by the UI read path:

```ts
// src/routes/api/webhooks/receipt/+server.ts:81-90
const secret = env.LOYVERSE_WEBHOOK_SECRET;
if (secret) {
  const incomingToken = request.headers.get('x-webhook-token');
  if (incomingToken !== secret) return json({ error: 'Unauthorized webhook request' }, { status: 401 });
}
const payload = await request.json();
```

```ts
// src/routes/api/webhooks/receipt/+server.ts:131-134
for (const receiptPayload of receiptPayloads) {
  const result = await ingestReceiptWebhook(receiptPayload);
  results.push(result);
```

```ts
// src/lib/server/db/ingest-receipt-core.ts:232-303
await database.transaction(async (tx: any) => {
  await tx.insert(receipts).values({ ... }).onConflictDoUpdate({ target: receipts.receiptKey, set: { ... } });
  await tx.delete(receiptLineItems).where(eq(receiptLineItems.receiptKey, receiptKey));
  ...
  await insertReceiptTaxes(tx, receiptKey, receipt.total_taxes);
  await insertReceiptDiscounts(tx, receiptKey, receipt.total_discounts);
  await insertReceiptPayments(tx, receiptKey, receipt.payments);
  await insertReceiptLineData(tx, receiptKey, receipt.line_items);
});
```

## Architecture

- Route `/tools/receipts` is `src/routes/tools/receipts/+page.svelte`.
- It calls the Svelte remote function `getReceipts` from `src/lib/receipts.remote.ts` for both:
  - paged receipt list (`limit: 50`), and
  - full-ish analytics/tools dataset via cursor loop (`limit: 250` until no cursor).
- `getReceipts` calls `queryReceiptsFromDb` in `src/lib/server/db/receipt-queries.ts`.
- `queryReceiptsFromDb` reads from Drizzle tables in `src/lib/server/db/schema.ts` using the `db` client from `src/lib/server/db/client.ts`.
- `db/client.ts` connects to Postgres using `DATABASE_URL`, `POSTGRES_URL`, `DATABASE_URL_UNPOOLED`, or `POSTGRES_URL_NON_POOLING`; in production this is presumably Neon.
- `queryReceiptsFromDb` transforms normalized Postgres rows back into `LoyverseReceipt` shape for UI compatibility.
- UI components under `src/lib/components/receipts/` do not fetch data themselves; they render props and/or compute local analytics.
- Related receipt ingestion is `POST /api/webhooks/receipt`, which accepts webhook payloads, checks optional `LOYVERSE_WEBHOOK_SECRET`, and writes into the same Postgres tables via `ingestReceiptWebhookWithDb`.
- No populated route exists under `src/routes/tools/receipts-local/` or `src/routes/tools/receipt-scanner/` in this checkout; both directories are empty.

## Start Here

Start with `src/lib/receipts.remote.ts`. It is the narrow seam between the `/tools/receipts` UI and the data source. To change where receipts come from, replace or branch `getReceipts` there, then preserve the response contract `{ receipts, cursor, hasMore }` expected by `src/routes/tools/receipts/+page.svelte`.

## Required Changes

If the requirement is simply to confirm the current source: no code changes are required; `/tools/receipts` already uses Neon/Postgres receipts.

If the requirement is to switch `/tools/receipts` to live Loyverse API receipts or another source:
1. Change `src/lib/receipts.remote.ts` (`getReceipts`, lines 13-30) to call a new/updated server-side receipt data provider instead of `queryReceiptsFromDb`.
2. Add that provider in server-only code, likely near `src/lib/server/loyverse.ts` or a new `src/lib/server/loyverse-receipts.ts`. Current `src/lib/server/loyverse.ts` has many Loyverse API methods but no receipt method was found by targeted search for `getReceipts`; do not put token-bearing fetches in client Svelte code.
3. Keep input compatibility with `ReceiptsQuerySchema`: `dateFrom`, `dateTo`, `storeId`, `limit`, `cursor` (`src/lib/receipts.remote.ts:5-10`). Map these to the target source's receipt parameters.
4. Keep output compatibility for the route: `{ receipts: LoyverseReceipt[], cursor: string | null, hasMore: boolean }` (`src/lib/receipts.remote.ts:24-28`; consumed at `src/routes/tools/receipts/+page.svelte:73-79` and `101-104`).
5. Ensure returned receipts satisfy `LoyverseReceipt` shape (`src/lib/receipts/types.ts:56-84`), especially `receipt_number`, `created_at`/`receipt_date`, `order`, `line_items`, `payments`, and `store_id`, because list, analytics, and tools logic rely on them.
6. Update route header copy if data is no longer Neon-backed: `src/routes/tools/receipts/+page.svelte:143-146` currently says “Review receipts stored in Neon...”.
7. If keeping Neon as source but changing query behavior, modify `src/lib/server/db/receipt-queries.ts`; filters currently use `receipts.createdAt` for date range (`lines 184-192`) and `receipts.storeId` for store filter (`lines 194-196`), while pagination sorts by `updatedFromEventAt` + `receiptKey` (`lines 211-216`, `323-327`).

## Constraints, Risks, Open Questions

- Date filtering is on `createdAt`, not `receiptDate`; confirm desired semantics before changing filters (`src/lib/server/db/receipt-queries.ts:184-192`).
- Analytics/tools tab cursor loop requests all pages up to `MAX_LIMIT` 250 (`src/routes/tools/receipts/+page.svelte:54-79`; `src/lib/server/db/receipt-queries.ts:16,181`); live API rate limits/performance may matter.
- `hasMore` returned by remote is `Boolean(response.cursor)` (`src/lib/receipts.remote.ts:24-28`), so any alternate source must supply a cursor when more data exists.
- UI list keys by `receipt.receipt_number` (`src/lib/components/receipts/ReceiptsList.svelte:38`); duplicate receipt numbers across merchants/stores could be a rendering issue if combined sources include duplicates.
- Current ingestion only writes receipts when Loyverse webhook payloads arrive or backfill scripts are run; the read route does not self-fetch missing receipts from Loyverse.
