import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
  const receiptNumber = encodeURIComponent(params.receiptNumber.trim());
  redirect(307, `/mgmt-dashboard/receipts/${receiptNumber}${url.search}`);
};
