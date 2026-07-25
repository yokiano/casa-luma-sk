import { describe, expect, it } from 'vitest';
import { webhookEvents } from './schema';
import { ingestReceiptWebhookWithDb } from './ingest-receipt-core';

const payload = {
  merchant_id: 'merchant-1',
  type: 'RECEIPT_CREATED',
  created_at: '2026-01-12T04:15:00.000Z',
  items: {
    receipt_number: 'R-RETRY',
    receipt_type: 'SALE' as const,
    line_items: []
  }
};

const createFakeDatabase = () => {
  let eventInserted = false;
  let processed = false;
  let processingStartedAt: Date | null = null;
  let transactionCount = 0;
  const updates: Record<string, unknown>[] = [];

  const updateResult = (values: Record<string, unknown>) => {
    const apply = () => {
      updates.push(values);
      if ('processingStartedAt' in values) processingStartedAt = (values.processingStartedAt as Date | null) ?? null;
      if (values.processed === true) processed = true;
      if (values.processed === false) processed = false;
    };
    return {
      returning: async () => {
        apply();
        if (values.processed === undefined && values.processingStartedAt instanceof Date && !processed) {
          return [{ id: 1 }];
        }
        return [];
      },
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve().then(() => {
          apply();
          resolve(undefined);
        }).catch(reject)
    };
  };

  const database: any = {
    insert(table: unknown) {
      if (table === webhookEvents) {
        return {
          values: () => ({
            onConflictDoNothing: () => ({
              returning: async () => {
                if (eventInserted) return [];
                eventInserted = true;
                return [{ id: 1 }];
              }
            })
          })
        };
      }
      return {
        values: () => ({
          onConflictDoUpdate: async () => undefined
        })
      };
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 1, processed, processingStartedAt }]
        })
      })
    }),
    update: (_table: unknown) => ({
      set: (values: Record<string, unknown>) => ({ where: () => updateResult(values) })
    }),
    query: { receipts: { findFirst: async () => null } },
    transaction: async (callback: (tx: any) => Promise<void>) => {
      transactionCount += 1;
      if (transactionCount === 1) throw Object.assign(new Error('temporary connection failure'), { code: 'ECONNRESET' });
      await callback({
        insert: () => ({ values: () => ({ onConflictDoUpdate: async () => undefined }) }),
        delete: () => ({ where: async () => undefined })
      });
    },
    state: () => ({ eventInserted, processed, processingStartedAt, updates })
  };

  return database;
};

describe('receipt webhook event ingestion idempotency', () => {
  it('retries an unprocessed event and treats the processed event as a duplicate', async () => {
    const database = createFakeDatabase();

    await expect(ingestReceiptWebhookWithDb(database, payload)).rejects.toThrow('temporary connection failure');

    const retry = await ingestReceiptWebhookWithDb(database, payload);
    expect(retry.status).toBe('processed');
    expect(database.state().updates.some((update) => update.errorMessage)).toBe(true);

    const duplicate = await ingestReceiptWebhookWithDb(database, payload);
    expect(duplicate.status).toBe('duplicate');
  });
});
