import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { reportedErrors } from '$lib/server/db/schema';

export const load = async ({ params }: { params: { id: string } }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    error(400, 'Invalid incident id');
  }

  const incident = await db.query.reportedErrors.findFirst({
    where: eq(reportedErrors.id, id)
  });

  if (!incident) {
    error(404, 'Incident not found');
  }

  return { incident };
};
