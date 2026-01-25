import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { loyverse } from '$lib/server/loyverse';

function getNewLoyverseName(currentName: string, customerCode: string | undefined): string {
  if (!customerCode) return currentName;

  const baseName = currentName
    .replace(/\(customer code [^)]+\)/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim();

  return `${baseName} [${customerCode}]`;
}

export const load: PageServerLoad = async ({ url, cookies }) => {
  const secret = url.searchParams.get('secret');
  const hasAccess = cookies.get('intake_access') === 'true';

  if (env.CUSTOMER_INTAKE_SECRET && secret === env.CUSTOMER_INTAKE_SECRET) {
    cookies.set('intake_access', 'true', {
      path: '/customer-intake',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      secure: process.env.NODE_ENV === 'production',
    });
    return { authorized: true };
  }

  if (hasAccess) return { authorized: true };
  return { authorized: false };
};

export const actions: Actions = {
  testLoyverseRename: async () => {
    try {
      console.log('[Loyverse Temp Tool] Test rename started.');
      const response = await loyverse.getCustomers(5);
      const results = response.customers.map((c) => {
        const newName = getNewLoyverseName(c.name, c.customer_code);
        return {
          id: c.id,
          oldName: c.name,
          newName,
          code: c.customer_code ?? null,
          willChange: newName !== c.name,
        };
      });

      console.log(`[Loyverse Temp Tool] Test rename complete. ${results.length} customers checked.`);
      return {
        success: true,
        results,
        logs: [
          '[Loyverse Temp Tool] Test rename started.',
          `[Loyverse Temp Tool] Checked ${results.length} customers.`,
        ],
      };
    } catch (e: any) {
      console.error('[Loyverse Temp Tool] Test rename failed:', e);
      return fail(500, { success: false, message: e.message });
    }
  },

  renameAllLoyverseCustomers: async () => {
    try {
      console.log('[Loyverse Temp Tool] Rename all customers started.');
      const allCustomers = await loyverse.getAllCustomers();
      console.log(`[Loyverse Temp Tool] Loaded ${allCustomers.length} customers.`);

      let updatedCount = 0;
      let skippedNoCode = 0;
      let skippedAlready = 0;
      const updates: string[] = [];
      const skipSamples: string[] = [];
      const errors: string[] = [];
      const maxSamples = 40;

      for (const c of allCustomers) {
        if (!c.customer_code) {
          skippedNoCode++;
          if (skipSamples.length < maxSamples) {
            skipSamples.push(`No code: ${c.name} (${c.id})`);
          }
          continue;
        }

        const newName = getNewLoyverseName(c.name, c.customer_code);
        if (newName === c.name) {
          skippedAlready++;
          if (skipSamples.length < maxSamples) {
            skipSamples.push(`Already ok: ${c.name} (${c.customer_code})`);
          }
          continue;
        }

        console.log(`[Loyverse Temp Tool] Updating "${c.name}" -> "${newName}" (${c.id})`);
        try {
          await loyverse.createOrUpdateCustomer({
            id: c.id,
            name: newName,
            customer_code: c.customer_code,
          });
          updatedCount++;
          updates.push(`${c.name} -> ${newName}`);
        } catch (e: any) {
          const message = `Failed ${c.id}: ${e.message}`;
          console.error(`[Loyverse Temp Tool] ${message}`);
          errors.push(message);
        }
      }

      console.log('[Loyverse Temp Tool] Rename complete.', {
        updatedCount,
        skippedNoCode,
        skippedAlready,
        errors: errors.length,
      });

      return {
        success: true,
        message: `Updated ${updatedCount} customers.`,
        updatedCount,
        skippedNoCode,
        skippedAlready,
        updates,
        skipSamples,
        errors,
        totalCustomers: allCustomers.length,
        logs: [
          '[Loyverse Temp Tool] Rename all customers started.',
          `[Loyverse Temp Tool] Total customers: ${allCustomers.length}`,
          `[Loyverse Temp Tool] Updated: ${updatedCount}`,
          `[Loyverse Temp Tool] Skipped (no code): ${skippedNoCode}`,
          `[Loyverse Temp Tool] Skipped (already ok): ${skippedAlready}`,
          `[Loyverse Temp Tool] Errors: ${errors.length}`,
        ],
      };
    } catch (e: any) {
      console.error('[Loyverse Temp Tool] Rename all failed:', e);
      return fail(500, { success: false, message: e.message });
    }
  },
};
