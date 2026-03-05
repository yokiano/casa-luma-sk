import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ingestReceiptWebhookWithDb } from '../src/lib/server/db/ingest-receipt-core';
import * as schema from '../src/lib/server/db/schema';
import type { LoyverseReceipt } from '../src/lib/receipts/types';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const BASE_URL = 'https://api.loyverse.com/v1.0';
const PROGRESS_EVERY = 25;

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  'postgres://app:app@localhost:5432/casa_luma';

const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false
});

const db = drizzle(sql, { schema });

interface ScriptOptions {
  merchantId: string;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  receiptNumber?: string;
  dryRun: boolean;
  max: number | null;
  concurrency: number;
}

interface LoyverseReceiptsApiResponse {
  receipts?: LoyverseReceipt[];
  cursor?: string;
}

const sanitizeJsonValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.replace(/\u0000/g, '');
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJsonValue(entry));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = sanitizeJsonValue(entry);
    }
    return output;
  }

  return value;
};

const parseArgs = (): ScriptOptions => {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    merchantId: process.env.LOYVERSE_MERCHANT_ID ?? '',
    dateFrom: undefined,
    dateTo: undefined,
    storeId: undefined,
    receiptNumber: undefined,
    dryRun: false,
    max: null,
    concurrency: 8
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--merchant-id' && next) {
      options.merchantId = next;
      index += 1;
      continue;
    }

    if (arg === '--date-from' && next) {
      options.dateFrom = next;
      index += 1;
      continue;
    }

    if (arg === '--date-to' && next) {
      options.dateTo = next;
      index += 1;
      continue;
    }

    if (arg === '--store-id' && next) {
      options.storeId = next;
      index += 1;
      continue;
    }

    if (arg === '--receipt-number' && next) {
      options.receiptNumber = next;
      index += 1;
      continue;
    }

    if (arg === '--max' && next) {
      const parsed = Number(next);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --max value: ${next}`);
      }
      options.max = Math.floor(parsed);
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--concurrency' && next) {
      const parsed = Number(next);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --concurrency value: ${next}`);
      }
      options.concurrency = Math.min(Math.floor(parsed), 25);
      index += 1;
      continue;
    }
  }

  if (!options.merchantId) {
    throw new Error('Missing merchant id. Set LOYVERSE_MERCHANT_ID or pass --merchant-id <value>.');
  }

  return options;
};

const buildReceiptsUrl = (options: {
  cursor?: string;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  receiptNumber?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.set('limit', '250');

  if (options.cursor) searchParams.set('cursor', options.cursor);
  if (options.dateFrom) searchParams.set('created_at_min', options.dateFrom);
  if (options.dateTo) searchParams.set('created_at_max', options.dateTo);
  if (options.storeId) searchParams.set('store_id', options.storeId);
  if (options.receiptNumber) searchParams.set('receipt_numbers', options.receiptNumber);

  return `${BASE_URL}/receipts?${searchParams.toString()}`;
};

const fetchReceiptsPage = async (token: string, options: Parameters<typeof buildReceiptsUrl>[0]) => {
  const response = await fetch(buildReceiptsUrl(options), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Loyverse receipts API error (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as LoyverseReceiptsApiResponse;
};

const main = async () => {
  const token = process.env.LOYVERSE_ACCESS_TOKEN;
  if (!token) {
    throw new Error('LOYVERSE_ACCESS_TOKEN is required.');
  }

  const options = parseArgs();
  const counters = {
    fetched: 0,
    processed: 0,
    duplicate: 0,
    stale: 0,
    skipped: 0,
    failed: 0
  };

  let cursor: string | undefined;
  let page = 0;
  let stop = false;

  console.log('[backfill] starting', {
    merchantId: options.merchantId,
    dateFrom: options.dateFrom ?? null,
    dateTo: options.dateTo ?? null,
    storeId: options.storeId ?? null,
    receiptNumber: options.receiptNumber ?? null,
    dryRun: options.dryRun,
    max: options.max,
    concurrency: options.concurrency
  });

  while (!stop) {
    const pageStartedAt = Date.now();
    page += 1;
    const data = await fetchReceiptsPage(token, {
      cursor,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      storeId: options.storeId,
      receiptNumber: options.receiptNumber
    });

    const receipts = data.receipts ?? [];
    counters.fetched += receipts.length;

    let index = 0;
    while (index < receipts.length) {
      if (options.max !== null && counters.processed + counters.duplicate + counters.stale >= options.max) {
        stop = true;
        break;
      }

      const remainingToMax =
        options.max === null
          ? receipts.length - index
          : Math.max(options.max - (counters.processed + counters.duplicate + counters.stale), 0);
      if (remainingToMax === 0) {
        stop = true;
        break;
      }

      const batchSize = Math.min(options.concurrency, receipts.length - index, remainingToMax);
      const batch = receipts.slice(index, index + batchSize);

      if (options.dryRun) {
        for (const receipt of batch) {
          const eventCreatedAt = receipt.updated_at ?? receipt.created_at;
          if (!eventCreatedAt || !receipt.receipt_number) counters.skipped += 1;
          else counters.processed += 1;
        }
      } else {
        const results = await Promise.all(
          batch.map(async (receipt) => {
            const sanitizedReceipt = sanitizeJsonValue(receipt) as LoyverseReceipt;
            const eventCreatedAt = sanitizedReceipt.updated_at ?? sanitizedReceipt.created_at;
            if (!eventCreatedAt || !sanitizedReceipt.receipt_number) {
              return { status: 'skipped' as const, receiptNumber: sanitizedReceipt.receipt_number };
            }

            try {
              const result = await ingestReceiptWebhookWithDb(db, {
                merchant_id: options.merchantId,
                type: 'receipt.backfill.import',
                created_at: eventCreatedAt,
                items: sanitizedReceipt
              });
              return { status: result.status, receiptNumber: sanitizedReceipt.receipt_number };
            } catch (error) {
              return {
                status: 'failed' as const,
                receiptNumber: sanitizedReceipt.receipt_number,
                error: error instanceof Error ? error.message : String(error),
                rawError: error
              };
            }
          })
        );

        for (const result of results) {
          if (result.status === 'processed') counters.processed += 1;
          else if (result.status === 'duplicate') counters.duplicate += 1;
          else if (result.status === 'stale') counters.stale += 1;
          else if (result.status === 'skipped') counters.skipped += 1;
          else if (result.status === 'failed') {
            counters.failed += 1;
            console.error('[backfill] failed receipt', {
              receiptNumber: result.receiptNumber,
              error: result.error,
              rawError: result.rawError
            });
          }
        }
      }

      index += batch.length;
      if (index % PROGRESS_EVERY === 0 || index === receipts.length) {
        console.log('[backfill] progress', {
          page,
          pageProgress: `${index}/${receipts.length}`,
          counters
        });
      }
    }

    console.log('[backfill] page done', {
      page,
      pageCount: receipts.length,
      cursor: data.cursor ?? null,
      elapsedMs: Date.now() - pageStartedAt,
      counters
    });

    if (stop || !data.cursor || receipts.length === 0) {
      break;
    }

    cursor = data.cursor;
  }

  console.log('[backfill] complete', counters);
};

main().catch((error) => {
  console.error('[backfill] fatal', error);
  process.exitCode = 1;
}).finally(async () => {
  await sql.end({ timeout: 5 });
});
