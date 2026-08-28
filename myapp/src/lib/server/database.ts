import { MongoClient, type Db, type ObjectId } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';
import { collection as benutzerCollection } from './usedata';

/*
 * Deine bestehende Datenbankanbindung, ergänzt um den LVS-Teil.
 * Oben unverändert dein Original, ab "Dokumente" kommt das Neue dazu.
 */

const client = new MongoClient(MONGODB_URI);

export function start_mongo() {
	console.log('Connecting to MongoDB...');
	return client.connect();
}

/** Datenbank aus der Verbindungszeichenfolge. */
export const datenbank: Db = client.db();

/** Benannter Export – für `import { db } from '$lib/server/database'`. */
export const db = datenbank;

/** Default-Export – für `import DataBase from '$lib/server/database'`. */
export default datenbank;

// ---------------------------------------------------------------- Dokumente

export interface PushSubscriptionDoc {
	endpoint: string;
	keys: { p256dh: string; auth: string };
	geraet: string;
	erstelltAm: Date;
	zuletztOk: Date | null;
}

/**
 * Dein bestehendes Benutzerschema (Datenbank `User`, Collection `User`),
 * ergänzt um die Felder, die der LVS-Teil braucht. Die neuen Felder sind
 * optional, weil sie in den vorhandenen Datensätzen noch fehlen.
 */
export interface UserDoc {
	_id: ObjectId;
	token?: string;
	status?: string; // 'AKTIV'
	vorname?: string;
	nachname?: string;
	ortsgruppe?: string;
	ortsgruppe_admin?: boolean;
	user?: { zugriff?: boolean; [k: string]: unknown };

	// ─── ab hier LVS ───
	qualifikationen?: string[];
	pushSubscriptions?: PushSubscriptionDoc[];
}

export interface OrtsgruppeDoc {
	_id: ObjectId;
	name: string;
	kuerzel: string;
	standorte: { _id: ObjectId; name: string; adresse: string; lat: number; lng: number }[];
}

export interface EinsatzDoc {
	_id: ObjectId;
	stichwort: string;
	meldebild: string;
	ausgeloestVon: ObjectId;
	ortsgruppen: ObjectId[];
	empfaenger: ObjectId[];
	beendetAm: Date | null;
	externalId: string | null;
}

export interface RueckmeldungDoc {
	_id: ObjectId;
	einsatzId: ObjectId;
	userId: ObjectId;
	ankunftPrognose: Date | null;
	angekommenAm: Date | null;
	ortsgruppeId: ObjectId | null;
	standortId: ObjectId | null;
	eingegangenAm: Date;
}

export interface FahrzeugDoc {
	_id: ObjectId;
	ortsgruppeId: ObjectId;
	funkrufname: string;
	typ: string;
	kennzeichen: string;
	sollBesatzung: string[];
	statusSeit: Date;
	aktuellerEinsatz: ObjectId | null;
}

export interface ZustellungDoc {
	_id: ObjectId;
	einsatzId: ObjectId;
	userId: ObjectId;
	endpoint: string;
	status: 'gesendet' | 'fehler' | 'abgelaufen';
	fehler: string | null;
	am: Date;
	gelesenAm: Date | null;
}

// ---------------------------------------------------------------- Zugriff

/**
 * Die Personen liegen in der Datenbank `User`, Collection `User` – das ist die
 * Collection aus `usedata.ts`, die auch der Bot und dein Login benutzen.
 * Alles Weitere (Einsätze, Rückmeldungen, …) liegt in der Datenbank aus
 * MONGO_URL, zusammen mit den Sitzungen.
 */
export const col = {
	users: async () => benutzerCollection as unknown as import('mongodb').Collection<UserDoc>,
	ortsgruppen: async () => datenbank.collection<OrtsgruppeDoc>('ortsgruppen'),
	einsaetze: async () => datenbank.collection<EinsatzDoc>('einsaetze'),
	rueckmeldungen: async () => datenbank.collection<RueckmeldungDoc>('rueckmeldungen'),
	fahrzeuge: async () => datenbank.collection<FahrzeugDoc>('fahrzeuge'),
	zustellungen: async () => datenbank.collection<ZustellungDoc>('zustellungen')
};


export async function schliesse(): Promise<void> {
	await client.close();
}