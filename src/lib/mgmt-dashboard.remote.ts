import { command, query } from '$app/server';
import { env } from '$env/dynamic/private';
import { sql } from 'drizzle-orm';
import * as v from 'valibot';
import { db, getDatabaseEnvKey } from '$lib/server/db/client';
import { incidentReporter } from '$lib/server/incidents';
import { buildReceiptReportUrl } from '$lib/server/incidents/urls';
import { error } from '@sveltejs/kit';
import { CompanyLedgerDatabase } from '$lib/notion-sdk/dbs/company-ledger/db';
import { CompanyLedgerPatchDTO } from '$lib/notion-sdk/dbs/company-ledger/patch.dto';
import { CompanyLedgerResponseDTO } from '$lib/notion-sdk/dbs/company-ledger/response.dto';
import { SalaryAdjustmentsDatabase } from '$lib/notion-sdk/dbs/salary-adjustments/db';
import { SalaryAdjustmentsResponseDTO } from '$lib/notion-sdk/dbs/salary-adjustments/response.dto';
import { EmployeesDatabase } from '$lib/notion-sdk/dbs/employees/db';
import { EmployeesResponseDTO } from '$lib/notion-sdk/dbs/employees/response.dto';
import { FlexiPassesDatabase } from '$lib/notion-sdk/dbs/flexi-passes/db';
import { FlexiPassesResponseDTO } from '$lib/notion-sdk/dbs/flexi-passes/response.dto';
import { MembershipsDatabase } from '$lib/notion-sdk/dbs/memberships/db';
import { MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships/response.dto';
import { bangkokDate, bangkokDateRangeUtc, compactDateLabel } from '$lib/mgmt-dashboard-dates';
import { getBalanceReconciliationSummary } from '$lib/server/balance-reconciliation';
import { ONE_HOUR_ITEM_ID, ONE_HOUR_TO_DAY_ITEM_ID } from '$lib/receipts/receipt-tools';

type Row = Record<string, unknown>;

const RECEIPT_FRESHNESS_MIN_COUNT = 5;
const MEMBERSHIP_CREATION_WINDOW_DAYS = 7;
const COMPANY_LEDGER_DATABASE_ID = '8c565c29798a4ac39e3b23c35db93c5b';
const SALARY_ADJUSTMENTS_DATABASE_ID = 'eb751fe68e764a618c4398560a0ae114';
const EMPLOYEES_DATABASE_ID = 'cf220f8b4efc4caeb7e46723c4f5e3e9';
const TASKS_DATABASE_ID = '0df7129c34034bf0937088586b557c2a';
const TASKS_VIEW_URL = 'https://efficacious-drizzle-ad4.notion.site/ebd//0df7129c34034bf0937088586b557c2a?v=36bfc77db4f38069bac4000c8a72a853';
const DEPARTMENT_MAPPING_DATABASE_ID = '9a4c14fedf4b44dda928b1a06ee759b6';
const DEPARTMENTS = ['playground', 'cafe', 'store', 'workshops'] as const;
const UNKNOWN_DEPARTMENT = 'unknown';
const TEST_ALERT_TYPES = [
  'generic',
  'one_hour_not_converted',
  'discount_100_present',
  'discount_total_over_threshold',
  'forced_test_failure',
  'validation_engine_error'
] as const;
const DASHBOARD_PERIODS = ['today', '7d', '30d', '90d', '12m'] as const;
const DASHBOARD_GROUP_BY = ['day', 'week', 'month'] as const;
const DASHBOARD_APPROVER = 'Yarden' as const; // TODO(auth): use the logged-in user's Approved By select value once auth is implemented.

type Department = (typeof DEPARTMENTS)[number];
type DashboardDepartment = Department | typeof UNKNOWN_DEPARTMENT;
type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
type DashboardGroupBy = (typeof DASHBOARD_GROUP_BY)[number];
type RevenueChannel = 'restaurant' | 'open-play' | 'store' | 'others';
type TestAlertType = (typeof TEST_ALERT_TYPES)[number];

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

const dashboardPeriodLabel = (period: DashboardPeriod) =>
  period === 'today'
    ? 'Today'
    : period === '7d'
      ? 'Last 7 days'
      : period === '30d'
        ? 'Last 30 days'
        : period === '90d'
          ? 'Last 90 days'
          : 'Last 12 months';

const dashboardPeriodCondition = (period: DashboardPeriod) => {
  if (period === 'today') return sql`(r.created_at at time zone 'Asia/Bangkok')::date = (now() at time zone 'Asia/Bangkok')::date`;
  if (period === '7d') return sql`(r.created_at at time zone 'Asia/Bangkok')::date >= (now() at time zone 'Asia/Bangkok')::date - interval '6 days'`;
  if (period === '30d') return sql`(r.created_at at time zone 'Asia/Bangkok')::date >= (now() at time zone 'Asia/Bangkok')::date - interval '29 days'`;
  if (period === '90d') return sql`(r.created_at at time zone 'Asia/Bangkok')::date >= (now() at time zone 'Asia/Bangkok')::date - interval '89 days'`;
  return sql`(r.created_at at time zone 'Asia/Bangkok')::date >= (now() at time zone 'Asia/Bangkok')::date - interval '12 months'`;
};

const dashboardBucketExpression = (groupBy: DashboardGroupBy) => {
  if (groupBy === 'month') return sql`date_trunc('month', r.created_at at time zone 'Asia/Bangkok')::date`;
  if (groupBy === 'week') return sql`date_trunc('week', r.created_at at time zone 'Asia/Bangkok')::date`;
  return sql`(r.created_at at time zone 'Asia/Bangkok')::date`;
};

const dashboardBucketLabel = (groupBy: DashboardGroupBy, bucketStart: unknown) => {
  const raw = bucketStart instanceof Date ? bucketStart.toISOString().slice(0, 10) : String(bucketStart ?? '').slice(0, 10);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return raw || '—';
  if (groupBy === 'month') return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (groupBy === 'week') return `Week of ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })}`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
};

const departmentToRevenueChannel = (department: DashboardDepartment): RevenueChannel => {
  if (department === 'cafe') return 'restaurant';
  if (department === 'playground') return 'open-play';
  if (department === 'store') return 'store';
  return 'others';
};

const buildExpenseMissingFields = (expense: CompanyLedgerResponseDTO) => {
  const missing: string[] = [];
  const props = expense.properties;

  if (!props.description.text?.trim()) missing.push('description');
  if (props.amountThb === null || props.amountThb === undefined) missing.push('amount');
  if (!props.date?.start) missing.push('date');
  if (!props.type?.name) missing.push('type');
  if (!props.status?.name) missing.push('status');
  if (!props.department?.name) missing.push('department');
  if (!props.category?.name) missing.push('category');
  if (!props.supplierIds.length) missing.push('supplier');
  if (!props.invoiceReceipt.urls.filter(Boolean).length) missing.push('receipt scan');
  if (!props.paymentMethod?.name) missing.push('payment method');
  if (!props.bankAccount?.name) missing.push('bank account');

  return missing;
};

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

const isTestAlertType = (value: string): value is TestAlertType =>
  TEST_ALERT_TYPES.includes(value as TestAlertType);

const createTestValidationContext = ({
  receiptNumber,
  code,
  message,
  details
}: {
  receiptNumber: string;
  code: string;
  message: string;
  details: Record<string, unknown>;
}) => ({
  trigger: 'mgmt-dashboard-health-test',
  sentAt: new Date().toISOString(),
  receiptNumber,
  receiptUrl: buildReceiptReportUrl(receiptNumber),
  failedChecks: [code],
  primaryFindingCode: code,
  primaryFindingMessage: message,
  primaryFindingDetails: details,
  validationFindingsSummary: [
    {
      code,
      severity: 'warning',
      message,
      details
    }
  ]
});

const notionDatabaseUrl = (databaseId: string) => `https://www.notion.so/${databaseId.replace(/-/g, '')}`;

const getNotionSecret = () => env.NOTION_API_KEY?.trim();

const resolveEmployeeNames = async (db: EmployeesDatabase, employeeIds: string[]) => {
  const uniqueIds = Array.from(new Set(employeeIds.filter(Boolean)));
  const pairs = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const employee = new EmployeesResponseDTO((await db.getPage(id)) as any);
        return [id, employee.properties.nickname.text || employee.properties.fullName.text || 'Employee'] as const;
      } catch (error) {
        console.error('[mgmt-dashboard] failed to load employee relation:', error);
        return [id, 'Employee'] as const;
      }
    })
  );

  return new Map(pairs);
};

