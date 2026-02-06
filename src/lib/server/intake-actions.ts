import { NOTION_API_KEY } from '$env/static/private';
import {
  FamiliesDatabase,
  FamiliesPatchDTO,
  type FamiliesDietaryPreferenceFamilyPropertyType,
  type FamiliesHowDidYouHearAboutUsPropertyType,
} from '$lib/notion-sdk/dbs/families';
import { FamilyMembersDatabase, FamilyMembersPatchDTO } from '$lib/notion-sdk/dbs/family-members';
import { loyverse } from '$lib/server/loyverse';
import { assignFamilyCustomerCode } from '$lib/server/customer-code';
import type { IntakeFormData } from '$lib/types/intake';

export function normalizeDietaryPreference(input: string): {
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

export function normalizeHowDidYouHear(input: string): {
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

export function getNewLoyverseName(currentName: string, customerCode: string | undefined): string {
  if (!customerCode) return currentName;
  
  // Strip any existing suffix like "(customer code ...)" or "[...]"
  let baseName = currentName
    .replace(/\(customer code [^)]+\)/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim();
    
  return `${baseName} [${customerCode}]`;
}

export async function submitIntakeForm(data: IntakeFormData) {
  // Basic Validation
  if (!data.familyName?.trim()) {
    throw new Error('Family name is required');
  }
  if (!data.mainPhone?.trim()) {
    throw new Error('Main phone is required');
  }
  
  // Relaxed caregiver validation for visitors
  const isResident = data.livesInPhangan !== false;
  if (isResident && (!Array.isArray(data.caregivers) || data.caregivers.length === 0)) {
    throw new Error('At least one caregiver is required for residents');
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
        console.error(`[intake-actions] Loyverse sync attempt ${attempt + 1} failed:`, e.message);
      }
    }
    
    console.error('[intake-actions] Loyverse sync failed after all attempts:', lastError);
    return null;
  };

  // Run member creation and Loyverse sync in parallel
  const [memberPages] = await Promise.all([
    Promise.all([
      ...(data.kids || []).map((kid) =>
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
      ...(data.caregivers || []).map((cg) =>
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

  // Ensure Families.Members is populated
  await familiesDb.updatePage(
    familyPage.id,
    new FamiliesPatchDTO({
      properties: {
        members: memberPages.map((p) => ({ id: p.id })),
      },
    }),
  );

  return { success: true, customerCode };
}

export async function checkExistingCustomer(email?: string, phone?: string) {
  if (!email && !phone) {
    return { exists: false };
  }

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
}
