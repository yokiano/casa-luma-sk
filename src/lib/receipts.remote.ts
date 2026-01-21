import { query } from '$app/server';
import * as v from 'valibot';
import { loyverse } from '$lib/server/loyverse';

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
    const response = await loyverse.getReceipts({
      created_at_min: dateFrom,
      created_at_max: dateTo,
      store_id: storeId,
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
