import { sql } from 'drizzle-orm';
import { db } from './client';
import type { ReceiptAnalytics, ReceiptAnalyticsGranularity, ReceiptAnalyticsTimeSeriesPoint } from '$lib/receipts/analytics';
import { NOT_CONVERTED_DURATION_THRESHOLD_MINUTES } from '$lib/receipts/receipt-tools';

interface ReceiptAnalyticsQueryInput {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
}

type Row = Record<string, unknown>;

type DailyTimeSeriesRow = {
  day: string;
  revenue: number;
  sale_count: number;
  unassigned_customers: number;
};

const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const rowsOf = async <T extends Row>(query: ReturnType<typeof sql>): Promise<T[]> => {
  const result = await db.execute(query);
  return result as unknown as T[];
};

const num = (value: unknown) => Number(value ?? 0);
const str = (value: unknown, fallback = '—') => (typeof value === 'string' && value.length ? value : fallback);

const parseDay = (value: unknown) => {
  const raw = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '');
  return new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
};

const dayLabel = (value: unknown) => {
  const date = parseDay(value);
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
};

const monthLabel = (date: Date) => date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const startOfIsoWeek = (date: Date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - day + 1);
  return start;
};

const startOfMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const buildTimeSeries = (dailyRows: DailyTimeSeriesRow[]): Record<ReceiptAnalyticsGranularity, ReceiptAnalyticsTimeSeriesPoint[]> => {
  const aggregate = (granularity: ReceiptAnalyticsGranularity) => {
    const buckets = new Map<string, { bucketStart: Date; revenue: number; saleCount: number; unassignedCustomers: number }>();

    for (const row of dailyRows) {
      const date = parseDay(row.day);
      if (Number.isNaN(date.getTime())) continue;

      const bucketStart =
        granularity === 'week' ? startOfIsoWeek(date) : granularity === 'month' ? startOfMonth(date) : date;
      const key = isoDay(bucketStart);
      const current = buckets.get(key) ?? { bucketStart, revenue: 0, saleCount: 0, unassignedCustomers: 0 };
      current.revenue += num(row.revenue);
      current.saleCount += num(row.sale_count);
      current.unassignedCustomers += num(row.unassigned_customers);
      buckets.set(key, current);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucketStart, value]) => ({
        bucketStart,
        label:
          granularity === 'month'
            ? monthLabel(value.bucketStart)
            : granularity === 'week'
              ? `Week of ${dayLabel(bucketStart)}`
              : dayLabel(bucketStart),
        revenue: value.revenue,
        saleCount: value.saleCount,
        avgTicket: value.saleCount > 0 ? value.revenue / value.saleCount : 0,
        unassignedCustomers: value.unassignedCustomers
      }));
  };

  return {
    day: aggregate('day'),
    week: aggregate('week'),
    month: aggregate('month')
  };
};

const baseFilterSql = (dateFrom: Date | null, dateTo: Date | null, storeId?: string) => {
  const conditions = [];

  // Drizzle raw sql + postgres-js does not encode Date objects here, so pass ISO strings
  // and cast explicitly in SQL.
  if (dateFrom) conditions.push(sql`r.created_at >= ${dateFrom.toISOString()}::timestamptz`);
  if (dateTo) conditions.push(sql`r.created_at <= ${dateTo.toISOString()}::timestamptz`);
  if (storeId) conditions.push(sql`r.store_id = ${storeId}`);

  if (!conditions.length) return sql`true`;
  return sql.join(conditions, sql` and `);
};

