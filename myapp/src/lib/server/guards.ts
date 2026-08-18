// src/lib/server/guards.ts
import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { collection } from './usedata';
import type { UserDoc } from './database';


function normalisiere(doc: Record<string, any>): UserDoc {
	const rollen: string[] = [];

	if (doc.ortsgruppe_admin === true) rollen.push('admin');
	if (doc.funktionen?.evd === true || doc.funktionen?.zf === true) {
		rollen.push('einsatzleiter');
	}
	rollen.push('aktiv');

	const qualifikationen = Object.entries(doc.funktionen ?? {})
		.filter(([, gesetzt]) => gesetzt === true)
		.map(([kuerzel]) => kuerzel);

	return {
		_id: doc._id,
		name: doc.nachname ?? '',
		vorname: doc.vorname ?? '',
		email: doc.email ?? '',
		rollen,
		// Der Bot speichert die Ortsgruppe als Text, der LVS-Teil erwartet
		// Zugehoerigkeiten mit ObjectId. Bis zur Migration bleibt das leer.
		ortsgruppen: doc.ortsgruppen ?? [],
		qualifikationen,
		pushSubscriptions: doc.pushSubscriptions ?? [],
		alarmierung: doc.alarmierung ?? { aktiv: false, abwesendBis: null }
	};
}

export async function ladeUser(locals: App.Locals): Promise<UserDoc> {
	if (!locals.userId) throw error(401, 'Nicht angemeldet');

	const doc = await collection.findOne({ _id: new ObjectId(locals.userId) });
	if (!doc) throw error(401, 'Konto nicht gefunden');

	return normalisiere(doc);
}

export async function ladeAdmin(locals: App.Locals): Promise<UserDoc> {
	const user = await ladeUser(locals);

	if (!user.rollen.includes('admin')) {
		throw error(403, 'Dafür brauchst du Administratorrechte');
	}
	return user;
}

export function darfBoardSehen(user: UserDoc): boolean {
	return user.rollen.some((r) => r === 'admin' || r === 'einsatzleiter');
}