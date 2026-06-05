# COGS vs Company Ledger Food Cost Dashboard Plan

Date: 2026-06-03

## Requirement summary

Add an inner section inside the existing **2. Balance** card on the management dashboard that compares:

1. **COGS reported by Loyverse receipts saved in Neon**
   - Source: `receipt_line_items.cost_total`
   - Represents theoretical consumed cost from POS sales.
2. **Food cost reported in the Company Ledger Notion database**
   - Source: Company Ledger `Category`
   - Default selected category: `Food & Groceries`
   - The category spelling in the generated Notion SDK is exactly `Food & Groceries`.

The section should be implemented as its own component and should call its own server function/query so the existing balance reconciliation component does not become too large.

## Confirmed decisions

- The UI should support multiple predefined periods and a custom date range.
- All Company Ledger rows in the selected categories should be counted, regardless of status/type.
- Default category is only `Food & Groceries`.
- Do **not** include `Staff Food` by default because it is a different expense type and has no POS representation.
- Refund handling can be ignored for now to reduce complexity because refund volume is very low.

## Proposed files

### New server module

```txt
src/lib/server/cogs-reconciliation.ts
```

Responsibilities:

- Calculate Loyverse/Neon COGS for a selected period.
- Calculate Notion Company Ledger total for selected categories and period.
- Return category options from generated Company Ledger constants.
- Return a compact, typed summary suitable for the dashboard UI.

### Remote dashboard function

Add to:

```txt
src/lib/mgmt-dashboard.remote.ts
```

Suggested export:

```ts
export const getCogsReconciliationDashboard = query(
  v.object({
    period: v.optional(v.picklist(['today', 'yesterday', 'last7Days', 'monthToDate', 'lastMonth', 'custom'])),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    categories: v.optional(v.array(v.string()))
  }),
  async (input) => getCogsReconciliationSummary(input)
);
```

Exact syntax should follow the current SvelteKit remote-query patterns already used in `src/lib/mgmt-dashboard.remote.ts`.

### New Svelte component

```txt
src/lib/components/mgmt-dashboard/CostOfGoodsReconciliation.svelte
```

Responsibilities:

- Own its loading/error state.
- Call `getCogsReconciliationDashboard`.
- Display summary metrics.
- Provide period controls.
- Provide category multi-select.
- Default categories to `['Food & Groceries']`.

### Existing component integration

Update:

```txt
src/lib/components/mgmt-dashboard/BalanceReconciliationPanel.svelte
```

Add the new component as an inner section inside the existing **2. Balance** card, likely after the three top summary cards and before the `KBank & safe` table.

## Period controls

Recommended predefined periods:

- Today
- Yesterday
- Last 7 days
- Month to date
- Last month
- Custom range

All period calculations should use Bangkok business dates, consistent with the rest of the management dashboard.

Suggested helper behavior:

```ts
type CogsPeriod = 'today' | 'yesterday' | 'last7Days' | 'monthToDate' | 'lastMonth' | 'custom';
```

For `custom`, require explicit `startDate` and `endDate` as `YYYY-MM-DD` strings.

## Backend calculation details

### Loyverse COGS from Neon

Use `receipt_line_items` joined to `receipts`.

Initial simple logic:

- Include non-cancelled receipts.
- Filter by selected Bangkok date range.
- Sum `receipt_line_items.cost_total`.
- Do not special-case refunds for now.
- Treat null `cost_total` as `0`.
- Return a count of zero/null COGS lines as a data-quality signal.

Possible SQL shape:

```sql
select
  coalesce(sum(coalesce(li.cost_total, 0)), 0)::text as cogs_thb,
  count(*)::text as line_count,
  count(*) filter (where li.cost_total is null or li.cost_total = 0)::text as missing_cogs_line_count
from receipt_line_items li
join receipts r on r.receipt_key = li.receipt_key
where r.cancelled_at is null
  and (coalesce(r.created_at, r.receipt_date) at time zone 'Asia/Bangkok')::date >= :startDate
  and (coalesce(r.created_at, r.receipt_date) at time zone 'Asia/Bangkok')::date <= :endDate
```

