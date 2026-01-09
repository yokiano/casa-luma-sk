import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import type { IntakeFormData } from '$lib/types/intake';

export const actions: Actions = {
  submit: async ({ request }) => {
    try {
      const formData = await request.formData();
      const rawData = formData.get('data');

      if (!rawData || typeof rawData !== 'string') {
        return fail(400, { success: false, message: 'Missing form data' });
      }

      const data: IntakeFormData = JSON.parse(rawData);
      
      // Basic Validation
      if (!data.familyName) {
        return fail(400, { success: false, message: 'Family name is required' });
      }

      // Log to console for now as requested
      console.log('--- NEW CUSTOMER INTAKE ---');
      console.log(JSON.stringify(data, null, 2));
      console.log('---------------------------');

      // In future: Save to Notion

      return { success: true };
    } catch (error) {
      console.error('Intake form error:', error);
      return fail(500, { success: false, message: 'Server error' });
    }
  }
};
