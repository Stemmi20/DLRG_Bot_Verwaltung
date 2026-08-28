import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { col, type UserDoc } from './database';

/**
 * `locals.user` und `locals.userId` werden in `hooks.server.ts` aus der
 * geprüften Sitzung gesetzt. Diese Datei ist die einzige Stelle, an der der
 * LVS-Teil dein Login berührt.
 */
export async function ladeUser(locals: App.Locals): Promise<UserDoc> {
	if (!locals.userId) throw error(401, 'Nicht angemeldet');

	const users = await col.users();
	const user = await users.findOne({ _id: new ObjectId(locals.userId) });
	if (!user) throw error(401, 'Konto nicht gefunden');
	return user;
}

/** Admin ist bei dir, wer `ortsgruppe_admin: true` gesetzt hat. */
export function istAdmin(user: UserDoc): boolean {
	return user.ortsgruppe_admin === true;
}

export async function ladeAdmin(locals: App.Locals): Promise<UserDoc> {
	const user = await ladeUser(locals);
	if (!istAdmin(user)) throw error(403, 'Dafür brauchst du Administratorrechte');
	return user;
}

export function darfBoardSehen(user: UserDoc): boolean {
	return istAdmin(user);
}

/** Anzeigename – beide Felder können in Altdatensätzen fehlen. */
export function anzeigename(user: UserDoc): string {
	return `${user.vorname ?? ''} ${user.nachname ?? ''}`.trim() || 'Unbekannt';
}