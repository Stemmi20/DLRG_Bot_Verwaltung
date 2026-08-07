// src/routes/api/logout/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sitzungBeenden } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	const sitzungsId = cookies.get('session');

	// Wichtig: die Sitzung serverseitig loeschen, nicht nur das Cookie.
	// Sonst bleibt eine kopierte Cookie-Zeichenkette weiter gueltig.
	if (sitzungsId) {
		await sitzungBeenden(sitzungsId);
	}

	cookies.delete('session', { path: '/' });
	cookies.delete('token', { path: '/' });
	cookies.delete('userid', { path: '/' });

	return json({ success: true });
};