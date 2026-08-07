import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { isCronAuthorized } from '$lib/server/financial-balance-reminder.logic';
import { runFinancialBalanceReminder } from '$lib/server/financial-balance-reminder';

const unauthorized = () => json({ error: 'Unauthorized' }, { status: 401 });

export const GET: RequestHandler = async ({ request }) => {
  if (!env.CRON_SECRET) return json({ error: 'Cron is not configured.' }, { status: 503 });
  if (!isCronAuthorized(request.headers.get('authorization'), env.CRON_SECRET)) return unauthorized();

  try {
    const result = await runFinancialBalanceReminder();
    return json(result, { status: result.status === 'in_progress' ? 409 : 200 });
  } catch (error) {
    console.error('[financial-balance-reminder] failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Financial reminder failed.' }, { status: 502 });
  }
};
