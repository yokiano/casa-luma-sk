import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MirrorDatabase } from '../db/types';
import { createSecondLoyverseClients } from '../clients';
import type { SecondLoyverseConfigInput } from '../config';
import { EntityInventoryCache } from '../entities/inventory';
import { considerAndMirrorReceipt } from '../transfers/service';
import type { MirrorAttemptResult, TransferStatus } from '../types';
import { countTransfersByStatus, queryBackfillReceiptPage } from './query';

export interface BackfillOptions {
  dateFrom?: string;
  dateTo?: string;
  receiptNumber?: string;
  merchantId?: string;
  limit?: number;
  concurrency?: number;
  dryRun?: boolean;
  discoverOnly?: boolean;
  process?: boolean;
  failedOnly?: boolean;
  ambiguousOnly?: boolean;
  reconcile?: boolean;
  reportOnly?: boolean;
  status?: string;
  outputDir?: string;
  env?: SecondLoyverseConfigInput & { LOYVERSE_ACCESS_TOKEN?: string };
}

export interface BackfillSummary {
  startedAt: string;
  finishedAt: string;
  options: BackfillOptions;
  discovered: number;
  processed: number;
  results: MirrorAttemptResult[];
  countsByStatus: Record<string, number>;
  countsByErrorCode: Record<string, number>;
  countsByOutcome: Record<string, number>;
  sampleFailures: Array<{ sourceReceiptKey: string; code?: string; message?: string; stage?: string }>;
  rerunCommand: string;
  transferStatusCounts: Record<string, number>;
}

const buildRerunCommand = (options: BackfillOptions, mode: 'failed' | 'ambiguous') => {
  const parts = ['pnpm 2nd-loyverse:backfill --', '--process'];
  if (mode === 'failed') parts.push('--failed-only');
  if (mode === 'ambiguous') parts.push('--ambiguous-only', '--reconcile');
  if (options.dateFrom) parts.push('--date-from', options.dateFrom);
  if (options.dateTo) parts.push('--date-to', options.dateTo);
  if (options.limit) parts.push('--limit', String(options.limit));
  return parts.join(' ');
};

const writeReports = async (outputDir: string, summary: BackfillSummary) => {
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'results.json'), JSON.stringify(summary, null, 2), 'utf8');

  const lines = [
    '# Second Loyverse Backfill Summary',
    '',
    `- started: ${summary.startedAt}`,
    `- finished: ${summary.finishedAt}`,
    `- discovered: ${summary.discovered}`,
    `- processed: ${summary.processed}`,
    '',
    '## Outcomes',
    ...Object.entries(summary.countsByOutcome).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Transfer status totals',
    ...Object.entries(summary.transferStatusCounts).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Error codes',
    ...(Object.keys(summary.countsByErrorCode).length
      ? Object.entries(summary.countsByErrorCode).map(([key, value]) => `- ${key}: ${value}`)
      : ['- none']),
    '',
    '## Sample failures',
    ...(summary.sampleFailures.length
      ? summary.sampleFailures.map(
          (failure) =>
            `- ${failure.sourceReceiptKey}: ${failure.code ?? 'n/a'} @ ${failure.stage ?? 'n/a'} — ${failure.message ?? ''}`
        )
      : ['- none']),
    '',
    '## Next commands',
    '```',
    summary.rerunCommand,
    buildRerunCommand(summary.options, 'ambiguous'),
    '```',
    '',
    'Fidelity notes: customer/employee/loyalty/tips/surcharges intentionally omitted; totals may differ.'
  ];

  await writeFile(path.join(outputDir, 'summary.md'), `${lines.join('\n')}\n`, 'utf8');
};

