import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { and, eq, gte, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema';
import { receipts as receiptsTable } from '../src/lib/server/db/schema';
import type { LoyverseReceipt } from '../src/lib/receipts/types';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const BASE_URL = 'https://api.loyverse.com/v1.0';
const DEFAULT_OUTPUT_DIR = 'temp/loyverse-receipts-recovery';
const MONEY_EPSILON = 0.01;

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  'postgres://app:app@localhost:5432/casa_luma';

const sqlClient = postgres(connectionString, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false
});

const db = drizzle(sqlClient, { schema });

interface ScriptOptions {
  merchantId: string;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  receiptNumber?: string;
  max: number | null;
  outputDir: string;
  json: boolean;
}

interface LoyverseReceiptsApiResponse {
  receipts?: LoyverseReceipt[];
  cursor?: string;
}

type DbReceipt = {
  receiptKey: string;
  merchantId: string;
  receiptNumber: string;
  createdAt: Date | null;
  receiptDate: Date | null;
  storeId: string | null;
  totalMoney: number | null;
  updatedFromEventAt: Date;
};

const parseArgs = (): ScriptOptions => {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    merchantId: process.env.LOYVERSE_MERCHANT_ID ?? '',
    dateFrom: undefined,
    dateTo: undefined,
    storeId: undefined,
    receiptNumber: undefined,
    max: null,
    outputDir: DEFAULT_OUTPUT_DIR,
    json: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--merchant-id' && next) {
      options.merchantId = next;
      index += 1;
    } else if (arg === '--date-from' && next) {
      options.dateFrom = next;
      index += 1;
    } else if (arg === '--date-to' && next) {
      options.dateTo = next;
      index += 1;
    } else if (arg === '--store-id' && next) {
      options.storeId = next;
      index += 1;
    } else if (arg === '--receipt-number' && next) {
      options.receiptNumber = next;
      index += 1;
    } else if (arg === '--max' && next) {
      const parsed = Number(next);
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --max value: ${next}`);
      options.max = Math.floor(parsed);
      index += 1;
    } else if (arg === '--output-dir' && next) {
      options.outputDir = next;
      index += 1;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: pnpm receipts:reconcile -- [options]\n\nOptions:\n  --merchant-id <id>       Merchant id (or LOYVERSE_MERCHANT_ID)\n  --date-from <iso>        Loyverse created_at_min / DB created_at lower bound\n  --date-to <iso>          Loyverse created_at_max / DB created_at upper bound\n  --store-id <id>          Restrict to one store\n  --receipt-number <no>    Restrict to one receipt number\n  --max <n>                Stop after fetching n Loyverse receipts\n  --output-dir <path>      Report directory (default temp/loyverse-receipts-recovery)\n  --json                   Also write a JSON report\n`);
      process.exit(0);
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

const fetchLoyverseReceipts = async (token: string, options: ScriptOptions) => {
  const output: LoyverseReceipt[] = [];
  let cursor: string | undefined;
  let page = 0;

  while (true) {
    page += 1;
    const data = await fetchReceiptsPage(token, {
      cursor,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      storeId: options.storeId,
      receiptNumber: options.receiptNumber
    });

    const pageReceipts = data.receipts ?? [];
    const remaining = options.max === null ? pageReceipts.length : Math.max(options.max - output.length, 0);
    output.push(...pageReceipts.slice(0, remaining));

    console.log('[reconcile] fetched Loyverse page', {
      page,
      pageCount: pageReceipts.length,
      totalFetched: output.length,
      cursor: data.cursor ?? null
    });

    if (!data.cursor || pageReceipts.length === 0 || (options.max !== null && output.length >= options.max)) break;
    cursor = data.cursor;
  }

  return output;
};

const fetchDbReceipts = async (options: ScriptOptions): Promise<DbReceipt[]> => {
  const clauses = [eq(receiptsTable.merchantId, options.merchantId)];
  if (options.dateFrom) clauses.push(gte(receiptsTable.createdAt, new Date(options.dateFrom)));
  if (options.dateTo) clauses.push(lte(receiptsTable.createdAt, new Date(options.dateTo)));
  if (options.storeId) clauses.push(eq(receiptsTable.storeId, options.storeId));
  if (options.receiptNumber) clauses.push(eq(receiptsTable.receiptNumber, options.receiptNumber));

  return db
    .select({
      receiptKey: receiptsTable.receiptKey,
      merchantId: receiptsTable.merchantId,
      receiptNumber: receiptsTable.receiptNumber,
      createdAt: receiptsTable.createdAt,
      receiptDate: receiptsTable.receiptDate,
      storeId: receiptsTable.storeId,
      totalMoney: receiptsTable.totalMoney,
      updatedFromEventAt: receiptsTable.updatedFromEventAt
    })
    .from(receiptsTable)
    .where(and(...clauses));
};

