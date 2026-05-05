import { redirect, type Handle } from '@sveltejs/kit';
import { MANAGER_PASSWORD_BYPASS } from '$env/static/private';

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize role
	event.locals.role = undefined;

	// Bypass CSRF checks for external webhook endpoints.
	if (
		event.url.pathname.startsWith('/api/customer') ||
		event.url.pathname.startsWith('/api/webhooks/receipt')
	) {
		// SvelteKit's CSRF protection expects the Origin header to match the request URL.
		// Webhooks from external services (like Loyverse) often don't include an Origin header
		// or have a different one. The endpoints validate their own webhook tokens/signatures.
		event.request.headers.set('origin', event.url.origin);
	}

	// Only protect /tools routes
	if (event.url.pathname.startsWith('/tools')) {
		const isBypass = MANAGER_PASSWORD_BYPASS === '1';

		// Skip protection for the login page itself to avoid infinite loops
		if (event.url.pathname === '/tools/login') {
			return resolve(event);
		}

		let authCookie = event.cookies.get('casa_luma_tools_auth');

		if (isBypass && !authCookie) {
			authCookie = 'manager';
		}

		// If no cookie, redirect to login
		if (!authCookie) {
			throw redirect(303, '/tools/login');
		}

		// Role-based protection
		const isManager = authCookie === 'manager';
		event.locals.role = authCookie;

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
