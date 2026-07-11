import { desc, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { emailEvents } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
  const [totals, recent] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      ready: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'ready')::int`,
      review: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'review')::int`,
      failedNotification: sql<number>`count(*) filter (where ${emailEvents.notificationState} = 'retry_pending')::int`
    }).from(emailEvents),
    db.select().from(emailEvents).orderBy(desc(emailEvents.receivedAt)).limit(12)
  ]);

  return { totals: totals[0] ?? { total: 0, ready: 0, review: 0, failedNotification: 0 }, recent };
};
