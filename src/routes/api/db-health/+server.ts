import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { queryReceiptsFromDb } from '$lib/server/db/receipt-queries';

const CONNECTION_ENV_ORDER = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING'
] as const;

const EXPECTED_RECEIPT_COLUMNS = [
  'receipt_key',
  'merchant_id',
  'receipt_number',
  'receipt_type',
  'source',
  'note',
  'order',
  'refund_for',
  'customer_id',
  'employee_id',
  'store_id',
  'pos_device_id',
  'dining_option',
  'created_at',
  'receipt_date',
  'cancelled_at',
  'total_money',
  'total_tax',
  'total_discount',
  'tip',
  'surcharge',
  'points_earned',
  'points_deducted',
  'points_balance',
  'updated_from_event_at',
  'synced_at'
] as const;

type Check = {
  ok: boolean;
  name: string;
  data?: unknown;
  error?: unknown;
};

type Row = Record<string, unknown>;

const mask = (value: string | null | undefined) => {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}…${value.slice(-2)}`;
};

const describeDatabaseUrl = (value: string | undefined) => {
  if (!value?.trim()) return { present: false };

  try {
    const parsed = new URL(value);
    return {
      present: true,
      validPostgresUrl: parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:',
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parsed.port || null,
      database: parsed.pathname.replace(/^\//, '') || null,
      user: mask(decodeURIComponent(parsed.username)),
      passwordPresent: Boolean(parsed.password),
      sslmode: parsed.searchParams.get('sslmode'),
      connectTimeout: parsed.searchParams.get('connect_timeout'),
      pooledHost: parsed.hostname.includes('-pooler.')
    };
  } catch (error) {
    return {
      present: true,
      validPostgresUrl: false,
      parseError: error instanceof Error ? error.message : String(error)
    };
  }
};

const serializeError = (error: unknown, depth = 0): unknown => {
  if (depth > 4) return '[max-depth]';

  if (error instanceof Error) {
    const withMaybeFields = error as Error & {
      code?: unknown;
      detail?: unknown;
      hint?: unknown;
      severity?: unknown;
      cause?: unknown;
    };

    return {
      name: error.name,
      message: error.message,
      code: withMaybeFields.code,
      severity: withMaybeFields.severity,
      detail: withMaybeFields.detail,
      hint: withMaybeFields.hint,
      cause: withMaybeFields.cause ? serializeError(withMaybeFields.cause, depth + 1) : undefined
    };
  }

  if (typeof error === 'object' && error !== null) {
    return Object.fromEntries(
      Object.entries(error as Record<string, unknown>).map(([key, value]) => [
        key,
        key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')
          ? '[redacted]'
          : serializeError(value, depth + 1)
      ])
    );
  }

  return error;
};

const runCheck = async (name: string, check: () => Promise<unknown>): Promise<Check> => {
  try {
    return { ok: true, name, data: await check() };
  } catch (error) {
    console.error(`[db-health] ${name} failed`, error);
    return { ok: false, name, error: serializeError(error) };
  }
};

const rowsOf = async <T extends Row>(query: ReturnType<typeof sql>): Promise<T[]> => {
  const result = await db.execute(query);
  return result as unknown as T[];
};

export const GET: RequestHandler = async ({ url }) => {
  const selectedEnvKey = CONNECTION_ENV_ORDER.find((key) => env[key]?.trim()) ?? null;
  const dateTo = url.searchParams.get('dateTo') ?? new Date().toISOString();
  const dateFrom =
    url.searchParams.get('dateFrom') ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const storeId = url.searchParams.get('storeId') ?? undefined;

  const envSummary = Object.fromEntries(
    CONNECTION_ENV_ORDER.map((key) => [key, describeDatabaseUrl(env[key])])
  );

  const checks = await Promise.all([
    runCheck('runtime database identity', async () => {
      const [row] = await rowsOf<{
        current_database: string;
        current_user: string;
        current_schema: string;
        server_version: string;
        now: string;
      }>(sql`
        select
          current_database() as current_database,
          current_user as current_user,
          current_schema() as current_schema,
          version() as server_version,
          now()::text as now
      `);
      return row;
    }),

    runCheck('receipts table exists', async () => {
      const [row] = await rowsOf<{ exists: boolean }>(sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public' and table_name = 'receipts'
        ) as exists
      `);
      if (!row?.exists) throw new Error('public.receipts table does not exist');
      return row;
    }),

    runCheck('receipts columns', async () => {
      const columns = await rowsOf<{ column_name: string; data_type: string; is_nullable: string }>(sql`
        select column_name, data_type, is_nullable
        from information_schema.columns
        where table_schema = 'public' and table_name = 'receipts'
        order by ordinal_position
      `);

      const found = new Set(columns.map((column) => column.column_name));
      const missing = EXPECTED_RECEIPT_COLUMNS.filter((column) => !found.has(column));
      if (missing.length) throw new Error(`receipts is missing expected columns: ${missing.join(', ')}`);

      return {
        count: columns.length,
        missing,
        columns
      };
    }),

    runCheck('receipts count', async () => {
      const [row] = await rowsOf<{ count: string }>(sql`select count(*)::text as count from receipts`);
      return row;
    }),

    runCheck('exact receipts query shape', async () => {
      const rows = await rowsOf(sql`
        select
          "receipt_key", "merchant_id", "receipt_number", "receipt_type", "source", "note", "order",
          "refund_for", "customer_id", "employee_id", "store_id", "pos_device_id", "dining_option",
          "created_at", "receipt_date", "cancelled_at", "total_money", "total_tax", "total_discount",
          "tip", "surcharge", "points_earned", "points_deducted", "points_balance",
          "updated_from_event_at", "synced_at"
        from "receipts"
        where "receipts"."created_at" >= ${dateFrom}::timestamptz
          and "receipts"."created_at" <= ${dateTo}::timestamptz
          ${storeId ? sql`and "receipts"."store_id" = ${storeId}` : sql``}
        order by "receipts"."updated_from_event_at" desc, "receipts"."receipt_key" desc
        limit 1
      `);
      return { rowsReturned: rows.length, dateFrom, dateTo, storeId: storeId ?? null };
    }),

    runCheck('drizzle receipt query path', async () => {
      const response = await queryReceiptsFromDb({ dateFrom, dateTo, storeId, limit: 1 });
      return {
        rowsReturned: response.receipts.length,
        hasMore: response.hasMore,
        cursorPresent: Boolean(response.cursor),
        firstReceiptNumber: response.receipts[0]?.receipt_number ?? null
      };
    })
  ]);

  const ok = checks.every((check) => check.ok);

  return json(
    {
      ok,
      timestamp: new Date().toISOString(),
      selectedConnectionEnv: selectedEnvKey,
      env: envSummary,
      queryWindow: { dateFrom, dateTo, storeId: storeId ?? null },
      checks
    },
    { status: ok ? 200 : 500 }
  );
};