Note: existing dashboard code often uses `created_at`; choose either `coalesce(created_at, receipt_date)` or match the dashboard convention intentionally.

### Company Ledger total from Notion

Use `CompanyLedgerDatabase` and `CompanyLedgerResponseDTO`.

Filter by:

- Date range.
- Category is one of selected categories.

Confirmed behavior:

- Count all matching ledger rows.
- Do not filter by status.
- Do not filter by type.

Implementation note: if generated SDK filtering does not support an `or` category filter easily, fetch rows in date range and filter selected categories in TypeScript. This is acceptable for dashboard-sized ranges.

## Suggested returned data shape

```ts
type CogsReconciliationSummary = {
  asOf: string;
  period: {
    key: 'today' | 'yesterday' | 'last7Days' | 'monthToDate' | 'lastMonth' | 'custom';
    startDate: string;
    endDate: string;
    label: string;
  };
  selectedCategories: string[];
  categoryOptions: string[];
  loyverse: {
    cogsThb: number;
    lineCount: number;
    missingCogsLineCount: number;
  };
  ledger: {
    amountThb: number;
    itemCount: number;
    categories: Array<{
      name: string;
      amountThb: number;
      itemCount: number;
    }>;
  };
  difference: {
    thb: number;
    ratio: number | null;
    label: string;
    status: 'ok' | 'watch' | 'attention';
  };
  error: string | null;
};
```

Difference calculation:

```ts
ledger.amountThb - loyverse.cogsThb
```

Interpretation:

- Positive difference: ledger food purchases are higher than theoretical consumed food cost.
- Negative difference: theoretical consumed COGS is higher than ledger food purchases.

## UI content

Suggested title:

```txt
Food cost check
```

Suggested subtitle:

```txt
Loyverse line-item COGS vs Company Ledger food categories for the selected period.
```

Suggested summary cards:

1. **Loyverse COGS**
2. **Ledger food spend**
3. **Difference**
4. Optional small data-quality note: `X lines have no COGS`.

Suggested explanation text:

```txt
This compares theoretical consumed food cost from POS receipt lines against food/grocery spending recorded in Company Ledger. Timing differences are expected because purchases and sales do not always happen in the same period.
```

## Category multi-select

Options source:

```ts
COMPANY_LEDGER_PROP_VALUES.category
```

Default selected value:

```ts
['Food & Groceries']
```

Do not include `Staff Food` by default.

If a reusable multi-select component exists, use it. Otherwise, a simple checkbox dropdown is enough for the first implementation.

## Testing plan

Add unit tests for the server-side calculation helpers if logic is extracted cleanly.

Suggested test cases:

1. Default categories use only `Food & Groceries`.
2. Ledger rows of any status/type are counted when the category matches.
3. `Staff Food` is excluded unless explicitly selected by the UI.
4. Null/zero `cost_total` contributes `0` and increments missing COGS line count.
5. Difference equals `ledger amount - Loyverse COGS`.
6. Custom date range resolves correctly.

Do **not** run `pnpm check`, `svelte check`, or `pnpm build` in this project, per repo guidance.

## Implementation order

1. Create period/date helper logic, using Bangkok dates.
2. Create `src/lib/server/cogs-reconciliation.ts`.
3. Add `getCogsReconciliationDashboard` to `src/lib/mgmt-dashboard.remote.ts`.
4. Create `CostOfGoodsReconciliation.svelte`.
5. Embed it in `BalanceReconciliationPanel.svelte`.
6. Add focused unit tests for pure helper functions.
7. Manually inspect dashboard behavior via existing dev server/tmux logs if needed, without running noisy project-wide checks.

## Open implementation notes

- Decide whether receipt date filtering should use `created_at`, `receipt_date`, or `coalesce(created_at, receipt_date)`. Existing management dashboard overview currently uses `created_at` for today's sales and line COGS; receipt analytics sometimes uses coalesced dates. Prefer consistency with the dashboard unless business logic requires receipt-date semantics.
- Consider displaying a clear warning when many POS lines have missing/zero COGS, because then the Loyverse side under-reports theoretical cost.
- Timing differences are normal, so avoid framing any difference as automatically wrong. Use wording like `watch` or `review` rather than `error`.
