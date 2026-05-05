import { query } from '$app/server';
import * as v from 'valibot';
import { queryReceiptsFromDb } from '$lib/server/db/receipt-queries';
import { queryReceiptAnalyticsFromDb } from '$lib/server/db/receipt-analytics';

const ReceiptsQuerySchema = v.object({
  dateFrom: v.optional(v.string()),
  dateTo: v.optional(v.string()),
  storeId: v.optional(v.string()),
  limit: v.optional(v.number()),
  cursor: v.optional(v.string())
});

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

    return {
      receipts: response.receipts ?? [],
      cursor: response.cursor ?? null,
      hasMore: Boolean(response.cursor)
    };
  }
);

export const getReceiptAnalytics = query(
  v.object({
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    storeId: v.optional(v.string())
  }),
  async ({ dateFrom, dateTo, storeId }) => {
    return queryReceiptAnalyticsFromDb({ dateFrom, dateTo, storeId });
  }
);
