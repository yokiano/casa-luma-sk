import { redirect, type Handle } from '@sveltejs/kit';
import { MANAGER_PASSWORD_BYPASS } from '$env/static/private';

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize role
	event.locals.role = undefined;

	// Bypass CSRF checks for external webhook endpoints.
	if (
		event.url.pathname.startsWith('/api/customer') ||
		event.url.pathname.startsWith('/api/webhooks/receipt') ||
		event.url.pathname.startsWith('/api/webhooks/email')
	) {
		// SvelteKit's CSRF protection expects the Origin header to match the request URL.
		// Webhooks from external services (like Loyverse) often don't include an Origin header
		// or have a different one. The endpoints validate their own webhook tokens/signatures.
		event.request.headers.set('origin', event.url.origin);
	}

	// Protect staff/internal surfaces with the shared tools auth cookie.
	if (event.url.pathname.startsWith('/tools') || event.url.pathname.startsWith('/mgmt-dashboard')) {
		const isBypass = MANAGER_PASSWORD_BYPASS === '1';

		// Skip protection for the login page itself to avoid infinite loops
		if (event.url.pathname === '/tools/login') {
			return resolve(event);
		}

		let authCookie = event.cookies.get('casa_luma_tools_auth');

		if (isBypass && !authCookie) {
			authCookie = 'manager';
		}

		// If no cookie, redirect to login and preserve the requested tools URL.
		if (!authCookie) {
			const continueTo = `${event.url.pathname}${event.url.search}`;
			throw redirect(303, `/tools/login?continueTo=${encodeURIComponent(continueTo)}`);
		}

		// Role-based protection
		const isManager = authCookie === 'manager';
		event.locals.role = authCookie;

		// List of routes that require manager access
		const managerOnlyRoutes = [
			'/tools/salary-payment',
			'/mgmt-dashboard'
		];

		if (managerOnlyRoutes.some(route => event.url.pathname.startsWith(route)) && !isManager) {
			throw redirect(303, '/tools');
		}
	}

	const response = await resolve(event);

	return response;
};
