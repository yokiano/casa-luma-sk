import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
  const query = url.search ? url.search : '';
  redirect(307, `/mgmt-dashboard/receipts${query}`);
};
