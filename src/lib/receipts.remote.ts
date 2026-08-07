import { command, query } from '$app/server';
import * as v from 'valibot';
import { deleteReceiptByNumberFromDb, queryReceiptsFromDb } from '$lib/server/db/receipt-queries';
import {
  queryReceiptAnalyticsFromDb,
  searchReceiptAnalyticsFilterOptionsFromDb
} from '$lib/server/db/receipt-analytics';

const ReceiptsQuerySchema = v.object({
  dateFrom: v.optional(v.string()),
  dateTo: v.optional(v.string()),
  storeId: v.optional(v.string()),
  customerId: v.optional(v.string()),
  limit: v.optional(v.number()),
  cursor: v.optional(v.string())
});

const DeleteReceiptSchema = v.object({
  receiptNumber: v.pipe(v.string(), v.trim(), v.minLength(1)),
  merchantId: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1)))
});

export const getReceipts = query(
  ReceiptsQuerySchema,
  async ({ dateFrom, dateTo, storeId, customerId, limit, cursor }) => {
    const response = await queryReceiptsFromDb({
      dateFrom,
      dateTo,
      storeId,
      customerId,
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

const AnalyticsIdListSchema = v.optional(
  v.pipe(v.array(v.pipe(v.string(), v.trim(), v.minLength(1))), v.maxLength(20))
);

export const getReceiptAnalytics = query(
  v.object({
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    storeId: v.optional(v.string()),
    customerId: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
    itemIds: AnalyticsIdListSchema,
    paymentTypeIds: AnalyticsIdListSchema,
    customerPresence: v.optional(v.picklist(['assigned', 'unassigned']))
  }),
  async (input) => queryReceiptAnalyticsFromDb(input)
);

export const searchReceiptAnalyticsFilterOptions = query(
  v.object({
    kind: v.picklist(['item', 'payment']),
    search: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80))
  }),
  async ({ kind, search }) => searchReceiptAnalyticsFilterOptionsFromDb(kind, search)
);

// TODO: Owner-only once authorization exists; currently unguarded because auth is not implemented.
export const deleteReceipt = command(DeleteReceiptSchema, async ({ receiptNumber, merchantId }) => {
  const result = await deleteReceiptByNumberFromDb({ receiptNumber, merchantId });

  if (!result.deleted) {
    throw new Error('Receipt not found. It may have already been deleted.');
  }

  return result;
});
