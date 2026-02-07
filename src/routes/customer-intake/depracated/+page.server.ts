import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import type { IntakeFormData } from '$lib/types/intake';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import { submitIntakeForm, checkExistingCustomer } from '$lib/server/intake-actions';

export const load: PageServerLoad = async ({ url }) => {
  const secret = url.searchParams.get('secret');

  // Only grant access if secret is present and matches
  if (env.CUSTOMER_INTAKE_SECRET && secret === env.CUSTOMER_INTAKE_SECRET) {
    return { authorized: true };
  }

  return { authorized: false };
};

export const actions: Actions = {
  submit: async ({ request }) => {
    try {
      const formData = await request.formData();
      const rawData = formData.get('data');

      if (!rawData || typeof rawData !== 'string') {
        return fail(400, { success: false, message: 'Missing form data' });
      }

      const data: IntakeFormData = JSON.parse(rawData);
      
      const result = await submitIntakeForm(data);
      return result;
    } catch (error: any) {
      console.error('Intake form error:', error);
      return fail(error.status || 500, { 
        success: false, 
        message: error.message || 'Server error' 
      });
    }
  },
  check: async ({ request }) => {
    try {
      const formData = await request.formData();
      const email = formData.get('email')?.toString().trim();
      const phone = formData.get('phone')?.toString().trim();

      return await checkExistingCustomer(email, phone);
    } catch (e) {
      console.error('[customer-intake] Check failed:', e);
      return { exists: false, error: true };
    }
  }
};
