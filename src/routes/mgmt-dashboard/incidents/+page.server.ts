import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { reportedErrors } from '$lib/server/db/schema';

export const load = async () => {
  try {
    const incidents = await db
      .select()
      .from(reportedErrors)
      .orderBy(desc(reportedErrors.createdAt))
      .limit(100);

    return { incidents, dbError: null };
  } catch (loadError) {
    console.error('[incidents] failed to load incidents', loadError);
    return {
      incidents: [],
      dbError: 'Database is unavailable. Check DATABASE_URL and Postgres connectivity.'
    };
  }
};
