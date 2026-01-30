import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete('casa_luma_tools_auth', { path: '/' });
	throw redirect(303, '/tools/login');
};

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('casa_luma_tools_auth', { path: '/' });
	throw redirect(303, '/tools/login');
};
