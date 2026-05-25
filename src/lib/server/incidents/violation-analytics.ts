import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { getReceiptValidationMetadata, receiptValidationMetadata } from '$lib/receipts/validation/metadata';

const VALIDATION_INCIDENT_CODES = [
  'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
  'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR'
] as const;

const RECENT_INCIDENT_LIMIT = 40;
const validationIncidentCodeSql = VALIDATION_INCIDENT_CODES.map((code) => sql`${code}`);

export type ViolationTimeframe = '7d' | '30d' | '90d' | '12m' | 'all';
export type ViolationGroupBy = 'day' | 'week' | 'month';

export interface ViolationAnalyticsOptions {
  timeframe?: ViolationTimeframe;
  groupBy?: ViolationGroupBy;
}

export const violationTimeframes: Record<ViolationTimeframe, { label: string; intervalSql: string | null }> = {
  '7d': { label: '7 days', intervalSql: "interval '7 days'" },
  '30d': { label: '30 days', intervalSql: "interval '30 days'" },
  '90d': { label: '90 days', intervalSql: "interval '90 days'" },
  '12m': { label: '12 months', intervalSql: "interval '12 months'" },
  all: { label: 'All time', intervalSql: null }
};

export const violationGroupings: Record<ViolationGroupBy, { label: string; dateTrunc: string }> = {
  day: { label: 'Daily', dateTrunc: 'day' },
  week: { label: 'Weekly', dateTrunc: 'week' },
  month: { label: 'Monthly', dateTrunc: 'month' }
};

export const isViolationTimeframe = (value: string | null): value is ViolationTimeframe =>
  Boolean(value && value in violationTimeframes);

export const isViolationGroupBy = (value: string | null): value is ViolationGroupBy =>
  Boolean(value && value in violationGroupings);

type Row = Record<string, unknown>;

type IncidentJson = Record<string, unknown> | null | undefined;

export interface ViolationSummary {
  code: string;
  label: string;
  description: string;
  protectsFrom: string;
  count: number;
  lastSeenAt: string | null;
  firstSeenAt: string | null;
  last24h: number;
  last7d: number;
  previous7d: number;
  criticalCount: number;
  recentTrend: 'up' | 'down' | 'flat' | 'new';
}

export interface ViolationDailyBucket {
  code: string;
  day: string;
  count: number;
}

export interface ViolationIncidentListItem {
  id: number;
  createdAt: string | null;
  source: string;
  code: string;
  severity: string;
  message: string;
  receiptKey: string | null;
  merchantId: string | null;
  violationCodes: string[];
}

export interface ViolationAnalytics {
  summaries: ViolationSummary[];
  recentIncidents: ViolationIncidentListItem[];
  dailyBuckets: ViolationDailyBucket[];
  knownViolations: ReturnType<typeof getReceiptValidationMetadata>[];
  timeframe: ViolationTimeframe;
  groupBy: ViolationGroupBy;
  timeframeLabel: string;
  groupByLabel: string;
  generatedAt: string;
}

const rowsOf = async <T extends Row>(statement: ReturnType<typeof sql>): Promise<T[]> => {
  const result = await db.execute(statement);
  return result as unknown as T[];
};

const toIsoOrNull = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const parseNumber = (value: unknown): number => Number(value ?? 0);

const asRecord = (value: unknown): IncidentJson =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const addCode = (codes: Set<string>, value: unknown) => {
  if (typeof value !== 'string') return;
  const code = value.trim();
  if (code) codes.add(code);
};

const addCodesFromArray = (codes: Set<string>, value: unknown) => {
  if (!Array.isArray(value)) return;
  for (const entry of value) addCode(codes, entry);
};

const addFindingCodes = (codes: Set<string>, value: unknown) => {
  if (!Array.isArray(value)) return;
  for (const entry of value) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) addCode(codes, (entry as Record<string, unknown>).code);
  }
};

export const extractViolationCodesFromIncident = ({
  code,
  context,
  payload
}: {
  code: string;
  context?: unknown;
  payload?: unknown;
}): string[] => {
  const codes = new Set<string>();
  const contextRecord = asRecord(context);
  const payloadRecord = asRecord(payload);

  addCodesFromArray(codes, contextRecord?.failedChecks);
  addCode(codes, contextRecord?.primaryFindingCode);
  addFindingCodes(codes, contextRecord?.validationFindingsSummary);
  addFindingCodes(codes, payloadRecord?.validationFindings);

  if (codes.size === 0 && code === 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR') {
    codes.add('RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR');
  }

  return [...codes].sort((a, b) => a.localeCompare(b));
};

