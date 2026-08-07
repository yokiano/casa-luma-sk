import { fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { Actions, PageServerLoad } from './$types';
import { readConfiguredToolsSessionRole } from '$lib/server/tools-session';
import { formatBangkokDateTimeLocal } from '$lib/server/balance-submission.logic';
import {
  BalanceSubmissionAuthorizationError,
  BalanceSubmissionConflictError,
  submitManagerBalanceSubmission
} from '$lib/server/balance-submissions';

export const load: PageServerLoad = async () => ({
  submissionKey: randomUUID(),
  defaultObservedAt: formatBangkokDateTimeLocal()
});

const formValue = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '');

export const actions: Actions = {
  default: async ({ request, cookies, locals }) => {
    // Re-check the signed cookie at the write boundary. `locals.role` also preserves the explicit development manager bypass.
    const role = readConfiguredToolsSessionRole(cookies.get('casa_luma_tools_auth')) ?? locals.role;
    if (role !== 'manager') return fail(403, { success: false, error: 'Manager authorization is required.' });

    const data = await request.formData();
    const values = {
      submissionKey: formValue(data.get('submissionKey')),
      observedAt: formValue(data.get('observedAt')),
      kbankBalance: formValue(data.get('kbankBalance')),
      safeBalance: formValue(data.get('safeBalance')),
      notes: formValue(data.get('notes'))
    };

    try {
      const result = await submitManagerBalanceSubmission(role, values);
      if (result.status === 'in_progress') {
        return fail(409, { success: false, error: 'This submission is already being processed. Wait a moment before retrying.', values });
      }
      return { success: true, duplicate: result.status === 'duplicate', submissionKey: result.submissionKey };
    } catch (error) {
      if (error instanceof BalanceSubmissionAuthorizationError) return fail(403, { success: false, error: error.message, values });
      if (error instanceof BalanceSubmissionConflictError) return fail(409, { success: false, error: error.message, values });
      const fieldErrors = (error as Error & { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fieldErrors) return fail(400, { success: false, error: 'Correct the highlighted fields.', fieldErrors, values });
      console.error('[balance-submission] failed:', error);
      return fail(500, { success: false, error: error instanceof Error ? error.message : 'Balance submission failed.', values });
    }
  }
};
