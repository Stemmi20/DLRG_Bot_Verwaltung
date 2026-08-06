import { json, error } from '@sveltejs/kit';
import { collection } from '$lib/server/usedata';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (req) => {
	const j = await req.request.json().catch(() => ({}));

	let token = j.token;

	if (token) {
		token = token.trim();
	}

	console.log('=== LOGIN ATTEMPT ===');
	console.log('Eingabe Token:', token);
	console.log('Token Länge:', token?.length);

	if (!token) {
		return error(400, { message: 'Kein Token angegeben' });
	}

	const user = await collection.findOne({ 'user.token': token } as any);

	if (user) {
		console.log('✅ USER GEFUNDEN:');
		console.log('  → Name:', user.user.vorname, user.user.nachname);
		console.log('  → User _id:', user.user._id);
		console.log('  → Token in DB:', user.user.token);
		console.log('  → Ortsgruppe:', user.user.ortsgruppe);
	} else {
		console.log('❌ USER NICHT GEFUNDEN');

		const allUsers = await collection
			.find({ 'user.token': { $exists: true } })
			.limit(5)
			.toArray();
		console.log('\nErste 5 User in DB:');
		allUsers.forEach((u) => {
			console.log(`  - ${u.user.vorname} ${u.user.nachname}`);
			console.log(`    Token: "${u.user.token}"`);
			console.log(`    Token Länge: ${u.user.token?.length}`);
		});

		return error(400, { message: 'Ungültiger Token' });
	}

	req.cookies.set('token', token, {
		path: '/',
		sameSite: true,
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 15,
	});

	req.cookies.set('userid', user.user._id, {
		path: '/',
		sameSite: true,
		httpOnly: false,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 15,
	});

	console.log('✅ Login erfolgreich! Cookies gesetzt.');
	console.log('==================\n');

	return json({
		success: true,
		user: {
			_id: user.user._id,
			vorname: user.user.vorname,
			nachname: user.user.nachname,
			ortsgruppe: user.user.ortsgruppe,
			ortsgruppe_admin: user.user.ortsgruppe_admin,
		},
	});
};
