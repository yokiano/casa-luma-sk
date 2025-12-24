import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Only protect /tools routes
	if (event.url.pathname.startsWith('/tools')) {
		// Skip protection for the login page itself to avoid infinite loops
		if (event.url.pathname === '/tools/login') {
			return resolve(event);
		}

		const authCookie = event.cookies.get('casa_luma_tools_auth');
		
		// If no cookie, redirect to login
		if (!authCookie) {
			throw redirect(303, '/tools/login');
		}
	}

	const response = await resolve(event);
	return response;
};