const nextBirthdayWithinWindow = (birthDate: string | undefined, startDate: string, windowEndDate: string) => {
  if (!birthDate) return null;
  const [, month, day] = birthDate.slice(0, 10).split('-');
  if (!month || !day) return null;

  const startYear = Number(startDate.slice(0, 4));
  const candidates = [`${startYear}-${month}-${day}`, `${startYear + 1}-${month}-${day}`];
  return candidates.find((candidate) => candidate >= startDate && candidate < windowEndDate) ?? null;
};

export const getDailyMeetingDashboard = query(async () => {
  const notionSecret = getNotionSecret();
  const yesterday = bangkokDate(-1);
  const today = bangkokDate(0);
  const tomorrow = bangkokDate(1);
  const salaryWindowEnd = bangkokDate(31);
  const ledgerDateRange = bangkokDateRangeUtc(yesterday, tomorrow);

  const links = {
    companyLedger: notionDatabaseUrl(COMPANY_LEDGER_DATABASE_ID),
    salaryAdjustments: notionDatabaseUrl(SALARY_ADJUSTMENTS_DATABASE_ID),
    employees: notionDatabaseUrl(EMPLOYEES_DATABASE_ID),
    tasks: TASKS_VIEW_URL,
    tasksDatabase: notionDatabaseUrl(TASKS_DATABASE_ID)
  };

  if (!notionSecret) {
    return {
      yesterday,
      today,
      tomorrow,
      links,
      expenses: [],
      salaryAdjustments: [],
      birthdays: [],
      error: 'NOTION_API_KEY is not configured.'
    };
  }

  try {
    const companyLedgerDb = new CompanyLedgerDatabase({ notionSecret });
    const salaryAdjustmentsDb = new SalaryAdjustmentsDatabase({ notionSecret });
    const employeesDb = new EmployeesDatabase({ notionSecret });

    const [ledgerResponse, salaryResponse, employeeResponse] = await Promise.all([
      companyLedgerDb.query({
        page_size: 12,
        filter: {
          and: [{ date: { on_or_after: ledgerDateRange.start } }, { date: { before: ledgerDateRange.endExclusive } }]
        },
        sorts: [{ property: 'date', direction: 'ascending' }]
      } as any),
      salaryAdjustmentsDb.query({
        page_size: 12,
        filter: {
          and: [{ date: { on_or_after: today } }, { date: { before: salaryWindowEnd } }]
        },
        sorts: [{ property: 'date', direction: 'ascending' }]
      } as any),
      employeesDb.query({
        page_size: 100,
        filter: {
          and: [
            { dateOfBirth: { is_not_empty: true } },
            {
              or: [
                { employmentStatus: { equals: 'Working' } },
                { employmentStatus: { equals: 'Active' } },
                { employmentStatus: { equals: 'Onboarding' } }
              ]
            }
          ]
        }
      } as any)
    ]);

    const salaryDtos = salaryResponse.results.map((result) => new SalaryAdjustmentsResponseDTO(result as any));
    const employeeNames = await resolveEmployeeNames(
      employeesDb,
      salaryDtos.flatMap((adjustment) => adjustment.properties.employeeIds)
    );

    const expenses = ledgerResponse.results.map((result) => {
      const expense = new CompanyLedgerResponseDTO(result as any);
      return {
        id: expense.id,
        title: expense.properties.description.text || 'Untitled expense',
        amountThb: expense.properties.amountThb ?? 0,
        date: compactDateLabel(expense.properties.date?.start, expense.properties.date?.end),
        type: expense.properties.type?.name ?? null,
        status: expense.properties.status?.name ?? null,
        department: expense.properties.department?.name ?? null,
        category: expense.properties.category?.name ?? null,
        owner: expense.properties.owner?.name ?? null,
        missingFields: buildExpenseMissingFields(expense),
        url: expense.url
      };
    });

    const salaryAdjustments = salaryDtos.map((adjustment) => ({
      id: adjustment.id,
      title: adjustment.properties.adjustmentTitle.text || 'Untitled adjustment',
      amountThb: adjustment.properties.amountThb ?? 0,
      date: compactDateLabel(adjustment.properties.date?.start, adjustment.properties.date?.end),
      type: adjustment.properties.adjustmentType?.name ?? null,
      approvedBy: adjustment.properties.approvedBy?.name ?? null,
      employees: adjustment.properties.employeeIds.map((id) => employeeNames.get(id) ?? 'Employee'),
      url: adjustment.url
    }));

    const birthdays = employeeResponse.results
      .map((result) => {
        const employee = new EmployeesResponseDTO(result as any);
        const nextDate = nextBirthdayWithinWindow(employee.properties.dateOfBirth?.start, today, salaryWindowEnd);
        if (!nextDate) return null;
        return {
          id: employee.id,
          name: employee.properties.nickname.text || employee.properties.fullName.text || 'Employee',
          date: nextDate,
          department: employee.properties.department?.name ?? null,
          url: employee.url
        };
      })
      .filter((birthday): birthday is NonNullable<typeof birthday> => Boolean(birthday))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);

    return {
      yesterday,
      today,
      tomorrow,
      links,
      expenses,
      salaryAdjustments,
      birthdays,
      error: null
    };
  } catch (error) {
    console.error('[mgmt-dashboard] failed to load daily meeting data:', error);
    return {
      yesterday,
      today,
      tomorrow,
      links,
      expenses: [],
      salaryAdjustments: [],
      birthdays: [],
      error: serializeError(error).message
    };
  }
});

