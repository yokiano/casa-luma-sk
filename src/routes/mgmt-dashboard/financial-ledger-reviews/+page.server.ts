import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readConfiguredToolsSessionRole } from '$lib/server/tools-session';
import {
  getFinancialLedgerReviewQueue,
  updateFinancialLedgerReview
} from '$lib/server/financial-ledger-review-dashboard';

const formValue = (value: FormDataEntryValue | null) => typeof value === 'string' ? value : '';
const integerValue = (value: FormDataEntryValue | null) => Number(formValue(value));

export const load: PageServerLoad = async () => getFinancialLedgerReviewQueue();

export const actions: Actions = {
  default: async ({ request, cookies, locals }) => {
    const role = readConfiguredToolsSessionRole(cookies.get('casa_luma_tools_auth')) ?? locals.role;
    if (role !== 'manager') return fail(403, { success: false, error: 'Manager authorization is required.' });

    const data = await request.formData();
    const values = {
      reviewId: integerValue(data.get('reviewId')),
      category: formValue(data.get('category')),
      receiptNotRequired: data.get('receiptNotRequired') === 'true',
      expectedReviewRevision: integerValue(data.get('expectedReviewRevision'))
    };

    try {
      const result = await updateFinancialLedgerReview(values);
      return { success: true, ...result };
    } catch (error) {
      console.error('[financial-ledger-review] update failed:', error);
      return fail(400, {
        success: false,
        error: error instanceof Error ? error.message : 'Financial Ledger review update failed.',
        values
      });
    }
  }
};
