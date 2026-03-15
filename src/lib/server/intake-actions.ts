import { NOTION_API_KEY } from '$env/static/private';
import {
  FamiliesDatabase,
  FamiliesPatchDTO,
  FamiliesResponseDTO,
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

type LoyverseSyncResult =
  | { ok: true; customerId: string }
  | { ok: false; lastError: unknown };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeLoyversePhoneNumber(input: string): string {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return '';

  const compact = trimmed.replace(/[\s().-]/g, '');

  if (compact.startsWith('+')) {
    const normalized = `+${compact.slice(1).replace(/\D/g, '')}`;
    return normalized.length > 1 ? normalized : '';
  }

  if (compact.startsWith('00')) {
    const normalized = `+${compact.slice(2).replace(/\D/g, '')}`;
    return normalized.length > 1 ? normalized : '';
  }

  return compact.replace(/\D/g, '');
}

function isProbablyValidLoyversePhoneNumber(phone: string): boolean {
  const digitsOnly = phone.startsWith('+') ? phone.slice(1) : phone;
  return /^\d{6,15}$/.test(digitsOnly);
}

function isLoyversePhoneValidationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("object.phone_number");
}

async function notifyAfterSuccessfulLoyverseCreation(_payload: {
  familyPageId: string;
  customerCode?: string;
  loyverseCustomerId: string;
}) {
  return;
}

async function syncFamilyToLoyverseWithRetry(params: {
  familyName: string;
  customerCode?: string;
  email?: string;
  phone: string;
}): Promise<LoyverseSyncResult> {
  const maxAttempts = 6;
  const baseDelayMs = 800;
  let lastError: unknown = null;
  const normalizedPhone = normalizeLoyversePhoneNumber(params.phone);

  if (!isProbablyValidLoyversePhoneNumber(normalizedPhone)) {
    return {
      ok: false,
      lastError: new Error(`Invalid phone number for Loyverse: "${params.phone}"`),
    };
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const loyverseName = getNewLoyverseName(params.familyName.trim(), params.customerCode);

        let loyverseCustomer = await loyverse.createOrUpdateCustomer({
          customer_code: params.customerCode,
          name: loyverseName,
          email: params.email?.trim() ? params.email.trim() : undefined,
          phone_number: normalizedPhone,
          note: `Created from Casa Luma customer intake form [${params.customerCode}]`,
        });

      if (loyverseCustomer.name !== loyverseName) {
        loyverseCustomer = await loyverse.createOrUpdateCustomer({
          id: loyverseCustomer.id,
          name: loyverseName,
          customer_code: params.customerCode,
        });
      }

      return { ok: true, customerId: loyverseCustomer.id };
    } catch (error) {
      lastError = error;
      if (isLoyversePhoneValidationError(error)) {
        return {
          ok: false,
          lastError: new Error(`Invalid phone number for Loyverse: "${params.phone}" -> "${normalizedPhone}"`),
        };
      }

      const waitMs = baseDelayMs * 2 ** (attempt - 1);
      console.error(`[intake-actions] Loyverse sync attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt < maxAttempts) {
        await delay(waitMs);
      }
    }
  }

  return { ok: false, lastError };
}

export async function syncExistingFamilyToLoyverse(familyPageId: string) {
  const familiesDb = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
  const familyPage = await familiesDb.getPage(familyPageId);
  const family = new FamiliesResponseDTO(familyPage as never);

  const familyName = family.properties.familyName.text?.trim();
  const mainPhone = family.properties.mainPhone?.trim();
  const mainEmail = family.properties.mainEmail?.trim();
  const existingCustomerCode = family.properties.customerNumber.text?.trim();
  const existingLoyverseCustomerId = family.properties.loyverseCustomerId.text?.trim();

  if (existingLoyverseCustomerId) {
    return {
      success: true,
      alreadySynced: true,
      familyId: family.id,
      familyName: familyName ?? 'Untitled Family',
      customerCode: existingCustomerCode || undefined,
      loyverseCustomerId: existingLoyverseCustomerId,
      mainPhone: mainPhone || null,
      mainEmail: mainEmail || null,
      status: family.properties.status?.name ?? null,
    };
  }

  if (!familyName) {
    throw new Error('Family name is required before syncing to Loyverse');
  }

  if (!mainPhone) {
    throw new Error('Main phone is required before syncing to Loyverse');
  }

  const customerCode =
    existingCustomerCode ||
    (await assignFamilyCustomerCode({
      familiesDb,
      familyPageId: family.id,
      familyName,
    }));

  const loyverseSync = await syncFamilyToLoyverseWithRetry({
    familyName,
    customerCode,
    email: mainEmail,
    phone: mainPhone,
  });

  if (!loyverseSync.ok) {
    console.error('[intake-actions] Loyverse sync failed after all retry attempts:', loyverseSync.lastError);
    throw new Error('Failed to sync customer to Loyverse');
  }

  await familiesDb.updatePage(
    family.id,
    new FamiliesPatchDTO({
      properties: {
        loyverseCustomerId: loyverseSync.customerId,
      },
    }),
  );

  await notifyAfterSuccessfulLoyverseCreation({
    familyPageId: family.id,
    customerCode,
    loyverseCustomerId: loyverseSync.customerId,
  });

  return {
    success: true,
    alreadySynced: false,
    familyId: family.id,
    familyName,
    customerCode,
    loyverseCustomerId: loyverseSync.customerId,
    mainPhone,
    mainEmail: mainEmail || null,
    status: family.properties.status?.name ?? null,
  };
}

export async function submitIntakeForm(data: IntakeFormData) {
  // Basic Validation
  if (!data.familyName?.trim()) {
    throw new Error('Family name is required');
  }
  if (!data.mainPhone?.trim()) {
    throw new Error('Main phone is required');
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

  // Run member creation and Loyverse sync in parallel
  const [memberPages, loyverseSync] = await Promise.all([
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
    syncFamilyToLoyverseWithRetry({
      familyName: data.familyName,
      customerCode,
      email: data.email,
      phone: data.mainPhone,
    }),
  ]);

  if (loyverseSync.ok) {
    await familiesDb.updatePage(
      familyPage.id,
      new FamiliesPatchDTO({
        properties: {
          loyverseCustomerId: loyverseSync.customerId,
        },
      }),
    );

    await notifyAfterSuccessfulLoyverseCreation({
      familyPageId: familyPage.id,
      customerCode,
      loyverseCustomerId: loyverseSync.customerId,
    });
  } else {
    console.error('[intake-actions] Loyverse sync failed after all retry attempts:', loyverseSync.lastError);
  }

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