const ApproveExpenseSchema = v.object({
  expenseId: v.pipe(v.string(), v.trim(), v.minLength(1))
});

export const approveLedgerExpense = command(ApproveExpenseSchema, async ({ expenseId }) => {
  const notionSecret = getNotionSecret();
  if (!notionSecret) throw error(500, { message: 'NOTION_API_KEY is not configured.' });

  const companyLedgerDb = new CompanyLedgerDatabase({ notionSecret });
  await companyLedgerDb.updatePage(
    expenseId,
    new CompanyLedgerPatchDTO({
      properties: { owner: DASHBOARD_APPROVER }
    })
  );

  return { id: expenseId, approvedBy: DASHBOARD_APPROVER };
});

export const getBalanceReconciliationDashboard = query(async () => getBalanceReconciliationSummary({ asOf: new Date() }));

const DashboardAnalyticsSchema = v.object({
  period: v.optional(v.picklist(DASHBOARD_PERIODS)),
  groupBy: v.optional(v.picklist(DASHBOARD_GROUP_BY))
});

export const getMgmtDashboardAnalytics = query(DashboardAnalyticsSchema, async ({ period = 'today', groupBy = 'day' }) => {
  const periodCondition = dashboardPeriodCondition(period);
  const bucketExpression = dashboardBucketExpression(groupBy);

  const [row, lineRows, passMixRows, categoryMaps, departmentMapping] = await Promise.all([
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
      from receipts r
      where ${periodCondition}
    `).then((rows) => rows[0]),
    rowsOf<{
      bucket_start: string | Date | null;
      item_id: string | null;
      variant_id: string | null;
      revenue: string | number | null;
      cogs: string | number | null;
      line_count: string | number | null;
    }>(sql`
      select
        ${bucketExpression} as bucket_start,
        li.item_id,
        li.variant_id,
        coalesce(sum(li.total_money), 0)::text as revenue,
        coalesce(sum(li.cost_total), 0)::text as cogs,
        count(*)::text as line_count
      from receipt_line_items li
      join receipts r on r.receipt_key = li.receipt_key
      where ${periodCondition} and r.receipt_type is distinct from 'REFUND'
      group by ${bucketExpression}, li.item_id, li.variant_id
      order by ${bucketExpression}
    `),
    rowsOf<{
      bucket_start: string | Date | null;
      one_hour_quantity: string | number | null;
      one_day_quantity: string | number | null;
    }>(sql`
      select
        ${bucketExpression} as bucket_start,
        coalesce(sum(li.quantity) filter (where li.item_id = ${ONE_HOUR_ITEM_ID}), 0)::text as one_hour_quantity,
        coalesce(sum(li.quantity) filter (where li.item_id = ${ONE_HOUR_TO_DAY_ITEM_ID}), 0)::text as one_day_quantity
      from receipt_line_items li
      join receipts r on r.receipt_key = li.receipt_key
      where ${periodCondition}
        and r.receipt_type is distinct from 'REFUND'
        and li.item_id in (${ONE_HOUR_ITEM_ID}, ${ONE_HOUR_TO_DAY_ITEM_ID})
      group by ${bucketExpression}
      order by ${bucketExpression}
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

  const channelBuckets = new Map<
    string,
    {
      bucketStart: string;
      label: string;
      restaurant: number;
      openPlay: number;
      store: number;
      others: number;
      revenue: number;
      cogs: number;
      grossProfit: number;
      grossMargin: number;
      incomeToCogsRatio: number | null;
    }
  >();

  const ensureBucket = (bucketStartValue: unknown) => {
    const bucketStart = bucketStartValue instanceof Date ? bucketStartValue.toISOString().slice(0, 10) : String(bucketStartValue ?? '').slice(0, 10);
    const current = channelBuckets.get(bucketStart);
    if (current) return current;
    const created = {
      bucketStart,
      label: dashboardBucketLabel(groupBy, bucketStartValue),
      restaurant: 0,
      openPlay: 0,
      store: 0,
      others: 0,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      incomeToCogsRatio: null as number | null
    };
    channelBuckets.set(bucketStart, created);
    return created;
  };

  for (const line of lineRows) {
    const category =
      (line.item_id ? categoryMaps.categoryByItemId.get(line.item_id) : undefined) ??
      (line.variant_id ? categoryMaps.categoryByVariantId.get(line.variant_id) : undefined) ??
      'Uncategorized';
    const department = departmentMapping.categoryToDepartment.get(normalizeCategory(category)) ?? UNKNOWN_DEPARTMENT;
    const total = ensureDepartment(department);
    const revenue = parseNumber(line.revenue);
    const cogs = parseNumber(line.cogs);
    const grossProfit = revenue - cogs;
    const bucket = ensureBucket(line.bucket_start);
    const channel = departmentToRevenueChannel(department);

    total.revenue += revenue;
    total.cogs += cogs;
    total.grossProfit += grossProfit;
    total.lineCount += parseNumber(line.line_count);
    total.categories.add(category);

    if (channel === 'open-play') bucket.openPlay += revenue;
    else bucket[channel] += revenue;
    bucket.revenue += revenue;
    bucket.cogs += cogs;
    bucket.grossProfit += grossProfit;
  }

  const departments = Array.from(departmentTotals.values()).map((department) => ({
    department: department.department,
    revenue: department.revenue,
    cogs: department.cogs,
    grossProfit: department.grossProfit,
    lineCount: department.lineCount,
    categories: Array.from(department.categories).sort((a, b) => a.localeCompare(b))
  }));

  const channelTotals = new Map<
    RevenueChannel,
    { channel: RevenueChannel; revenue: number; cogs: number; grossProfit: number; lineCount: number }
  >([
    ['restaurant', { channel: 'restaurant', revenue: 0, cogs: 0, grossProfit: 0, lineCount: 0 }],
    ['open-play', { channel: 'open-play', revenue: 0, cogs: 0, grossProfit: 0, lineCount: 0 }],
    ['store', { channel: 'store', revenue: 0, cogs: 0, grossProfit: 0, lineCount: 0 }],
    ['others', { channel: 'others', revenue: 0, cogs: 0, grossProfit: 0, lineCount: 0 }]
  ]);

  for (const department of departments) {
    const channel = channelTotals.get(departmentToRevenueChannel(department.department));
    if (!channel) continue;
    channel.revenue += department.revenue;
    channel.cogs += department.cogs;
    channel.grossProfit += department.grossProfit;
    channel.lineCount += department.lineCount;
  }

  const totalChannelRevenue = Array.from(channelTotals.values()).reduce((sum, channel) => sum + channel.revenue, 0);
  const revenueChannels = Array.from(channelTotals.values()).map((channel) => ({
    ...channel,
    share: totalChannelRevenue > 0 ? (channel.revenue / totalChannelRevenue) * 100 : 0
  }));

  const revenueTrend = Array.from(channelBuckets.values())
    .sort((a, b) => a.bucketStart.localeCompare(b.bucketStart))
    .map((bucket) => {
      bucket.grossMargin = bucket.revenue > 0 ? (bucket.grossProfit / bucket.revenue) * 100 : 0;
      bucket.incomeToCogsRatio = bucket.cogs > 0 ? bucket.revenue / bucket.cogs : null;
      return bucket;
    });

  const passMix = passMixRows.map((bucket) => {
    const oneHourQuantity = parseNumber(bucket.one_hour_quantity);
    const oneDayQuantity = parseNumber(bucket.one_day_quantity);
    const totalQuantity = oneHourQuantity + oneDayQuantity;

    return {
      bucketStart: bucket.bucket_start instanceof Date ? bucket.bucket_start.toISOString().slice(0, 10) : String(bucket.bucket_start ?? '').slice(0, 10),
      label: dashboardBucketLabel(groupBy, bucket.bucket_start),
      oneHourQuantity,
      oneDayQuantity,
      totalQuantity,
      oneHourShare: totalQuantity > 0 ? (oneHourQuantity / totalQuantity) * 100 : 0,
      oneDayShare: totalQuantity > 0 ? (oneDayQuantity / totalQuantity) * 100 : 0,
      oneHourToOneDayRatio: oneDayQuantity > 0 ? oneHourQuantity / oneDayQuantity : null
    };
  });

  return {
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()),
    period,
    periodLabel: dashboardPeriodLabel(period),
    filters: {
      period,
      groupBy,
      label: dashboardPeriodLabel(period)
    },
    summary: {
      grossRevenue: parseNumber(row?.sales_total),
      netRevenue: parseNumber(row?.net_total),
      refunds: parseNumber(row?.refund_total),
      saleCount: parseNumber(row?.sale_count),
      receiptCount: parseNumber(row?.receipt_count),
      cogs: revenueChannels.reduce((sum, channel) => sum + channel.cogs, 0),
      grossProfit: revenueChannels.reduce((sum, channel) => sum + channel.grossProfit, 0),
      grossMargin: totalChannelRevenue > 0 ? (revenueChannels.reduce((sum, channel) => sum + channel.grossProfit, 0) / totalChannelRevenue) * 100 : 0,
      incomeToCogsRatio: revenueChannels.reduce((sum, channel) => sum + channel.cogs, 0) > 0 ? totalChannelRevenue / revenueChannels.reduce((sum, channel) => sum + channel.cogs, 0) : null
    },
    salesTotal: parseNumber(row?.sales_total),
    refundTotal: parseNumber(row?.refund_total),
    netTotal: parseNumber(row?.net_total),
    receiptCount: parseNumber(row?.receipt_count),
    saleCount: parseNumber(row?.sale_count),
    refundCount: parseNumber(row?.refund_count),
    departmentMappingSource: departmentMapping.source,
    departments,
    revenueChannels,
    revenueTrend,
    profitabilityTrend: revenueTrend.map(({ bucketStart, label, revenue, cogs, grossProfit, grossMargin, incomeToCogsRatio }) => ({
      bucketStart,
      label,
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      incomeToCogsRatio
    })),
    passMix
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

export const getMembershipCreationHealth = query(async () => {
  const startedAt = Date.now();
  const notionSecret = getNotionSecret();
  const since = new Date(Date.now() - MEMBERSHIP_CREATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  if (!notionSecret) {
    return {
      ok: false,
      status: 'critical',
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      windowDays: MEMBERSHIP_CREATION_WINDOW_DAYS,
      since: since.toISOString(),
      totalCreated: 0,
      flexiCreated: 0,
      membershipCreated: 0,
      latestCreatedAt: null,
      latestRecord: null,
      error: 'NOTION_API_KEY is not configured.'
    };
  }

  try {
    const membershipsDb = new MembershipsDatabase({ notionSecret });
    const flexiPassesDb = new FlexiPassesDatabase({ notionSecret });
    const [membershipResponse, flexiResponse] = await Promise.all([
      membershipsDb.query({
        page_size: 100,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }]
      } as any),
      flexiPassesDb.query({
        page_size: 100,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }]
      } as any)
    ]);

    const membershipRecords = membershipResponse.results.map((result) => {
      const dto = new MembershipsResponseDTO(result as any);
      const createdAt = toIsoOrNull(dto.createdTime);

      return {
        id: dto.id,
        kind: 'membership' as const,
        name: dto.properties.name?.text ?? 'Untitled membership',
        type: (dto.properties.type?.name as string | undefined) ?? null,
        createdAt,
        url: dto.url
      };
    });

    const flexiRecords = flexiResponse.results.map((result) => {
      const dto = new FlexiPassesResponseDTO(result as any);
      const createdAt = toIsoOrNull(dto.createdTime);

      return {
        id: dto.id,
        kind: 'flexi-pass' as const,
        name: dto.properties.name?.text ?? 'Untitled flexi pass',
        type: dto.properties.automationStatus?.name ?? 'Flexi Pass',
        createdAt,
        url: dto.url
      };
    });

    const recentMembershipRecords = membershipRecords.filter(
      (record) => record.createdAt && new Date(record.createdAt).getTime() >= since.getTime()
    );
    const recentFlexiRecords = flexiRecords.filter(
      (record) => record.createdAt && new Date(record.createdAt).getTime() >= since.getTime()
    );
    const allRecords = [...membershipRecords, ...flexiRecords].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );
    const totalCreated = recentMembershipRecords.length + recentFlexiRecords.length;
    const latestRecord = allRecords[0] ?? null;

    return {
      ok: totalCreated > 0,
      status: totalCreated > 0 ? 'healthy' : 'warning',
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      windowDays: MEMBERSHIP_CREATION_WINDOW_DAYS,
      since: since.toISOString(),
      totalCreated,
      flexiCreated: recentFlexiRecords.length,
      membershipCreated: recentMembershipRecords.length,
      latestCreatedAt: latestRecord?.createdAt ?? null,
      latestRecord,
      resultCapped: membershipResponse.has_more === true || flexiResponse.has_more === true
    };
  } catch (error) {
    return {
      ok: false,
      status: 'critical',
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      windowDays: MEMBERSHIP_CREATION_WINDOW_DAYS,
      since: since.toISOString(),
      totalCreated: 0,
      flexiCreated: 0,
      membershipCreated: 0,
      latestCreatedAt: null,
      latestRecord: null,
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

export const sendTestTelegramAlert = command(v.object({ alertType: v.optional(v.string()) }), async ({ alertType = 'generic' }) => {
  const requestedAlertType = isTestAlertType(alertType) ? alertType : 'generic';
  const receiptNumber = `TEST-${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())}`;

  const incidentInputByType: Record<TestAlertType, Parameters<typeof incidentReporter.report>[0]> = {
    generic: {
      source: 'mgmt-dashboard',
      code: 'TEST_TELEGRAM_ALERT',
      severity: 'critical',
      message: 'Manual Telegram alert test from the management dashboard.',
      context: {
        trigger: 'mgmt-dashboard-health-test',
        sentAt: new Date().toISOString(),
        alertType: requestedAlertType
      },
      payload: {
        note: 'This is a deliberate generic test alert. No action is required.'
      }
    },
    one_hour_not_converted: {
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'Test receipt validation alert: one-hour ticket was not converted.',
      context: createTestValidationContext({
        receiptNumber,
        code: 'ONE_HOUR_NOT_CONVERTED',
        message: 'One-hour ticket stayed longer than the allowed threshold and was not converted.',
        details: {
          durationMinutes: 96,
          thresholdMinutes: 75,
          baseDurationMinutes: 60,
          gracePeriodMinutes: 15,
          orderStartTime: '10:00',
          checkoutAt: '11:36',
          timeZone: 'Asia/Bangkok'
        }
      }),
      payload: { test: true, alertType: requestedAlertType }
    },
    discount_100_present: {
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'Test receipt validation alert: 100% discount used.',
      context: createTestValidationContext({
        receiptNumber,
        code: 'DISCOUNT_100_PRESENT',
        message: 'A 100% discount was used on this receipt.',
        details: {
          thresholdPercentage: 99.99,
          receiptLevelDiscounts: [{ discountName: 'Manager comp', percentage: 100 }],
          lineLevelDiscounts: [{ itemName: 'Open Play Entry', discountName: 'Free entry', percentage: 100 }]
        }
      }),
      payload: { test: true, alertType: requestedAlertType }
    },
    discount_total_over_threshold: {
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'Test receipt validation alert: total discount over threshold.',
      context: createTestValidationContext({
        receiptNumber,
        code: 'DISCOUNT_TOTAL_OVER_THRESHOLD',
        message: 'Total receipt discount is over the configured threshold.',
        details: {
          discountTotal: 520,
          comparableDiscountTotal: 520,
          thresholdAmount: 400,
          currency: 'THB',
          discountNames: ['Staff approval', 'Cafe comp']
        }
      }),
      payload: { test: true, alertType: requestedAlertType }
    },
    forced_test_failure: {
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'Test receipt validation alert: forced test failure.',
      context: createTestValidationContext({
        receiptNumber,
        code: 'FORCED_TEST_FAILURE',
        message: 'Forced receipt validation failure test from the management dashboard.',
        details: {
          note: 'This mirrors the forced validation failure alert path without changing environment variables.'
        }
      }),
      payload: { test: true, alertType: requestedAlertType }
    },
    validation_engine_error: {
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR',
      severity: 'critical',
      message: 'Test receipt validation alert: validation engine error.',
      context: {
        trigger: 'mgmt-dashboard-health-test',
        sentAt: new Date().toISOString(),
        receiptNumber,
        receiptUrl: buildReceiptReportUrl(receiptNumber),
        failedChecks: ['VALIDATION_ENGINE_ERROR'],
        primaryFindingMessage: 'The validation engine failed while running receipt rules.'
      },
      payload: { test: true, alertType: requestedAlertType },
      error: new Error('Deliberate validation engine test error from management dashboard')
    }
  };

  const result = await incidentReporter.report(incidentInputByType[requestedAlertType]);

  return {
    ...result,
    alertType: requestedAlertType,
    sentAt: new Date().toISOString()
  };
});
