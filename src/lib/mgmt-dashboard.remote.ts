import { command, query } from '$app/server';
import { env } from '$env/dynamic/private';
import { sql } from 'drizzle-orm';
import * as v from 'valibot';
import { db, getDatabaseEnvKey } from '$lib/server/db/client';
import { incidentReporter } from '$lib/server/incidents';

type Row = Record<string, unknown>;

const RECEIPT_FRESHNESS_MIN_COUNT = 5;
const DEPARTMENT_MAPPING_DATABASE_ID = '9a4c14fedf4b44dda928b1a06ee759b6';
const DEPARTMENTS = ['playground', 'cafe', 'store', 'workshops'] as const;
const UNKNOWN_DEPARTMENT = 'unknown';

type Department = (typeof DEPARTMENTS)[number];
type DashboardDepartment = Department | typeof UNKNOWN_DEPARTMENT;

type LoyverseItem = {
  id: string;
  category_id?: string;
  deleted_at?: string;
  variants?: Array<{ variant_id: string }>;
};

type LoyverseCategory = {
  id: string;
  name: string;
  deleted_at?: string;
};

type LoyverseCategoryMaps = {
  loadedAt: number;
  categoryByItemId: Map<string, string>;
  categoryByVariantId: Map<string, string>;
};

type DepartmentMapping = {
  loadedAt: number;
  categoryToDepartment: Map<string, Department>;
  source: 'notion' | 'fallback';
};

let loyverseCategoryCache: LoyverseCategoryMaps | null = null;
let departmentMappingCache: DepartmentMapping | null = null;

const fallbackDepartmentCategories: Record<Department, string[]> = {
  playground: ['Entry', 'Membership', '(p4p) Art Equipment', '(p4p) Lego Figurine'],
  cafe: [
    'Breakfast Sets',
    'Coffee & Friends',
    'Comfort Food',
    'Crafted Croissants',
    'Cute Sandwich',
    'Desserts',
    'Healthy Treats',
    'House Smoothies',
    'Kid Sized Drinks',
    'Kids Favorites',
    'Kitchen Extras',
    'Light & Fresh',
    'More Vegan',
    'Pastries',
    'Personal Pizzas',
    'Premium Tea',
    'Proper Sandwiches',
    'Salads',
    'Soft Drinks'
  ],
  store: ['(store) All'],
  workshops: []
};

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
const normalizeCategory = (value: string) => value.trim().toLowerCase();

const buildFallbackDepartmentMapping = (): DepartmentMapping => {
  const categoryToDepartment = new Map<string, Department>();

  for (const department of DEPARTMENTS) {
    for (const category of fallbackDepartmentCategories[department]) {
      categoryToDepartment.set(normalizeCategory(category), department);
    }
  }

  return { loadedAt: Date.now(), categoryToDepartment, source: 'fallback' };
};

