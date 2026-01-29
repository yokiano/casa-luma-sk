import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Bypass CSRF check for the customer webhook endpoint
	if (event.url.pathname.startsWith('/api/customer')) {
		// SvelteKit's CSRF protection expects the Origin header to match the request URL.
		// Webhooks from external services (like Loyverse) often don't include an Origin header 
		// or have a different one. Since we will validate the webhook signature manually 
		// in the endpoint, we can safely bypass this framework-level check.
		event.request.headers.set('origin', event.url.origin);
	}

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

		// Role-based protection
		const isManager = authCookie === 'manager';
		
		// List of routes that require manager access
		const managerOnlyRoutes = [
			'/tools/salary-payment'
		];

		if (managerOnlyRoutes.some(route => event.url.pathname.startsWith(route)) && !isManager) {
			throw redirect(303, '/tools');
		}
	}

	const response = await resolve(event);

	return response;
};
