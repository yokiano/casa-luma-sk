import { desc, eq, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { isMirrorEnabledFromEnv } from '$lib/server/2nd-loyverse/config';
import { db } from '$lib/server/db/client';
import { secondLoyverseReceiptTransfers } from '$lib/server/db/schema';

const RECENT_LIMIT = 50;

export const load = async () => {
  const mirrorEnabled = isMirrorEnabledFromEnv({
    LOYVERSE_2_MIRROR_ENABLED: env.LOYVERSE_2_MIRROR_ENABLED
  });
  const credentialsConfigured = Boolean(
    env.LOYVERSE_2_ACCESS_TOKEN?.trim() && env.LOYVERSE_2_STORE_ID?.trim()
  );

  try {
    const [statusRows, recentSucceeded] = await Promise.all([
      db
        .select({
          status: secondLoyverseReceiptTransfers.status,
          count: sql<number>`count(*)::int`
        })
        .from(secondLoyverseReceiptTransfers)
        .groupBy(secondLoyverseReceiptTransfers.status)
        .orderBy(secondLoyverseReceiptTransfers.status),
      db
        .select({
          sourceReceiptKey: secondLoyverseReceiptTransfers.sourceReceiptKey,
          sourceReceiptNumber: secondLoyverseReceiptTransfers.sourceReceiptNumber,
          targetReceiptNumber: secondLoyverseReceiptTransfers.targetReceiptNumber,
          status: secondLoyverseReceiptTransfers.status,
          attemptCount: secondLoyverseReceiptTransfers.attemptCount,
          succeededAt: secondLoyverseReceiptTransfers.succeededAt,
          updatedAt: secondLoyverseReceiptTransfers.updatedAt,
          targetReceiptDate: secondLoyverseReceiptTransfers.targetReceiptDate
        })
        .from(secondLoyverseReceiptTransfers)
        .where(eq(secondLoyverseReceiptTransfers.status, 'succeeded'))
        .orderBy(desc(secondLoyverseReceiptTransfers.succeededAt), desc(secondLoyverseReceiptTransfers.updatedAt))
        .limit(RECENT_LIMIT)
    ]);

    const statusCounts = Object.fromEntries(statusRows.map((row) => [row.status, row.count])) as Record<
      string,
      number
    >;

    return {
      mirrorEnabled,
      credentialsConfigured,
      statusCounts,
      recentSucceeded,
      recentLimit: RECENT_LIMIT,
      dbError: null as string | null
    };
  } catch (loadError) {
    console.error('[mgmt-dashboard/loyverse-test] failed to load transfers', loadError);
    return {
      mirrorEnabled,
      credentialsConfigured,
      statusCounts: {} as Record<string, number>,
      recentSucceeded: [],
      recentLimit: RECENT_LIMIT,
      dbError: 'Database is unavailable. Check DATABASE_URL and Postgres connectivity.'
    };
  }
};
