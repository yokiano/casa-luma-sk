import { NOTION_BIRTHDAY_BOOKINGS_DB_ID } from '$env/static/private';
import { 
  queryNotionDatabase,
  getTextContent, 
  getSelectValue, 
  getMultiSelectValues, 
  getNumberValue, 
  getDateValue, 
  getEmailValue, 
  getPhoneValue 
} from '$lib/server/notion';
import { error, isHttpError } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const ref = url.searchParams.get('ref');
  if (!ref) {
    throw error(400, 'Missing booking reference in URL query parameter.');
  }

  const dbId = NOTION_BIRTHDAY_BOOKINGS_DB_ID;
  if (!dbId) {
    throw error(500, 'NOTION_BIRTHDAY_BOOKINGS_DB_ID is not configured in the environment.');
  }

  try {
    // Query Notion database to find page with matching title / reference
    const response = await queryNotionDatabase(dbId, {
      filter: {
        property: 'Booking Reference',
        title: {
          equals: ref
        }
      }
    });

    const page = response.results[0];
    if (!page || !('properties' in page)) {
      throw error(404, `Booking reference "${ref}" was not found.`);
    }

    const props = page.properties;

    return {
      booking: {
        reference: ref,
        parentName: getTextContent(props['Parent Name']),
        phone: getPhoneValue(props['Phone']) || getTextContent(props['Phone']),
        email: getEmailValue(props['Email']) || '',
        childName: getTextContent(props['Child Name']),
        turningAge: getNumberValue(props['Turning Age']),
        eventDate: getDateValue(props['Event Date']) || '',
        startTime: getTextContent(props['Start Time']),
        selectedPackage: getSelectValue(props['Package']),
        kidsCount: getNumberValue(props['Kids Count']),
        upgrades: getMultiSelectValues(props['Upgrades']),
        mainCourse: getSelectValue(props['Main Course']),
        activities: getMultiSelectValues(props['Activities']),
        specialNotes: getTextContent(props['Special Notes']),
        estimatedTotal: getNumberValue(props['Estimated Total'])
      }
    };
  } catch (e) {
    if (isHttpError(e)) throw e;
    console.error('[BirthdaySummaryLoad] Error loading booking summary:', e);
    throw error(500, 'Failed to retrieve booking summary from Notion.');
  }
};
