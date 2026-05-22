import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { queryReceiptByNumberFromDb } from '$lib/server/db/receipt-queries';

export const load: PageServerLoad = async ({ params }) => {
  const receiptNumber = params.receiptNumber.trim();

  if (!receiptNumber) {
    error(404, 'Receipt not found');
  }

  const receipt = await queryReceiptByNumberFromDb({ receiptNumber });

  if (!receipt) {
    error(404, 'Receipt not found');
  }

  return { receipt };
};
