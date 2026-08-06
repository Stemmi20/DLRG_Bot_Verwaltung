import webpush from 'web-push';
import { ObjectId } from 'mongodb';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '$env/static/private';
import { col, type EinsatzDoc, type UserDoc } from './database';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface AlarmNachricht {
	einsatzId: string;
	typ: EinsatzDoc['typ'];
	stichwort: string;
	meldebild: string;
	ort: string;
	alarmzeit: string;
}

export interface Zustellergebnis {
	userId: string;
	endpoint: string;
	ok: boolean;
	fehler?: string;
}

/**
 * Alle Alarmwege implementieren dieses Interface. Aktuell nur Web Push.
 * Wenn später ein Capacitor-Wrapper mit FCM dazukommt, wird hier ein
 * zweiter Kanal registriert – `alarmAusloesen` muss sich nicht ändern.
 */
export interface Alarmkanal {
	name: string;
	sende(empfaenger: UserDoc[], nachricht: AlarmNachricht): Promise<Zustellergebnis[]>;
}

export const webPushKanal: Alarmkanal = {
	name: 'webpush',

	async sende(empfaenger, nachricht) {
		const nutzlast = JSON.stringify(nachricht);
		const aufgaben: Promise<Zustellergebnis>[] = [];

		for (const user of empfaenger) {
			for (const abo of user.pushSubscriptions ?? []) {
				aufgaben.push(
					webpush
						.sendNotification(
							{ endpoint: abo.endpoint, keys: abo.keys },
							nutzlast,
							// TTL kurz halten: ein Alarm von vor 10 Minuten hilft niemandem mehr.
							{ TTL: 600, urgency: 'high' }
						)
						.then(() => ({ userId: user._id.toHexString(), endpoint: abo.endpoint, ok: true }))
						.catch(async (fehler: { statusCode?: number; message?: string }) => {
							// 404/410 = Abo ist tot (App deinstalliert, Browserdaten gelöscht)
							if (fehler.statusCode === 404 || fehler.statusCode === 410) {
								await entferneAbo(user._id, abo.endpoint);
							}
							return {
								userId: user._id.toHexString(),
								endpoint: abo.endpoint,
								ok: false,
								fehler: fehler.message ?? `HTTP ${fehler.statusCode}`
							};
						})
				);
			}
		}

		return Promise.all(aufgaben);
	}
};

async function entferneAbo(userId: ObjectId, endpoint: string): Promise<void> {
	const users = await col.users();
	await users.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint } } });
}

/** Zustellungen protokollieren – das Board zeigt daraus "zugestellt / keine Antwort". */
export async function protokolliere(
	einsatzId: ObjectId,
	ergebnisse: Zustellergebnis[]
): Promise<void> {
	if (ergebnisse.length === 0) return;
	const zu = await col.zustellungen();
	await zu.insertMany(
		ergebnisse.map((e) => ({
			_id: new ObjectId(),
			einsatzId,
			userId: new ObjectId(e.userId),
			endpoint: e.endpoint,
			status: e.ok ? ('gesendet' as const) : ('fehler' as const),
			fehler: e.fehler ?? null,
			am: new Date(),
			gelesenAm: null
		})),
		{ ordered: false }
	);
}

export const oeffentlicherVapidKey = VAPID_PUBLIC_KEY;