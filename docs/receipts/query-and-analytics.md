# Receipt queries and analytics

Source files:

- Remote functions: `src/lib/receipts.remote.ts`
- Receipt query reconstruction: `src/lib/server/db/receipt-queries.ts`
- Analytics SQL: `src/lib/server/db/receipt-analytics.ts`
- Analytics types: `src/lib/receipts/analytics.ts`
- Receipt types: `src/lib/receipts/types.ts`

## Svelte remote functions

`src/lib/receipts.remote.ts` exports two server remote queries.

### `getReceipts`

Input schema:

```ts
{
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  limit?: number;
  cursor?: string;
}
```

Behavior:

- Calls `queryReceiptsFromDb`.
- Defaults `limit` to `50`.
- Returns:

```ts
{
  receipts: LoyverseReceipt[];
  cursor: string | null;
  hasMore: boolean;
}
```

### `getReceiptAnalytics`

Input schema:

```ts
{
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
}
```

Behavior:

- Calls `queryReceiptAnalyticsFromDb`.
- Returns a `ReceiptAnalytics` object.

## Receipt query behavior

`queryReceiptsFromDb` reads normalized receipt tables and reconstructs the app's `LoyverseReceipt` shape.

Filters:

- `dateFrom` — `receipts.created_at >= dateFrom` when parseable.
- `dateTo` — `receipts.created_at <= dateTo` when parseable.
- `storeId` — exact match on `receipts.store_id`.

Pagination:

- Max page size is `250`.
- Default page size is `50`.
- Sort order is descending by `updated_from_event_at`, then descending by `receipt_key`.
- Cursor is base64url JSON:

```ts
{
  updatedAt: string;
  receiptKey: string;
}
```

The query fetches `pageSize + 1` rows to determine `hasMore` and generate the next cursor.

## Receipt shape reconstruction

After selecting receipt rows, the query fetches children with parallel selects by `receipt_key`:

- line items
- line modifiers
- line discounts
- line taxes
- receipt discounts
- receipt taxes
- payments

Rows are grouped in memory and sorted by their stored source-order indexes before being mapped back to `LoyverseReceipt` fields.

Dates are serialized to ISO strings. Null database values are returned as `undefined` where the Loyverse type expects optional fields.

If the initial receipt select fails, the code logs serialized Postgres error details and throws a user-facing error:

```text
Receipt database query failed. Check the server logs for the underlying Postgres connection/query error.
```

## Analytics behavior

`queryReceiptAnalyticsFromDb` runs multiple SQL queries in parallel and returns `ReceiptAnalytics`.

Filters:

- `dateFrom` — `r.created_at >= dateFrom`
- `dateTo` — `r.created_at <= dateTo`
- `storeId` — `r.store_id = storeId`

Refunds are usually excluded from sale analytics with:

```sql
receipt_type is distinct from 'REFUND'
```

### Summary metrics

Returned in `analytics.summary`:

- revenue/refunds/discounts/tips/tax/surcharges
- receipt/sale/refund counts
- line item count
- top payment type
- peak hour
- top item name and quantity
- loyalty customer metrics
- unassigned receipt count
- duration analytics for stay/order duration
- long-stay count using `NOT_CONVERTED_DURATION_THRESHOLD_MINUTES`

### Time series and chart data

Returned analytics include:

- `timeSeries.day/week/month`
- `revenueByDay`
- `receiptsByHour`
- `topItemsByRevenue`
- `topCategoriesByRevenue`
- `paymentTypeRevenue`
- `avgTicketByDay`
- `revenueByDayOfWeek`

### Category enrichment

Top category revenue is enriched from Loyverse item/category APIs:

- `loyverse.getAllItems()`
- `loyverse.getAllCategories()`

The category map is cached in memory for 10 minutes. If Loyverse category loading fails, the analytics query logs the error and falls back to empty maps, causing unknown categories to be labeled `Uncategorized`.

## Duration analytics

Analytics and validation both use the same business threshold from `src/lib/receipts/receipt-tools.ts`:

```ts
ONE_HOUR_BASE_DURATION_MINUTES = 60
ONE_HOUR_GRACE_PERIOD_MINUTES = 15
NOT_CONVERTED_DURATION_THRESHOLD_MINUTES = 75
```

The 75-minute threshold intentionally includes the 15-minute grace period for one-hour tickets.

The analytics SQL extracts the last `HH:mm`-looking time from `receipts.order`, compares it with `created_at`/`receipt_date`, handles midnight rollover, and aggregates duration metrics.
