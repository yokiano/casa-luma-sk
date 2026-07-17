import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { readConfiguredToolsSessionRole } from '$lib/server/tools-session';

/** Remote commands validate the signed session again at their own request boundary. */
export const requireEmailAutomationManager = () => {
  const event = getRequestEvent();
  const role = event.locals.role ?? readConfiguredToolsSessionRole(event.cookies.get('casa_luma_tools_auth'));
  if (role !== 'manager') error(403, 'Manager authorization is required. Please sign in again.');
  return { actor: 'manager' as const };
};
