import { NOTION_BIRTHDAY_BOOKINGS_DB_ID } from '$env/static/private';
import { notion } from '$lib/server/notion';
import { incidentReporter } from '$lib/server/incidents/reporter';
import { fail, type Actions } from '@sveltejs/kit';
import {
  BIRTHDAY_MAIN_COURSE_LABELS,
  BIRTHDAY_PACKAGE_NOTION_LABELS,
  getPlaygroundNotionLabel
} from '$lib/birthday-pricing';
import type { BirthdayIntakeFormData } from '$lib/types/birthday-intake';

// Generates a unique, high-end booking reference
function generateBookingReference(childName: string): string {
  const dateStr = new Date().toISOString().slice(2, 7).replace('-', ''); // e.g. "2605"
  const prefix = (childName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() + 'XXX').slice(0, 3);
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit unique pin
  return `BD-${dateStr}-${prefix}${random}`;
}

export const actions: Actions = {
  submit: async ({ request, url }) => {
    const data = await request.formData();
    const rawData = data.get('data') as string;

    if (!rawData) {
      return fail(400, { message: 'Missing form payload.' });
    }

    try {
      const payload: BirthdayIntakeFormData = JSON.parse(rawData);

      // Validate required organizer and child details
      if (!payload.parentName || !payload.phone || !payload.childName || !payload.eventDate) {
        return fail(400, { message: 'Required fields are missing.' });
      }

      if (!payload.rulesAccepted) {
        return fail(400, { message: 'You must accept all venue rules before submitting.' });
      }

      const bookingReference = generateBookingReference(payload.childName);

      const packageLabel =
        BIRTHDAY_PACKAGE_NOTION_LABELS[payload.selectedPackage] || BIRTHDAY_PACKAGE_NOTION_LABELS['smaller-setup'];

      const capacityBucket =
        payload.selectedPackage === 'smaller-setup' ? 'up-to-8' : 'up-to-15';

      const upgrades: string[] = [];
      if (payload.selectedPackage === 'smaller-setup') {
        if (payload.smallerSetupBuffet) upgrades.push('Buffet (+500 THB/child)');
        if (payload.smallerSetupCake) upgrades.push('Cake (+700 THB)');
        if (payload.smallerSetupDecorations) upgrades.push('Decorations (+500 THB)');
      }

      const playgroundLabel = getPlaygroundNotionLabel(
        capacityBucket,
        payload.includePlayground
      );
      if (playgroundLabel) upgrades.push(playgroundLabel);

      const mainCourseLabel = payload.mainCourse
        ? BIRTHDAY_MAIN_COURSE_LABELS[payload.mainCourse] || 'None'
        : 'None';

      // Map activities to multi-select option names
      const activities: string[] = [];
      if (payload.addonFacePainting) activities.push('Face Painting (+3000 THB)');
      if (payload.addonMovementActivity) activities.push('Movement Activity (+5000 THB)');
      if (payload.addonPlantingWorkshop) activities.push('Planting & Craft Workshop (+6000 THB)');

      // Create booking page in Notion
      const dbId = NOTION_BIRTHDAY_BOOKINGS_DB_ID;
      if (!dbId) {
        throw new Error('NOTION_BIRTHDAY_BOOKINGS_DB_ID is not configured in the environment.');
      }

      await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          'Booking Reference': {
            title: [
              {
                text: { content: bookingReference }
              }
            ]
          },
          'Parent Name': {
            rich_text: [
              {
                text: { content: payload.parentName }
              }
            ]
          },
          'Phone': {
            phone_number: payload.phone
          },
          'Email': {
            email: payload.email || null
          },
          'Child Name': {
            rich_text: [
              {
                text: { content: payload.childName }
              }
            ]
          },
          'Turning Age': {
            number: payload.turningAge
          },
          'Event Date': {
            date: { start: payload.eventDate }
          },
          'Start Time': {
            rich_text: [
              {
                text: { content: payload.startTime }
              }
            ]
          },
          'Package': {
            select: { name: packageLabel }
          },
          'Kids Count': {
            number: payload.kidsCount
          },
          'Upgrades': {
            multi_select: upgrades.map(name => ({ name }))
          },
          'Main Course': {
            select: { name: mainCourseLabel }
          },
          'Activities': {
            multi_select: activities.map(name => ({ name }))
          },
          'Special Notes': {
            rich_text: [
              {
                text: { content: payload.specialNotes || '' }
              }
            ]
          },
          'Rules Accepted': {
            checkbox: payload.rulesAccepted
          },
          'Estimated Total': {
            number: payload.estimatedTotal
          }
        }
      });

      const summaryUrl = `${url.origin}/birthdays/summary?ref=${encodeURIComponent(bookingReference)}`;

      await incidentReporter.report({
        source: 'birthday-booking',
        code: 'BIRTHDAY_BOOKING_SUBMITTED',
        severity: 'critical',
        message: `New birthday party request for ${payload.childName}.`,
        context: {
          bookingReference,
          parentName: payload.parentName,
          phone: payload.phone,
          email: payload.email || 'N/A',
          childName: payload.childName,
          turningAge: payload.turningAge,
          eventDate: payload.eventDate,
          startTime: payload.startTime,
          packageLabel,
          kidsCount: payload.kidsCount,
          includePlayground: payload.includePlayground,
          estimatedTotal: payload.estimatedTotal,
          mainCourse: mainCourseLabel,
          upgrades,
          activities,
          specialNotes: payload.specialNotes || undefined,
          summaryUrl
        }
      });

      return { success: true, bookingReference };
    } catch (e) {
      console.error('[BirthdaySubmitServer] Error processing booking:', e);
      return fail(500, { message: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  }
};
