import { command, query } from '$app/server';
import { env } from '$env/dynamic/private';
import { sql } from 'drizzle-orm';
import * as v from 'valibot';
import { db, getDatabaseEnvKey } from '$lib/server/db/client';
import { incidentReporter } from '$lib/server/incidents';

type Row = Record<string, unknown>;

const RECEIPT_FRESHNESS_MIN_COUNT = 5;

const rowsOf = async <T extends Row>(statement: ReturnType<typeof sql>): Promise<T[]> => {
  const result = await db.execute(statement);
  return result as unknown as T[];
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  return { message: String(error) };
};

const toIsoOrNull = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const parseNumber = (value: unknown) => Number(value ?? 0);

const maskPresence = (value: string | undefined) => ({
  present: Boolean(value?.trim())
});

export const getTodayDashboardOverview = query(async () => {
  const [row] = await rowsOf<{
    sales_total: string | number | null;
    refund_total: string | number | null;
    net_total: string | number | null;
    receipt_count: string | number | null;
    sale_count: string | number | null;
    refund_count: string | number | null;
  }>(sql`
    select
      coalesce(sum(case when receipt_type is distinct from 'REFUND' then total_money else 0 end), 0)::text as sales_total,
      coalesce(sum(case when receipt_type = 'REFUND' then abs(total_money) else 0 end), 0)::text as refund_total,
      coalesce(sum(total_money), 0)::text as net_total,
      count(*)::text as receipt_count,
      count(*) filter (where receipt_type is distinct from 'REFUND')::text as sale_count,
      count(*) filter (where receipt_type = 'REFUND')::text as refund_count
    from receipts
    where (created_at at time zone 'Asia/Bangkok')::date = (now() at time zone 'Asia/Bangkok')::date
  `);

  return {
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()),
    salesTotal: parseNumber(row?.sales_total),
    refundTotal: parseNumber(row?.refund_total),
    netTotal: parseNumber(row?.net_total),
    receiptCount: parseNumber(row?.receipt_count),
    saleCount: parseNumber(row?.sale_count),
    refundCount: parseNumber(row?.refund_count)
  };
});

export const getDatabaseHealth = query(async () => {
  const startedAt = Date.now();

  try {
    const [identity] = await rowsOf<{
      current_database: string;
      current_user: string;
      now: string;
    }>(sql`
      select
        current_database() as current_database,
        current_user as current_user,
        now()::text as now
    `);

    const [tables] = await rowsOf<{
      receipts_exists: boolean;
      reported_errors_exists: boolean;
      webhook_events_exists: boolean;
    }>(sql`
      select
        to_regclass('public.receipts') is not null as receipts_exists,
        to_regclass('public.reported_errors') is not null as reported_errors_exists,
        to_regclass('public.webhook_events') is not null as webhook_events_exists
    `);

    const missingTables = [
      ['receipts', tables?.receipts_exists],
      ['reported_errors', tables?.reported_errors_exists],
      ['webhook_events', tables?.webhook_events_exists]
    ]
      .filter(([, exists]) => !exists)
      .map(([name]) => name as string);

    return {
      ok: missingTables.length === 0,
      status: missingTables.length === 0 ? 'healthy' : 'warning',
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      selectedConnectionEnv: getDatabaseEnvKey(),
      database: identity?.current_database ?? null,
      user: identity?.current_user ?? null,
      serverNow: toIsoOrNull(identity?.now),
      missingTables
    };
  } catch (error) {
    return {
      ok: false,
      status: 'critical',
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      selectedConnectionEnv: getDatabaseEnvKey(),
      error: serializeError(error)
    };
  }
});

