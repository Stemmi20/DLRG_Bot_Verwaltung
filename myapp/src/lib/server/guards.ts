import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { dev } from '$app/environment';
import { col, type UserDoc } from './database';

/**
 * ─── Login zum Ausprobieren überspringen ─────────────────────────────────────
 *
 * Auf true setzen, dann bist du ohne Anmeldung als die unten gewählte Person
 * unterwegs. Greift ausschließlich im Dev-Server: `dev` ist in jedem Build
 * über `npm run build` false, der Schalter ist dort also wirkungslos.
 *
 * Wichtig: den gleichen Schalter braucht auch `src/hooks.server.ts`, sonst
 * leitet der Login-Check dort schon um, bevor diese Datei überhaupt dran ist.
 */
const LOGIN_UEBERSPRINGEN = true;

/** E-Mail der Person, als die du ohne Login unterwegs bist. */
const DEMO_EMAIL = 'anna@beispiel.test';

/**
 * Nutzer aus der Zeit vor dem LVS-Teil haben `ortsgruppen`, `rollen`,
 * `qualifikationen`, `pushSubscriptions` und `alarmierung` nicht. Hier werden
 * die Felder aufgefüllt, damit der Rest des Codes sich darauf verlassen kann.
 *
 * Das ersetzt keine Migration – es verhindert nur Abstürze, solange die
 * Datensätze noch unvollständig sind. Die Migration steht in der README.
 */
function normalisiere(user: UserDoc): UserDoc {
	return {
		...user,
		vorname: user.vorname ?? '',
		name: user.name ?? '',
		rollen: user.rollen ?? [],
		ortsgruppen: user.ortsgruppen ?? [],
		qualifikationen: user.qualifikationen ?? [],
		pushSubscriptions: user.pushSubscriptions ?? [],
		alarmierung: user.alarmierung ?? { aktiv: false, abwesendBis: null }
	};
}

async function demoUser(): Promise<UserDoc> {
	const users = await col.users();

	// Erst die gewünschte Person, sonst irgendeinen Datensatz – damit der
	// Schalter auch ohne Seed-Daten funktioniert.
	const user = (await users.findOne({ email: DEMO_EMAIL })) ?? (await users.findOne({}));

	if (!user) {
		throw error(
			500,
			'Login übersprungen, aber in der Datenbank steht keine Person. Führe zuerst `npx tsx scripts/seed-lvs.ts` aus.'
		);
	}
	return normalisiere(user);
}

/**
 * Holt die angemeldete Person. `locals.userId` wird von deinem bestehenden
 * Auth in `hooks.server.ts` gesetzt – das ist die einzige Stelle, an der der
 * LVS-Teil dein Login berührt.
 */
export async function ladeUser(locals: App.Locals): Promise<UserDoc> {
	if (dev && LOGIN_UEBERSPRINGEN) return demoUser();

	if (!locals.userId) throw error(401, 'Nicht angemeldet');

	const users = await col.users();
	const user = await users.findOne({ _id: new ObjectId(locals.userId) });
	if (!user) throw error(401, 'Konto nicht gefunden');
	return normalisiere(user);
}

export async function ladeAdmin(locals: App.Locals): Promise<UserDoc> {
	const user = await ladeUser(locals);

	// Ohne Login gibt es keine sinnvolle Rollenprüfung – sonst siehst du die
	// Adminseiten nicht, obwohl du sie gerade ansehen willst.
	if (dev && LOGIN_UEBERSPRINGEN) return user;

	if (!user.rollen.includes('admin')) {
		throw error(403, 'Dafür brauchst du Administratorrechte');
	}
	return user;
}

export function darfBoardSehen(user: UserDoc): boolean {
	if (dev && LOGIN_UEBERSPRINGEN) return true;
	return user.rollen.some((r) => r === 'admin' || r === 'einsatzleiter');
}