const iso = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const moneyMismatch = (a: unknown, b: unknown) => {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.abs(left - right) > MONEY_EPSILON;
};

const sameIsoInstant = (a: Date | string | null | undefined, b: Date | string | null | undefined) => {
  const left = iso(a);
  const right = iso(b);
  if (!left || !right) return true;
  return left === right;
};

const buildMarkdownReport = (report: any) => {
  const lines: string[] = [];
  lines.push(`# Loyverse Receipt Reconciliation Report`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push(`- Merchant: ${report.scope.merchantId}`);
  lines.push(`- Date from: ${report.scope.dateFrom ?? '(none)'}`);
  lines.push(`- Date to: ${report.scope.dateTo ?? '(none)'}`);
  lines.push(`- Store: ${report.scope.storeId ?? '(all)'}`);
  lines.push(`- Receipt number: ${report.scope.receiptNumber ?? '(all)'}`);
  lines.push(`- Max Loyverse receipts: ${report.scope.max ?? '(none)'}`);
  if (report.scope.max !== null) {
    lines.push('');
    lines.push('> Note: `--max` truncates the Loyverse side only. `extraInDb` can contain false positives when max is set.');
  }
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  for (const [key, value] of Object.entries(report.summary)) lines.push(`- ${key}: ${value}`);
  lines.push('');

  const section = (title: string, rows: any[], formatter: (row: any) => string) => {
    lines.push(`## ${title}`);
    lines.push('');
    if (rows.length === 0) {
      lines.push('None.');
      lines.push('');
      return;
    }
    for (const row of rows.slice(0, 100)) lines.push(formatter(row));
    if (rows.length > 100) lines.push(`- ... ${rows.length - 100} more omitted from markdown; use JSON report for full list.`);
    lines.push('');
  };

  section('Missing in Neon', report.missingInDb, (row) => `- ${row.receiptNumber} — created ${row.createdAt ?? '(unknown)'}, total ${row.totalMoney ?? '(unknown)'}`);
  section('Stale in Neon', report.staleInDb, (row) => `- ${row.receiptNumber} — Loyverse updated ${row.loyverseUpdatedAt}, Neon updated ${row.dbUpdatedFromEventAt}`);
  section('Mismatches', report.mismatches, (row) => `- ${row.receiptNumber} — ${row.fields.join(', ')}`);
  section('Extra in Neon', report.extraInDb, (row) => `- ${row.receiptNumber} — created ${row.createdAt ?? '(unknown)'}, total ${row.totalMoney ?? '(unknown)'}`);

  lines.push('## Recommended next step');
  lines.push('');
  if (report.summary.missingInDb > 0 || report.summary.staleInDb > 0) {
    lines.push('Run a dry-run backfill for the same scope, inspect counters, then run the real backfill only if the scope is correct.');
  } else if (report.summary.mismatches > 0) {
    lines.push('Inspect mismatches before deciding whether to backfill; stale checks did not identify clearly newer Loyverse records.');
  } else if (report.summary.extraInDb > 0) {
    lines.push('Inspect extra Neon rows. If `--max` was used, rerun without `--max` before treating extras as real.');
  } else {
    lines.push('No action needed for this scope.');
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const token = process.env.LOYVERSE_ACCESS_TOKEN;
  if (!token) throw new Error('LOYVERSE_ACCESS_TOKEN is required.');

  const options = parseArgs();
  console.log('[reconcile] starting', {
    merchantId: options.merchantId,
    dateFrom: options.dateFrom ?? null,
    dateTo: options.dateTo ?? null,
    storeId: options.storeId ?? null,
    receiptNumber: options.receiptNumber ?? null,
    max: options.max
  });

  const [loyverseReceipts, dbReceipts] = await Promise.all([
    fetchLoyverseReceipts(token, options),
    fetchDbReceipts(options)
  ]);

  const loyverseByNumber = new Map<string, LoyverseReceipt>();
  const dbByNumber = new Map<string, DbReceipt>();

  for (const receipt of loyverseReceipts) {
    if (receipt.receipt_number) loyverseByNumber.set(receipt.receipt_number, receipt);
  }
  for (const receipt of dbReceipts) dbByNumber.set(receipt.receiptNumber, receipt);

  const missingInDb: any[] = [];
  const staleInDb: any[] = [];
  const mismatches: any[] = [];
  const extraInDb: any[] = [];

  for (const [receiptNumber, loyverseReceipt] of loyverseByNumber) {
    const dbReceipt = dbByNumber.get(receiptNumber);
    if (!dbReceipt) {
      missingInDb.push({
        receiptNumber,
        createdAt: iso(loyverseReceipt.created_at),
        updatedAt: iso(loyverseReceipt.updated_at),
        receiptDate: iso(loyverseReceipt.receipt_date),
        storeId: loyverseReceipt.store_id ?? null,
        totalMoney: loyverseReceipt.total_money ?? null
      });
      continue;
    }

    const loyverseUpdatedAt = loyverseReceipt.updated_at ?? loyverseReceipt.created_at;
    if (loyverseUpdatedAt && new Date(loyverseUpdatedAt).getTime() > dbReceipt.updatedFromEventAt.getTime()) {
      staleInDb.push({
        receiptNumber,
        loyverseUpdatedAt: iso(loyverseUpdatedAt),
        dbUpdatedFromEventAt: iso(dbReceipt.updatedFromEventAt)
      });
    }

    const fields: string[] = [];
    if (moneyMismatch(loyverseReceipt.total_money, dbReceipt.totalMoney)) fields.push(`total_money Loyverse=${loyverseReceipt.total_money} Neon=${dbReceipt.totalMoney}`);
    if (!sameIsoInstant(loyverseReceipt.created_at, dbReceipt.createdAt)) fields.push(`created_at Loyverse=${iso(loyverseReceipt.created_at)} Neon=${iso(dbReceipt.createdAt)}`);
    if (!sameIsoInstant(loyverseReceipt.receipt_date, dbReceipt.receiptDate)) fields.push(`receipt_date Loyverse=${iso(loyverseReceipt.receipt_date)} Neon=${iso(dbReceipt.receiptDate)}`);
    if ((loyverseReceipt.store_id ?? null) !== (dbReceipt.storeId ?? null)) fields.push(`store_id Loyverse=${loyverseReceipt.store_id ?? null} Neon=${dbReceipt.storeId ?? null}`);
    if (fields.length > 0) mismatches.push({ receiptNumber, fields });
  }

  for (const [receiptNumber, dbReceipt] of dbByNumber) {
    if (!loyverseByNumber.has(receiptNumber)) {
      extraInDb.push({
        receiptNumber,
        receiptKey: dbReceipt.receiptKey,
        createdAt: iso(dbReceipt.createdAt),
        updatedFromEventAt: iso(dbReceipt.updatedFromEventAt),
        receiptDate: iso(dbReceipt.receiptDate),
        storeId: dbReceipt.storeId,
        totalMoney: dbReceipt.totalMoney
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scope: {
      merchantId: options.merchantId,
      dateFrom: options.dateFrom ?? null,
      dateTo: options.dateTo ?? null,
      storeId: options.storeId ?? null,
      receiptNumber: options.receiptNumber ?? null,
      max: options.max
    },
    summary: {
      loyverseFetched: loyverseReceipts.length,
      loyverseUniqueReceiptNumbers: loyverseByNumber.size,
      dbFetched: dbReceipts.length,
      missingInDb: missingInDb.length,
      staleInDb: staleInDb.length,
      mismatches: mismatches.length,
      extraInDb: extraInDb.length
    },
    missingInDb,
    staleInDb,
    mismatches,
    extraInDb
  };

  await fs.mkdir(options.outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const mdPath = path.join(options.outputDir, `reconciliation-${stamp}.md`);
  await fs.writeFile(mdPath, buildMarkdownReport(report));

  let jsonPath: string | null = null;
  if (options.json) {
    jsonPath = path.join(options.outputDir, `reconciliation-${stamp}.json`);
    await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log('[reconcile] complete', { summary: report.summary, report: mdPath, jsonReport: jsonPath });
};

main()
  .catch((error) => {
    console.error('[reconcile] fatal', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sqlClient.end({ timeout: 5 });
  });