export const getReceiptFreshnessHealth = query(async () => {
  const startedAt = Date.now();

  try {
    const [row] = await rowsOf<{
      receipts_last_24h: string | number | null;
      latest_created_at: string | Date | null;
      latest_synced_at: string | Date | null;
      total_receipts: string | number | null;
    }>(sql`
      select
        count(*) filter (where created_at >= now() - interval '24 hours')::text as receipts_last_24h,
        max(created_at)::text as latest_created_at,
        max(synced_at)::text as latest_synced_at,
        count(*)::text as total_receipts
      from receipts
    `);

    const receiptsLast24h = parseNumber(row?.receipts_last_24h);
    const latestCreatedAt = toIsoOrNull(row?.latest_created_at);
    const latestSyncedAt = toIsoOrNull(row?.latest_synced_at);
    const latestReceiptAgeMinutes = latestCreatedAt
      ? Math.round((Date.now() - new Date(latestCreatedAt).getTime()) / 60000)
      : null;

    return {
      ok: receiptsLast24h >= RECEIPT_FRESHNESS_MIN_COUNT,
      status: receiptsLast24h >= RECEIPT_FRESHNESS_MIN_COUNT ? 'healthy' : 'warning',
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      threshold: RECEIPT_FRESHNESS_MIN_COUNT,
      receiptsLast24h,
      latestCreatedAt,
      latestSyncedAt,
      latestReceiptAgeMinutes,
      totalReceipts: parseNumber(row?.total_receipts)
    };
  } catch (error) {
    return {
      ok: false,
      status: 'critical',
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      threshold: RECEIPT_FRESHNESS_MIN_COUNT,
      error: serializeError(error)
    };
  }
});

export const getIncidentHealth = query(async () => {
  const startedAt = Date.now();

  try {
    const [summary] = await rowsOf<{
      critical_last_24h: string | number | null;
      warning_last_24h: string | number | null;
      notify_errors_open: string | number | null;
      last_incident_at: string | Date | null;
      last_notified_at: string | Date | null;
    }>(sql`
      select
        count(*) filter (where source = 'receipt-webhook' and severity = 'critical' and created_at >= now() - interval '24 hours')::text as critical_last_24h,
        count(*) filter (where source = 'receipt-webhook' and severity = 'warning' and created_at >= now() - interval '24 hours')::text as warning_last_24h,
        count(*) filter (where notify_error is not null and notify_error <> '')::text as notify_errors_open,
        max(created_at)::text as last_incident_at,
        max(notified_at)::text as last_notified_at
      from reported_errors
    `);

    const [latest] = await rowsOf<{
      id: string | number;
      created_at: string | Date;
      source: string;
      code: string;
      severity: string;
      message: string;
      notified: boolean;
      notify_error: string | null;
    }>(sql`
      select id, created_at::text, source, code, severity, message, notified, notify_error
      from reported_errors
      order by created_at desc
      limit 1
    `);

    const criticalLast24h = parseNumber(summary?.critical_last_24h);
    const notifyErrorsOpen = parseNumber(summary?.notify_errors_open);

    return {
      ok: criticalLast24h === 0 && notifyErrorsOpen === 0,
      status: criticalLast24h === 0 && notifyErrorsOpen === 0 ? 'healthy' : 'warning',
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      criticalLast24h,
      warningLast24h: parseNumber(summary?.warning_last_24h),
      notifyErrorsOpen,
      lastIncidentAt: toIsoOrNull(summary?.last_incident_at),
      lastNotifiedAt: toIsoOrNull(summary?.last_notified_at),
      telegram: {
        botToken: maskPresence(env.TELEGRAM_BOT_TOKEN),
        chatId: maskPresence(env.TELEGRAM_CHAT_ID),
        messageThreadId: maskPresence(env.TELEGRAM_MESSAGE_THREAD_ID)
      },
      latestIncident: latest
        ? {
            id: Number(latest.id),
            createdAt: toIsoOrNull(latest.created_at),
            source: latest.source,
            code: latest.code,
            severity: latest.severity,
            message: latest.message,
            notified: latest.notified,
            notifyError: latest.notify_error
          }
        : null
    };
  } catch (error) {
    return {
      ok: false,
      status: 'critical',
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      error: serializeError(error)
    };
  }
});

export const sendTestTelegramAlert = command(v.object({}), async () => {
  const result = await incidentReporter.report({
    source: 'mgmt-dashboard',
    code: 'TEST_TELEGRAM_ALERT',
    severity: 'critical',
    message: 'Manual Telegram alert test from the management dashboard.',
    context: {
      trigger: 'mgmt-dashboard',
      sentAt: new Date().toISOString()
    },
    payload: {
      note: 'This is a deliberate test alert. No action is required.'
    }
  });

  return {
    ...result,
    sentAt: new Date().toISOString()
  };
});
