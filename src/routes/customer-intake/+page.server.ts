import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import type { IntakeFormData } from '$lib/types/intake';
import { NOTION_API_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import {
  FamiliesDatabase,
  FamiliesPatchDTO,
  type FamiliesDietaryPreferenceFamilyPropertyType,
  type FamiliesHowDidYouHearAboutUsPropertyType,
} from '$lib/notion-sdk/dbs/families';
import { FamilyMembersDatabase, FamilyMembersPatchDTO } from '$lib/notion-sdk/dbs/family-members';
import { loyverse } from '$lib/server/loyverse';
import { assignFamilyCustomerCode } from '$lib/server/customer-code';

function normalizeDietaryPreference(input: string): {
  value: FamiliesDietaryPreferenceFamilyPropertyType;
  extraNote?: string;
} {
  const trimmed = (input ?? '').trim();

  if (!trimmed) return { value: 'None' };
  if (trimmed === 'None') return { value: 'None' };
  if (trimmed === 'Vegetarian') return { value: 'Vegetarian' };
  if (trimmed === 'Vegan') return { value: 'Vegan' };
  if (trimmed === 'Gluten Free') return { value: 'Gluten Free' };
  if (trimmed === 'Other') return { value: 'Other' };

  return { value: 'Other', extraNote: `Dietary preference: ${trimmed}` };
}

function normalizeHowDidYouHear(input: string): {
  value?: FamiliesHowDidYouHearAboutUsPropertyType;
  extraNote?: string;
} {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return { value: undefined };

  // Keep in sync with the form <select> values
  if (trimmed === 'instagram') return { value: 'Instagram' };
  if (trimmed === 'facebook') return { value: 'Facebook' };
  if (trimmed === 'google') return { value: 'Google' };
  if (trimmed === 'friend') return { value: 'Friend' };
  if (trimmed === 'walkin') return { value: 'Walk-in' };
  if (trimmed === 'other') return { value: 'Other' };

  return { value: 'Other', extraNote: `How did you hear about us?: ${trimmed}` };
}

export const load: PageServerLoad = async ({ url }) => {
  const secret = url.searchParams.get('secret');

  // Only grant access if secret is present and matches
  if (env.CUSTOMER_INTAKE_SECRET && secret === env.CUSTOMER_INTAKE_SECRET) {
    return { authorized: true };
  }

  return { authorized: false };
};

function getNewLoyverseName(currentName: string, customerCode: string | undefined): string {
  if (!customerCode) return currentName;
  
  // Strip any existing suffix like "(customer code ...)" or "[...]"
  // The user said: Cohen (customer code CO3) -> Cohen [CO3]
  let baseName = currentName
    .replace(/\(customer code [^)]+\)/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim();
    
  return `${baseName} [${customerCode}]`;
}

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
      if (!data.familyName?.trim()) {
        return fail(400, { success: false, message: 'Family name is required' });
      }
      if (!data.mainPhone?.trim()) {
        return fail(400, { success: false, message: 'Main phone is required' });
      }
      if (!Array.isArray(data.caregivers) || data.caregivers.length === 0) {
        return fail(400, { success: false, message: 'At least one caregiver is required' });
      }

      // --- Save to Notion (Families + Family Members) ---
      const familiesDb = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
      const membersDb = new FamilyMembersDatabase({ notionSecret: NOTION_API_KEY });

      const dietary = normalizeDietaryPreference(data.dietaryPreference);
      const heard = normalizeHowDidYouHear(data.howDidYouHear);

      const extraNotes = [dietary.extraNote, heard.extraNote].filter(Boolean).join('\n');
      const specialNotes = [data.specialNotes?.trim(), extraNotes].filter(Boolean).join('\n');

      const familyPage = await familiesDb.createPage(
        new FamiliesPatchDTO({
          properties: {
            familyName: data.familyName.trim(),
            mainPhone: data.mainPhone.trim(),
            mainEmail: data.email?.trim() ? data.email.trim() : undefined,
            livesInKohPhangan: data.livesInPhangan ?? undefined,
            nationality: data.nationality?.trim() ? data.nationality.trim() : undefined,
            dietaryPreferenceFamily: dietary.value,
            howDidYouHearAboutUs: heard.value,
            specialNotes,
            status: 'Active',
          },
        }),
      );

      const customerCode = await assignFamilyCustomerCode({
        familiesDb,
        familyPageId: familyPage.id,
        familyName: data.familyName.trim(),
      });

      // --- Sync to Loyverse Customers ---
      const syncToLoyverse = async () => {
        const maxRetries = 2;
        let lastError: any = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const loyverseName = getNewLoyverseName(data.familyName.trim(), customerCode);
            
            // Attempt 1: Create or Update by matching email/phone
            let loyverseCustomer = await loyverse.createOrUpdateCustomer({
              customer_code: customerCode,
              name: loyverseName,
              email: data.email?.trim() ? data.email.trim() : undefined,
              phone_number: data.mainPhone.trim(),
              note: `Created from Casa Luma customer intake form [${customerCode}]`,
            });

            // Attempt 2: If Loyverse matched an existing customer but ignored the name change
            // (common when matching by email/phone without an ID), force the update using the ID.
            if (loyverseCustomer.name !== loyverseName) {
              loyverseCustomer = await loyverse.createOrUpdateCustomer({
                id: loyverseCustomer.id,
                name: loyverseName,
                customer_code: customerCode,
              });
            }

            await familiesDb.updatePage(
              familyPage.id,
              new FamiliesPatchDTO({
                properties: {
                  loyverseCustomerId: loyverseCustomer.id,
                },
              }),
            );
            return loyverseCustomer;
          } catch (e: any) {
            lastError = e;
            console.error(`[customer-intake] Loyverse sync attempt ${attempt + 1} failed:`, e.message);
            // Don't wait between retries as per user preference to avoid timers, 
            // but Loyverse might benefit from a tiny gap if it's a rate limit.
            // However, we'll follow the "no timers" rule strictly for now.
          }
        }
        
        console.error('[customer-intake] Loyverse sync failed after all attempts:', lastError);
        return null;
      };

      // Run member creation and Loyverse sync in parallel to save time and improve reliability
      const [memberPages] = await Promise.all([
        Promise.all([
          ...data.kids.map((kid) =>
            membersDb.createPage(
              new FamilyMembersPatchDTO({
                properties: {
                  name: kid.name?.trim() ? kid.name.trim() : 'Kid',
                  memberType: 'Kid',
                  gender: kid.gender,
                  dob: kid.dob?.trim() ? { start: kid.dob.trim() } : undefined,
                  notes: kid.notes?.trim() ? kid.notes.trim() : undefined,
                  family: [{ id: familyPage.id }],
                },
              }),
            ),
          ),
          ...data.caregivers.map((cg) =>
            membersDb.createPage(
              new FamilyMembersPatchDTO({
                properties: {
                  name: cg.name?.trim() ? cg.name.trim() : 'Caregiver',
                  memberType: 'Caregiver',
                  caregiverRole: cg.caregiverRole,
                  contactMethod: cg.contactMethod,
                  phone: cg.phone?.trim() ? cg.phone.trim() : undefined,
                  notes: cg.notes?.trim() ? cg.notes.trim() : undefined,
                  family: [{ id: familyPage.id }],
                },
              }),
            ),
          ),
        ]),
        syncToLoyverse(),
      ]);

      // Ensure Families.Members is populated even if the relation isn't 2-way
      await familiesDb.updatePage(
        familyPage.id,
        new FamiliesPatchDTO({
          properties: {
            members: memberPages.map((p) => ({ id: p.id })),
          },
        }),
      );

      return { success: true, customerCode };
    } catch (error) {
      console.error('Intake form error:', error);
      return fail(500, { success: false, message: 'Server error' });
    }
  },
  check: async ({ request }) => {
    try {
      const formData = await request.formData();
      const email = formData.get('email')?.toString().trim();
      const phone = formData.get('phone')?.toString().trim();

      if (!email && !phone) {
        return { exists: false };
      }

      // This is expensive as it grows, but Loyverse API doesn't support 
      // direct search by phone/email currently in our client.
      const allCustomers = await loyverse.getAllCustomers();
      
      const found = allCustomers.find(c => 
        (email && c.email === email) || 
        (phone && c.phone_number === phone)
      );

      if (found) {
        return { 
          exists: true, 
          customer: {
            name: found.name,
            code: found.customer_code
          }
        };
      }

      return { exists: false };
    } catch (e) {
      console.error('[customer-intake] Check failed:', e);
      return { exists: false, error: true };
    }
  }
};