export const queryReceiptAnalyticsFromDb = async ({
  dateFrom,
  dateTo,
  storeId
}: ReceiptAnalyticsQueryInput): Promise<ReceiptAnalytics> => {
  const from = toDate(dateFrom);
  const to = toDate(dateTo);
  const filterSql = () => baseFilterSql(from, to, storeId);

  const [summaryRows, topPaymentRows, peakHourRows, topItemRows, timeSeriesRows, hourRows, itemRevenueRows, paymentRevenueRows, dowRows] =
    await Promise.all([
      rowsOf<{
        receipt_count: number;
        sale_count: number;
        refund_count: number;
        total_revenue: number;
        total_refunds: number;
        total_discounts: number;
        total_tips: number;
        total_tax: number;
        total_surcharges: number;
        line_item_count: number;
        loyalty_total_with_id: number;
        loyalty_unique: number;
        unassigned_receipts_count: number;
        duration_receipts_count: number;
        avg_duration_minutes: number | null;
        long_stay_receipts_count: number;
      }>(sql`
        with filtered as (
          select r.*,
            (
              select match[1]
              from regexp_matches(r."order", '(\\d{1,2}:[0-5]\\d)', 'g') with ordinality as matches(match, ord)
              order by ord desc
              limit 1
            ) as order_start_time
          from receipts r
          where ${filterSql()}
        ), sale_receipts as (
          select * from filtered where receipt_type is distinct from 'REFUND'
        ), durations as (
          select receipt_key,
            case
              when order_start_time is null or coalesce(created_at, receipt_date) is null then null
              else (
                case
                  when extract(epoch from (coalesce(created_at, receipt_date) - (date_trunc('day', coalesce(created_at, receipt_date)) + (order_start_time::time)))) < 0
                    then extract(epoch from (coalesce(created_at, receipt_date) - (date_trunc('day', coalesce(created_at, receipt_date)) + (order_start_time::time)))) + 86400
                  else extract(epoch from (coalesce(created_at, receipt_date) - (date_trunc('day', coalesce(created_at, receipt_date)) + (order_start_time::time))))
                end
              ) / 60
            end as duration_minutes
          from sale_receipts
          where order_start_time ~ '^\\d{1,2}:[0-5]\\d'
        )
        select
          count(*)::int as receipt_count,
          count(*) filter (where receipt_type is distinct from 'REFUND')::int as sale_count,
          count(*) filter (where receipt_type = 'REFUND')::int as refund_count,
          coalesce(sum(total_money) filter (where receipt_type is distinct from 'REFUND'), 0)::float as total_revenue,
          coalesce(sum(abs(total_money)) filter (where receipt_type = 'REFUND'), 0)::float as total_refunds,
          coalesce(sum(total_discount) filter (where receipt_type is distinct from 'REFUND'), 0)::float as total_discounts,
          coalesce(sum(tip) filter (where receipt_type is distinct from 'REFUND'), 0)::float as total_tips,
          coalesce(sum(total_tax) filter (where receipt_type is distinct from 'REFUND'), 0)::float as total_tax,
          coalesce(sum(surcharge) filter (where receipt_type is distinct from 'REFUND'), 0)::float as total_surcharges,
          coalesce((select count(*) from receipt_line_items li join sale_receipts sr on sr.receipt_key = li.receipt_key), 0)::int as line_item_count,
          count(customer_id) filter (where receipt_type is distinct from 'REFUND')::int as loyalty_total_with_id,
          count(distinct customer_id) filter (where receipt_type is distinct from 'REFUND' and customer_id is not null)::int as loyalty_unique,
          count(*) filter (where receipt_type is distinct from 'REFUND' and customer_id is null)::int as unassigned_receipts_count,
          coalesce((select count(*) from durations where duration_minutes is not null), 0)::int as duration_receipts_count,
          (select avg(duration_minutes)::float from durations where duration_minutes is not null) as avg_duration_minutes,
          coalesce((select count(*) from durations where duration_minutes >= ${NOT_CONVERTED_DURATION_THRESHOLD_MINUTES}), 0)::int as long_stay_receipts_count
        from filtered
      `),
      rowsOf<{ label: string; receipt_count: number }>(sql`
        select coalesce(p.name, p.type, 'Unknown') as label, count(*)::int as receipt_count
        from receipt_payments p
        join receipts r on r.receipt_key = p.receipt_key
        where ${filterSql()} and r.receipt_type is distinct from 'REFUND'
        group by coalesce(p.name, p.type, 'Unknown')
        order by count(*) desc
        limit 1
      `),
      rowsOf<{ hour: number; receipt_count: number }>(sql`
        select hourly.hour, count(*)::int as receipt_count
        from (
          select extract(hour from coalesce(r.created_at, r.receipt_date))::int as hour
          from receipts r
          where ${filterSql()} and r.receipt_type is distinct from 'REFUND' and coalesce(r.created_at, r.receipt_date) is not null
        ) hourly
        group by hourly.hour
        order by count(*) desc
        limit 1
      `),
      rowsOf<{ label: string; quantity: number }>(sql`
        select coalesce(li.item_name, 'Unknown item') as label, coalesce(sum(li.quantity), 0)::float as quantity
        from receipt_line_items li
        join receipts r on r.receipt_key = li.receipt_key
        where ${filterSql()} and r.receipt_type is distinct from 'REFUND'
        group by coalesce(li.item_name, 'Unknown item')
        order by coalesce(sum(li.quantity), 0) desc
        limit 1
      `),
      rowsOf<DailyTimeSeriesRow>(sql`
        select
          date(coalesce(r.receipt_date, r.created_at)) as day,
          coalesce(sum(r.total_money), 0)::float as revenue,
          count(*)::int as sale_count,
          count(*) filter (where r.customer_id is null)::int as unassigned_customers
        from receipts r
        where ${filterSql()} and r.receipt_type is distinct from 'REFUND' and coalesce(r.receipt_date, r.created_at) is not null
        group by date(coalesce(r.receipt_date, r.created_at))
        order by date(coalesce(r.receipt_date, r.created_at))
      `),
      rowsOf<{ hour: number; receipt_count: number }>(sql`
        select hourly.hour, count(*)::int as receipt_count
        from (
          select extract(hour from coalesce(r.created_at, r.receipt_date))::int as hour
          from receipts r
          where ${filterSql()} and r.receipt_type is distinct from 'REFUND' and coalesce(r.created_at, r.receipt_date) is not null
        ) hourly
        group by hourly.hour
      `),
      rowsOf<{ label: string; revenue: number }>(sql`
        select coalesce(li.item_name, 'Unknown') as label, coalesce(sum(li.total_money), 0)::float as revenue
        from receipt_line_items li
        join receipts r on r.receipt_key = li.receipt_key
        where ${filterSql()} and r.receipt_type is distinct from 'REFUND'
        group by coalesce(li.item_name, 'Unknown')
        order by coalesce(sum(li.total_money), 0) desc
        limit 20
      `),
      rowsOf<{ label: string; revenue: number }>(sql`
        select coalesce(p.name, p.type, 'Unknown') as label, coalesce(sum(p.money_amount), 0)::float as revenue
        from receipt_payments p
        join receipts r on r.receipt_key = p.receipt_key
        where ${filterSql()} and r.receipt_type is distinct from 'REFUND'
        group by coalesce(p.name, p.type, 'Unknown')
        order by coalesce(sum(p.money_amount), 0) desc
        limit 6
      `),
      rowsOf<{ dow: number; revenue: number }>(sql`
        select daily.dow, coalesce(sum(daily.revenue), 0)::float as revenue
        from (
          select extract(dow from coalesce(r.receipt_date, r.created_at))::int as dow, coalesce(r.total_money, 0) as revenue
          from receipts r
          where ${filterSql()} and r.receipt_type is distinct from 'REFUND' and coalesce(r.receipt_date, r.created_at) is not null
        ) daily
        group by daily.dow
      `)
    ]);

  const summary = summaryRows[0];
  const receiptCount = num(summary?.receipt_count);
  const saleCount = num(summary?.sale_count);
  const refundCount = num(summary?.refund_count);
  const loyaltyTotalWithId = num(summary?.loyalty_total_with_id);
  const loyaltyUnique = num(summary?.loyalty_unique);
  const peakHour = peakHourRows[0]?.hour ?? null;
  const hours = Array.from({ length: 24 }, (_, index) => ({ label: index.toString().padStart(2, '0'), count: 0 }));
  for (const row of hourRows) hours[num(row.hour)].count = num(row.receipt_count);

  const dow = new Array(7).fill(0).map((_, index) => ({ label: dayOfWeekNames[index], revenue: 0 }));
  for (const row of dowRows) dow[num(row.dow)].revenue = num(row.revenue);

  const timeSeries = buildTimeSeries(timeSeriesRows);

  return {
    summary: {
      totalRevenue: num(summary?.total_revenue),
      totalRefunds: num(summary?.total_refunds),
      saleCount,
      refundCount,
      receiptCount,
      totalDiscounts: num(summary?.total_discounts),
      totalTips: num(summary?.total_tips),
      lineItemCount: num(summary?.line_item_count),
      totalTax: num(summary?.total_tax),
      totalSurcharges: num(summary?.total_surcharges),
      topPaymentType: str(topPaymentRows[0]?.label),
      peakHour: peakHour === null ? '—' : `${String(peakHour).padStart(2, '0')}:00`,
      topItemName: str(topItemRows[0]?.label),
      topItemCount: num(topItemRows[0]?.quantity),
      loyaltyTotalWithId,
      loyaltyUnique,
      loyaltyRepeat: Math.max(0, loyaltyTotalWithId - loyaltyUnique),
      unassignedReceiptsCount: num(summary?.unassigned_receipts_count),
      durationReceiptsCount: num(summary?.duration_receipts_count),
      avgDurationMinutes: summary?.avg_duration_minutes == null ? null : num(summary.avg_duration_minutes),
      longStayReceiptsCount: num(summary?.long_stay_receipts_count)
    },
    timeSeries,
    revenueByDay: timeSeries.day.map((row) => ({ label: row.label, revenue: row.revenue })),
    receiptsByHour: hours,
    topItemsByRevenue: itemRevenueRows.map((row) => ({ label: str(row.label, 'Unknown'), revenue: num(row.revenue) })),
    paymentTypeRevenue: paymentRevenueRows.map((row) => ({ label: str(row.label, 'Unknown'), revenue: num(row.revenue) })),
    avgTicketByDay: timeSeries.day.map((row) => ({ label: row.label, avg: row.avgTicket })),
    revenueByDayOfWeek: dow
  };
};