const trendFor = (last7d: number, previous7d: number): ViolationSummary['recentTrend'] => {
  if (last7d > 0 && previous7d === 0) return 'new';
  if (last7d > previous7d) return 'up';
  if (last7d < previous7d) return 'down';
  return 'flat';
};

export const getViolationAnalytics = async (options: ViolationAnalyticsOptions = {}): Promise<ViolationAnalytics> => {
  const timeframe = options.timeframe ?? '30d';
  const groupBy = options.groupBy ?? (timeframe === '12m' || timeframe === 'all' ? 'month' : 'day');
  const timeframeConfig = violationTimeframes[timeframe];
  const groupConfig = violationGroupings[groupBy];
  const timeframeFilterSql = timeframeConfig.intervalSql
    ? sql`and created_at >= now() - ${sql.raw(timeframeConfig.intervalSql)}`
    : sql``;
  const bucketSql = sql.raw(`'${groupConfig.dateTrunc}'`);

  const [summaryRows, dailyRows, incidentRows] = await Promise.all([
    rowsOf<{
      violation_code: string;
      total_count: string | number | null;
      first_seen_at: string | Date | null;
      last_seen_at: string | Date | null;
      last_24h: string | number | null;
      last_7d: string | number | null;
      previous_7d: string | number | null;
      critical_count: string | number | null;
    }>(sql`
      with validation_incidents as (
        select *
        from reported_errors
        where code in (${sql.join(validationIncidentCodeSql, sql`, `)})
          ${timeframeFilterSql}
      ), extracted as (
        select id, created_at, severity, jsonb_array_elements_text(
          case when jsonb_typeof(context->'failedChecks') = 'array' then context->'failedChecks' else '[]'::jsonb end
        ) as violation_code
        from validation_incidents
        union all
        select id, created_at, severity, context->>'primaryFindingCode' as violation_code
        from validation_incidents
        where context->>'primaryFindingCode' is not null
        union all
        select id, created_at, severity, finding->>'code' as violation_code
        from validation_incidents,
          jsonb_array_elements(case when jsonb_typeof(payload->'validationFindings') = 'array' then payload->'validationFindings' else '[]'::jsonb end) as finding
        where finding->>'code' is not null
        union all
        select id, created_at, severity, finding->>'code' as violation_code
        from validation_incidents,
          jsonb_array_elements(case when jsonb_typeof(context->'validationFindingsSummary') = 'array' then context->'validationFindingsSummary' else '[]'::jsonb end) as finding
        where finding->>'code' is not null
        union all
        select id, created_at, severity, 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR' as violation_code
        from validation_incidents
        where code = 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR'
          and not (
            nullif(context->>'primaryFindingCode', '') is not null
            or (jsonb_typeof(context->'failedChecks') = 'array' and jsonb_array_length(context->'failedChecks') > 0)
            or (jsonb_typeof(context->'validationFindingsSummary') = 'array' and jsonb_array_length(context->'validationFindingsSummary') > 0)
            or (jsonb_typeof(payload->'validationFindings') = 'array' and jsonb_array_length(payload->'validationFindings') > 0)
          )
      ), per_incident_code as (
        select distinct id, created_at, severity, violation_code
        from extracted
        where violation_code is not null and violation_code <> ''
      )
      select
        violation_code,
        count(*)::text as total_count,
        min(created_at)::text as first_seen_at,
        max(created_at)::text as last_seen_at,
        count(*) filter (where created_at >= now() - interval '24 hours')::text as last_24h,
        count(*) filter (where created_at >= now() - interval '7 days')::text as last_7d,
        count(*) filter (where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days')::text as previous_7d,
        count(*) filter (where severity = 'critical')::text as critical_count
      from per_incident_code
      group by violation_code
      order by total_count desc, last_seen_at desc
    `),
    rowsOf<{
      violation_code: string;
      day: string | Date;
      count: string | number | null;
    }>(sql`
      with validation_incidents as (
        select *
        from reported_errors
        where code in (${sql.join(validationIncidentCodeSql, sql`, `)})
          ${timeframeFilterSql}
      ), extracted as (
        select id, created_at, jsonb_array_elements_text(
          case when jsonb_typeof(context->'failedChecks') = 'array' then context->'failedChecks' else '[]'::jsonb end
        ) as violation_code
        from validation_incidents
        union all
        select id, created_at, context->>'primaryFindingCode' as violation_code
        from validation_incidents
        where context->>'primaryFindingCode' is not null
        union all
        select id, created_at, finding->>'code' as violation_code
        from validation_incidents,
          jsonb_array_elements(case when jsonb_typeof(payload->'validationFindings') = 'array' then payload->'validationFindings' else '[]'::jsonb end) as finding
        where finding->>'code' is not null
        union all
        select id, created_at, finding->>'code' as violation_code
        from validation_incidents,
          jsonb_array_elements(case when jsonb_typeof(context->'validationFindingsSummary') = 'array' then context->'validationFindingsSummary' else '[]'::jsonb end) as finding
        where finding->>'code' is not null
        union all
        select id, created_at, 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR' as violation_code
        from validation_incidents
        where code = 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR'
          and not (
            nullif(context->>'primaryFindingCode', '') is not null
            or (jsonb_typeof(context->'failedChecks') = 'array' and jsonb_array_length(context->'failedChecks') > 0)
            or (jsonb_typeof(context->'validationFindingsSummary') = 'array' and jsonb_array_length(context->'validationFindingsSummary') > 0)
            or (jsonb_typeof(payload->'validationFindings') = 'array' and jsonb_array_length(payload->'validationFindings') > 0)
          )
      ), per_incident_code as (
        select distinct id, created_at, violation_code
        from extracted
        where violation_code is not null and violation_code <> ''
      )
      select violation_code, date_trunc(${bucketSql}, created_at)::date::text as day, count(*)::text as count
      from per_incident_code
      group by violation_code, date_trunc(${bucketSql}, created_at)::date
      order by day asc, violation_code asc
    `),
    rowsOf<{
      id: string | number;
      created_at: string | Date | null;
      source: string;
      code: string;
      severity: string;
      message: string;
      merchant_id: string | null;
      receipt_key: string | null;
      context: unknown;
      payload: unknown;
    }>(sql`
      select id, created_at::text, source, code, severity, message, merchant_id, receipt_key, context, payload
      from reported_errors
      where code in (${sql.join(validationIncidentCodeSql, sql`, `)})
        ${timeframeFilterSql}
      order by created_at desc
      limit ${RECENT_INCIDENT_LIMIT}
    `)
  ]);

  const summaryByCode = new Map<string, ViolationSummary>();

  for (const metadata of receiptValidationMetadata) {
    summaryByCode.set(metadata.code, {
      ...metadata,
      count: 0,
      lastSeenAt: null,
      firstSeenAt: null,
      last24h: 0,
      last7d: 0,
      previous7d: 0,
      criticalCount: 0,
      recentTrend: 'flat'
    });
  }

  for (const row of summaryRows) {
    const metadata = getReceiptValidationMetadata(row.violation_code);
    const last7d = parseNumber(row.last_7d);
    const previous7d = parseNumber(row.previous_7d);
    summaryByCode.set(row.violation_code, {
      ...metadata,
      count: parseNumber(row.total_count),
      lastSeenAt: toIsoOrNull(row.last_seen_at),
      firstSeenAt: toIsoOrNull(row.first_seen_at),
      last24h: parseNumber(row.last_24h),
      last7d,
      previous7d,
      criticalCount: parseNumber(row.critical_count),
      recentTrend: trendFor(last7d, previous7d)
    });
  }

  return {
    summaries: [...summaryByCode.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    dailyBuckets: dailyRows.map((row) => ({
      code: row.violation_code,
      day: String(row.day),
      count: parseNumber(row.count)
    })),
    recentIncidents: incidentRows.map((row) => ({
      id: Number(row.id),
      createdAt: toIsoOrNull(row.created_at),
      source: row.source,
      code: row.code,
      severity: row.severity,
      message: row.message,
      merchantId: row.merchant_id,
      receiptKey: row.receipt_key,
      violationCodes: extractViolationCodesFromIncident({ code: row.code, context: row.context, payload: row.payload })
    })),
    knownViolations: receiptValidationMetadata,
    timeframe,
    groupBy,
    timeframeLabel: timeframeConfig.label,
    groupByLabel: groupConfig.label,
    generatedAt: new Date().toISOString()
  };
};
