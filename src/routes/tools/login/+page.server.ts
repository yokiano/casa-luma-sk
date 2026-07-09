import { AUTH_PASSWORD, MANAGER_PASSWORD } from '$env/static/private';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

const getSafeContinueTo = (continueTo: string | null) => {
	if (!continueTo || !continueTo.startsWith('/tools') || continueTo.startsWith('//')) {
		return '/tools';
	}

	if (continueTo === '/tools/login' || continueTo.startsWith('/tools/login?')) {
		return '/tools';
	}

	return continueTo;
};

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
			cookies.set('casa_luma_tools_auth', role, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: true,
				maxAge: 60 * 60 * 24 * 7 // 1 week
			});

			throw redirect(303, getSafeContinueTo(url.searchParams.get('continueTo')));
		}

		return fail(400, { incorrect: true });
	}
};