export const runBackfill = async (db: MirrorDatabase, options: BackfillOptions): Promise<BackfillSummary> => {
  const startedAt = new Date().toISOString();
  const inventoryCache = new EntityInventoryCache();
  const clients =
    options.process || options.reconcile
      ? createSecondLoyverseClients({ env: options.env })
      : undefined;

  const results: MirrorAttemptResult[] = [];
  let discovered = 0;
  let cursor: string | null = null;
  let remaining = options.limit ?? Number.POSITIVE_INFINITY;

  const shouldWrite = Boolean(options.process || options.reconcile);
  const discoverOnly = Boolean(options.discoverOnly || options.dryRun || (!shouldWrite && !options.reportOnly));

  // When processing, prefer due rows (queued/failed) so --limit is not wasted on already-succeeded.
  const processStatuses =
    options.failedOnly || options.ambiguousOnly || options.status
      ? undefined
      : shouldWrite
        ? ['queued']
        : undefined;

  while (remaining > 0) {
    const pageLimit = Math.min(25, remaining === Number.POSITIVE_INFINITY ? 25 : remaining);
    const page = await queryBackfillReceiptPage(db, {
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      receiptNumber: options.receiptNumber,
      merchantId: options.merchantId,
      limit: pageLimit,
      cursor,
      failedOnly: options.failedOnly,
      ambiguousOnly: options.ambiguousOnly,
      transferStatuses: options.status ? [options.status] : processStatuses,
      selectedOnly: options.failedOnly || options.ambiguousOnly || Boolean(options.process)
    });

    if (!page.rows.length) break;

    for (const row of page.rows) {
      discovered += 1;
      remaining -= 1;

      if (options.reportOnly) {
        results.push({
          sourceReceiptKey: row.sourceReceiptKey,
          status: (row.transferStatus as TransferStatus) ?? 'queued',
          outcome: 'noop'
        });
        continue;
      }

      const result = await considerAndMirrorReceipt(
        {
          merchantId: row.merchantId,
          receipt: row.receipt
        },
        {
          db,
          clients,
          env: options.env,
          inventoryCache
        },
        {
          trigger: options.reconcile ? 'reconcile' : 'backfill',
          forceProcess: shouldWrite,
          discoverOnly: discoverOnly && !shouldWrite,
          reconcileOnly: Boolean(options.reconcile),
          inventoryCache
        }
      );
      results.push(result);

      if (remaining <= 0) break;
    }

    cursor = page.cursor;
    if (!page.hasMore || !cursor) break;
  }

  const countsByOutcome: Record<string, number> = {};
  const countsByStatus: Record<string, number> = {};
  const countsByErrorCode: Record<string, number> = {};
  const sampleFailures: BackfillSummary['sampleFailures'] = [];

  for (const result of results) {
    countsByOutcome[result.outcome] = (countsByOutcome[result.outcome] ?? 0) + 1;
    countsByStatus[result.status] = (countsByStatus[result.status] ?? 0) + 1;
    if (result.error?.code) {
      countsByErrorCode[result.error.code] = (countsByErrorCode[result.error.code] ?? 0) + 1;
      if (sampleFailures.length < 20 && (result.outcome === 'failed' || result.outcome === 'ambiguous')) {
        sampleFailures.push({
          sourceReceiptKey: result.sourceReceiptKey,
          code: result.error.code,
          message: result.error.message,
          stage: result.error.stage
        });
      }
    }
  }

  const transferStatusCounts = await countTransfersByStatus(db);
  const finishedAt = new Date().toISOString();
  const summary: BackfillSummary = {
    startedAt,
    finishedAt,
    options: {
      ...options,
      env: undefined
    },
    discovered,
    processed: results.filter((r) => r.outcome !== 'noop' || options.reportOnly).length,
    results,
    countsByStatus,
    countsByErrorCode,
    countsByOutcome,
    sampleFailures,
    rerunCommand: buildRerunCommand(options, 'failed'),
    transferStatusCounts
  };

  const outputDir =
    options.outputDir ??
    path.join(process.cwd(), 'temp/2nd-loyverse/runs', finishedAt.replace(/[:.]/g, '-'));
  await writeReports(outputDir, summary);
  summary.options.outputDir = outputDir;

  return summary;
};
