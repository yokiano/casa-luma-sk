import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../src/lib/server/db/schema';
import { runBackfill, type BackfillOptions } from '../../src/lib/server/2nd-loyverse';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  'postgres://app:app@localhost:5432/casa_luma';

const parseArgs = (): BackfillOptions => {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    concurrency: 1,
    dryRun: false,
    discoverOnly: false,
    process: false,
    failedOnly: false,
    ambiguousOnly: false,
    reconcile: false,
    reportOnly: false,
    env: {
      LOYVERSE_2_ACCESS_TOKEN: process.env.LOYVERSE_2_ACCESS_TOKEN,
      LOYVERSE_2_STORE_ID: process.env.LOYVERSE_2_STORE_ID,
      LOYVERSE_2_MIRROR_ENABLED: process.env.LOYVERSE_2_MIRROR_ENABLED,
      LOYVERSE_ACCESS_TOKEN: process.env.LOYVERSE_ACCESS_TOKEN
    }
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--discover-only') options.discoverOnly = true;
    else if (arg === '--process') options.process = true;
    else if (arg === '--failed-only') options.failedOnly = true;
    else if (arg === '--ambiguous-only') options.ambiguousOnly = true;
    else if (arg === '--reconcile') options.reconcile = true;
    else if (arg === '--report-only') options.reportOnly = true;
    else if (arg === '--receipt-number' && next) {
      options.receiptNumber = next;
      i += 1;
    } else if (arg === '--date-from' && next) {
      options.dateFrom = next;
      i += 1;
    } else if (arg === '--date-to' && next) {
      options.dateTo = next;
      i += 1;
    } else if (arg === '--limit' && next) {
      options.limit = Number(next);
      i += 1;
    } else if (arg === '--status' && next) {
      options.status = next;
      i += 1;
    } else if (arg === '--concurrency' && next) {
      options.concurrency = Number(next);
      i += 1;
    } else if (arg === '--output-dir' && next) {
      options.outputDir = next;
      i += 1;
    } else if (arg === '--merchant-id' && next) {
      options.merchantId = next;
      i += 1;
    }
  }

  if (!options.process && !options.reconcile && !options.reportOnly && !options.discoverOnly && !options.dryRun) {
    // Safe default: discover-only.
    options.discoverOnly = true;
  }

  return options;
};

const main = async () => {
  const options = parseArgs();
  const sql = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });
  const db = drizzle(sql, { schema });

  try {
    console.log('[2nd-loyverse:backfill] starting', {
      process: options.process,
      discoverOnly: options.discoverOnly,
      dryRun: options.dryRun,
      failedOnly: options.failedOnly,
      ambiguousOnly: options.ambiguousOnly,
      reconcile: options.reconcile,
      reportOnly: options.reportOnly,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      receiptNumber: options.receiptNumber,
      limit: options.limit
    });

    const summary = await runBackfill(db as any, options);
    console.log('[2nd-loyverse:backfill] complete', {
      discovered: summary.discovered,
      processed: summary.processed,
      countsByOutcome: summary.countsByOutcome,
      countsByErrorCode: summary.countsByErrorCode,
      transferStatusCounts: summary.transferStatusCounts,
      outputDir: summary.options.outputDir,
      rerunCommand: summary.rerunCommand
    });

    const failed =
      (summary.countsByOutcome.failed ?? 0) +
      (summary.countsByOutcome.ambiguous ?? 0);
    process.exitCode = failed > 0 && options.process ? 1 : 0;
  } finally {
    await sql.end({ timeout: 5 });
  }
};

main().catch((error) => {
  console.error('[2nd-loyverse:backfill] fatal', error);
  process.exit(1);
});
