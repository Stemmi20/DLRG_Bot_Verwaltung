import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { collection } from '$lib/server/usedata';
import { indizesAnlegen } from '$lib/server/database';
import { dev } from '$app/environment';
import { col } from '$lib/server/database';

const LOGIN_UEBERSPRINGEN = true;
const DEMO_EMAIL = 'anna@beispiel.test';

await indizesAnlegen();

export const handle: Handle = async ({ event, resolve }) => {
	if (dev && LOGIN_UEBERSPRINGEN) {
		const users = await col.users();
		const user = (await users.findOne({ email: DEMO_EMAIL })) ?? (await users.findOne({}));
		if (dev && LOGIN_UEBERSPRINGEN) {
			const users = await col.users();
			const user = (await users.findOne({ email: DEMO_EMAIL })) ?? (await users.findOne({}));
			if (user) event.locals.userId = user._id.toHexString();
			return resolve(event);
		}
		return resolve(event);
	}

	const token = event.cookies.get('token');
	const pathname = event.url.pathname;

	const publicRoutes = ['/login', '/api/login', '/api/logout'];
	const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

	if (isPublicRoute) {
		return resolve(event);
	}

	if (!token) {
		throw redirect(303, '/login');
	}

	try {
		const user = await collection.findOne({ 'user.token': token } as any);

		if (!user) {
			event.cookies.delete('token', { path: '/' });
			event.cookies.delete('userid', { path: '/' });
			throw redirect(303, '/login');
		}

		event.locals.userId = user.user._id;
		event.locals.telegramID = user.user.telegramID;
	} catch (err) {
		event.cookies.delete('token', { path: '/' });
		event.cookies.delete('userid', { path: '/' });
		throw redirect(303, '/login');
	}

	return resolve(event);
};
