import { AUTH_PASSWORD, MANAGER_PASSWORD } from '$env/static/private';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createConfiguredToolsSessionCookie, SESSION_MAX_AGE_SECONDS } from '$lib/server/tools-session';
import { getSafeContinueTo } from '$lib/server/safe-login-continue';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const password = data.get('password');

		let role = '';
		if (password === MANAGER_PASSWORD) {
			role = 'manager';
		} else if (password === AUTH_PASSWORD) {
			role = 'staff';
		}

		if (role) {
			cookies.set('casa_luma_tools_auth', createConfiguredToolsSessionCookie(role as 'manager' | 'staff'), {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: true,
				maxAge: SESSION_MAX_AGE_SECONDS
			});

			throw redirect(303, getSafeContinueTo(url.searchParams.get('continueTo')));
		}

		return fail(400, { incorrect: true });
	}
};

