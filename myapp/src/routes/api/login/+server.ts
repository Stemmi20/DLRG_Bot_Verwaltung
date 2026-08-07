// src/routes/api/login/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { collection } from '$lib/server/usedata';
import {
	sitzungAnlegen,
	istGesperrt,
	fehlversuchMerken,
	versucheZuruecksetzen
} from '$lib/server/auth';

const SITZUNGSDAUER_S = 60 * 60 * 8;

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	const ip = getClientAddress();

	if (istGesperrt(ip)) {
		return json(
			{ message: 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.' },
			{ status: 429 }
		);
	}

	const body = await request.json().catch(() => ({}));
	const token = typeof body.token === 'string' ? body.token.trim() : '';

	if (!token) {
		return json({ message: 'Bitte den Token eingeben.' }, { status: 400 });
	}

	// Schema: die Felder liegen auf oberster Ebene, nicht unter "user"
	const benutzer = await collection.findOne({ token });

	// Eine einzige Fehlermeldung fuer alle Faelle - sonst laesst sich
	// ueber die Antwort herausfinden, welche Tokens existieren.
	const abgelehnt = json({ message: 'Ungültiger Token.' }, { status: 401 });

	if (!benutzer) {
		fehlversuchMerken(ip);
		return abgelehnt;
	}

	if (benutzer.user?.zugriff === false || benutzer.status !== 'AKTIV') {
		fehlversuchMerken(ip);
		return abgelehnt;
	}

	versucheZuruecksetzen(ip);

	const sitzungsId = await sitzungAnlegen(benutzer._id);

	cookies.set('session', sitzungsId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SITZUNGSDAUER_S
	});

	// Altlasten aus der frueheren Cookie-Anmeldung entfernen
	cookies.delete('token', { path: '/' });
	cookies.delete('userid', { path: '/' });

	return json({
		success: true,
		user: {
			vorname: benutzer.vorname,
			nachname: benutzer.nachname,
			ortsgruppe: benutzer.ortsgruppe,
			ortsgruppe_admin: benutzer.ortsgruppe_admin === true
		}
	});
};