import type { PageServerLoad } from './$types';
import { getDashboardData } from '$lib/server/email-automation/dashboard';

export const load: PageServerLoad = async () => {
  return getDashboardData();
};
