import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { queryReceiptByNumberFromDb } from '$lib/server/db/receipt-queries';
import { fetchFamilyByLoyverseCustomerId, type FamilySummary } from '$lib/tools/families/families.server';

export const load: PageServerLoad = async ({ params }) => {
  const receiptNumber = params.receiptNumber.trim();

  if (!receiptNumber) {
    error(404, 'Receipt not found');
  }

  const receipt = await queryReceiptByNumberFromDb({ receiptNumber });

  if (!receipt) {
    error(404, 'Receipt not found');
  }

  let family: FamilySummary | null = null;
  if (receipt.customer_id) {
    try {
      family = await fetchFamilyByLoyverseCustomerId(receipt.customer_id);
    } catch (familyError) {
      console.warn('[receipts] failed to load customer family details', {
        receiptNumber,
        customerId: receipt.customer_id,
        error: familyError instanceof Error ? familyError.message : familyError
      });
    }
  }

  return { receipt, family };
};
