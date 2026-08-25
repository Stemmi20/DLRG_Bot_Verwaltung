import { col } from '$lib/server/database';
import { ObjectId } from 'mongodb';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
	if (event.url.pathname.startsWith('/login')) return { user: null };
	if (event.url.pathname.startsWith('/register')) return { user: null };

	const token = event.cookies.get('token');
	if (!token) throw redirect(307, '/login');

	const userid = event.cookies.get('userid');
	if (!userid || !ObjectId.isValid(userid)) throw redirect(307, '/login');

	const users = await col.users();
	const user = await users.findOne({ _id: new ObjectId(userid) });

	// Registrierung unvollständig – Name fehlt noch.
	if (!user?.vorname || !user?.name) throw redirect(307, '/register');

	return {
		user: {
			vorname: user.vorname,
			nachname: user.name,
			istAdmin: user.rollen?.includes('admin') ?? false
		}
	};
};