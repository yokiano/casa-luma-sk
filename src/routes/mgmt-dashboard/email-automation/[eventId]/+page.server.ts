import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getEmailAutomationEventDetail } from '$lib/server/email-automation/dashboard';
export const load: PageServerLoad = async ({ params }) => {
  const eventId = Number(params.eventId);
  if (!Number.isSafeInteger(eventId) || eventId < 1) error(404, 'Email automation event not found');
  const event = await getEmailAutomationEventDetail(eventId);
  if (!event) error(404, 'Email automation event not found');
  return event;
};