const getAllLoyverse = async <T>(endpoint: string, key: string, token: string): Promise<T[]> => {
  const all: T[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ limit: '250' });
    if (cursor) params.set('cursor', cursor);

    const response = await fetch(`https://api.loyverse.com/v1.0/${endpoint}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`${endpoint}: ${response.status} ${response.statusText}: ${await response.text()}`);

    const data = (await response.json()) as Record<string, unknown>;
    const rows = Array.isArray(data[key]) ? (data[key] as T[]) : [];
    all.push(...rows);
    cursor = typeof data.cursor === 'string' ? data.cursor : undefined;
  } while (cursor);

  return all;
};

const getLoyverseCategoryMaps = async (): Promise<LoyverseCategoryMaps> => {
  const ttlMs = 10 * 60 * 1000;
  if (loyverseCategoryCache && Date.now() - loyverseCategoryCache.loadedAt < ttlMs) return loyverseCategoryCache;

  try {
    const token = env.LOYVERSE_ACCESS_TOKEN?.trim();
    if (!token) throw new Error('LOYVERSE_ACCESS_TOKEN is not configured');

    const [items, categories] = await Promise.all([
      getAllLoyverse<LoyverseItem>('items', 'items', token),
      getAllLoyverse<LoyverseCategory>('categories', 'categories', token)
    ]);
    const categoryNames = new Map(categories.filter((category) => !category.deleted_at).map((category) => [category.id, category.name]));
    const categoryByItemId = new Map<string, string>();
    const categoryByVariantId = new Map<string, string>();

    for (const item of items.filter((item) => !item.deleted_at)) {
      const category = item.category_id ? (categoryNames.get(item.category_id) ?? 'Uncategorized') : 'Uncategorized';
      categoryByItemId.set(item.id, category);
      for (const variant of item.variants ?? []) categoryByVariantId.set(variant.variant_id, category);
    }

    loyverseCategoryCache = { loadedAt: Date.now(), categoryByItemId, categoryByVariantId };
    return loyverseCategoryCache;
  } catch (error) {
    console.error('[mgmt-dashboard] failed to load Loyverse categories:', error);
    return {
      loadedAt: Date.now(),
      categoryByItemId: new Map<string, string>(),
      categoryByVariantId: new Map<string, string>()
    };
  }
};

const getDepartmentMapping = async (): Promise<DepartmentMapping> => {
  const ttlMs = 5 * 60 * 1000;
  if (departmentMappingCache && Date.now() - departmentMappingCache.loadedAt < ttlMs) return departmentMappingCache;

  const notionSecret = env.NOTION_API_KEY?.trim();
  if (!notionSecret) {
    departmentMappingCache = buildFallbackDepartmentMapping();
    return departmentMappingCache;
  }

  try {
    const databaseId = env.NOTION_DEPARTMENT_MAPPING_DB_ID?.trim() || DEPARTMENT_MAPPING_DATABASE_ID;
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionSecret}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { property: 'Active', checkbox: { equals: true } },
        page_size: 100
      })
    });

    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);

    const data = (await response.json()) as {
      results?: Array<{
        properties?: {
          Department?: { title?: Array<{ plain_text?: string }> };
          'Loyverse Categories'?: { multi_select?: Array<{ name?: string }> };
        };
      }>;
    };

    const categoryToDepartment = new Map<string, Department>();
    for (const page of data.results ?? []) {
      const departmentName = page.properties?.Department?.title?.map((part) => part.plain_text ?? '').join('').trim();
      if (!DEPARTMENTS.includes(departmentName as Department)) continue;

      for (const category of page.properties?.['Loyverse Categories']?.multi_select ?? []) {
        if (category.name?.trim()) categoryToDepartment.set(normalizeCategory(category.name), departmentName as Department);
      }
    }

    departmentMappingCache = { loadedAt: Date.now(), categoryToDepartment, source: 'notion' };
    return departmentMappingCache;
  } catch (error) {
    console.error('[mgmt-dashboard] failed to load department mapping from Notion:', error);
    departmentMappingCache = buildFallbackDepartmentMapping();
    return departmentMappingCache;
  }
};

const maskPresence = (value: string | undefined) => ({
  present: Boolean(value?.trim())
});

export const getTodayDashboardOverview = query(async () => {
  const [row, lineRows, categoryMaps, departmentMapping] = await Promise.all([
    rowsOf<{
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
    `).then((rows) => rows[0]),
    rowsOf<{
      item_id: string | null;
      variant_id: string | null;
      revenue: string | number | null;
      cogs: string | number | null;
      line_count: string | number | null;
    }>(sql`
      select
        li.item_id,
        li.variant_id,
        coalesce(sum(li.total_money), 0)::text as revenue,
        coalesce(sum(li.cost_total), 0)::text as cogs,
        count(*)::text as line_count
      from receipt_line_items li
      join receipts r on r.receipt_key = li.receipt_key
      where (r.created_at at time zone 'Asia/Bangkok')::date = (now() at time zone 'Asia/Bangkok')::date
      group by li.item_id, li.variant_id
    `),
    getLoyverseCategoryMaps(),
    getDepartmentMapping()
  ]);

  const departmentTotals = new Map<
    DashboardDepartment,
    { department: DashboardDepartment; revenue: number; cogs: number; grossProfit: number; lineCount: number; categories: Set<string> }
  >();

  const ensureDepartment = (department: DashboardDepartment) => {
    const current = departmentTotals.get(department);
    if (current) return current;
    const created = { department, revenue: 0, cogs: 0, grossProfit: 0, lineCount: 0, categories: new Set<string>() };
    departmentTotals.set(department, created);
    return created;
  };

  for (const department of DEPARTMENTS) ensureDepartment(department);
  ensureDepartment(UNKNOWN_DEPARTMENT);

  for (const line of lineRows) {
    const category =
      (line.item_id ? categoryMaps.categoryByItemId.get(line.item_id) : undefined) ??
      (line.variant_id ? categoryMaps.categoryByVariantId.get(line.variant_id) : undefined) ??
      'Uncategorized';
    const department = departmentMapping.categoryToDepartment.get(normalizeCategory(category)) ?? UNKNOWN_DEPARTMENT;
    const total = ensureDepartment(department);
    const revenue = parseNumber(line.revenue);
    const cogs = parseNumber(line.cogs);

    total.revenue += revenue;
    total.cogs += cogs;
    total.grossProfit += revenue - cogs;
    total.lineCount += parseNumber(line.line_count);
    total.categories.add(category);
  }

  const departments = Array.from(departmentTotals.values()).map((department) => ({
    department: department.department,
    revenue: department.revenue,
    cogs: department.cogs,
    grossProfit: department.grossProfit,
    lineCount: department.lineCount,
    categories: Array.from(department.categories).sort((a, b) => a.localeCompare(b))
  }));

  return {
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()),
    salesTotal: parseNumber(row?.sales_total),
    refundTotal: parseNumber(row?.refund_total),
    netTotal: parseNumber(row?.net_total),
    receiptCount: parseNumber(row?.receipt_count),
    saleCount: parseNumber(row?.sale_count),
    refundCount: parseNumber(row?.refund_count),
    departmentMappingSource: departmentMapping.source,
    departments
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
