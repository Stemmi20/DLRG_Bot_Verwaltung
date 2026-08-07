import { MongoClient, type Db, type ObjectId } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';
import type {
	Antwort,
	EinsatzStatus,
	EinsatzTyp,
	Einsatzort,
	EtaMinuten,
	FmsStatus,
	Zugehoerigkeit
} from '$lib/types/lvs';


const client = new MongoClient(MONGODB_URI);

export function start_mongo() {
	console.log('Connecting to MongoDB...');
	return client.connect();
}

export const datenbank: Db = client.db();

export const db = datenbank;

export default datenbank;

export interface PushSubscriptionDoc {
	endpoint: string;
	keys: { p256dh: string; auth: string };
	geraet: string;
	erstelltAm: Date;
	zuletztOk: Date | null;
}

export interface UserDoc {
	_id: ObjectId;
	name: string;
	vorname: string;
	email: string;
	rollen: string[]; // 'admin' | 'einsatzleiter' | 'aktiv'
	ortsgruppen: Zugehoerigkeit[];
	qualifikationen: string[];
	pushSubscriptions: PushSubscriptionDoc[];
	alarmierung: {
		aktiv: boolean;
		abwesendBis: Date | null;
	};
}

export interface OrtsgruppeDoc {
	_id: ObjectId;
	name: string;
	kuerzel: string;
	standorte: { _id: ObjectId; name: string; adresse: string; lat: number; lng: number }[];
}

export interface EinsatzDoc {
	_id: ObjectId;
	typ: EinsatzTyp;
	stichwort: string;
	meldebild: string;
	einsatzort: Einsatzort;
	alarmzeit: Date;
	ausgeloestVon: ObjectId;
	ortsgruppen: ObjectId[];
	empfaenger: ObjectId[];
	fahrzeuge: { fahrzeugId: ObjectId; status: FmsStatus; statusSeit: Date }[];
	status: EinsatzStatus;
	beendetAm: Date | null;
	externalId: string | null;
}

export interface RueckmeldungDoc {
	_id: ObjectId;
	einsatzId: ObjectId;
	userId: ObjectId;
	antwort: Antwort;
	etaMinuten: EtaMinuten | null;
	ankunftPrognose: Date | null;
	angekommenAm: Date | null;
	ortsgruppeId: ObjectId | null;
	standortId: ObjectId | null;
	eingegangenAm: Date;
	verlauf: { antwort: Antwort; etaMinuten: EtaMinuten | null; am: Date }[];
}

export interface FahrzeugDoc {
	_id: ObjectId;
	ortsgruppeId: ObjectId;
	funkrufname: string;
	typ: string;
	kennzeichen: string;
	sollBesatzung: string[];
	status: FmsStatus;
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
 * Die Zugriffe sind async, obwohl sie nichts abwarten – so bleiben die
 * Aufrufstellen (`await col.users()`) gleich, falls hier später doch eine
 * Verbindung aufgebaut werden muss.
 */
export const col = {
	users: async () => datenbank.collection<UserDoc>('users'),
	ortsgruppen: async () => datenbank.collection<OrtsgruppeDoc>('ortsgruppen'),
	einsaetze: async () => datenbank.collection<EinsatzDoc>('einsaetze'),
	rueckmeldungen: async () => datenbank.collection<RueckmeldungDoc>('rueckmeldungen'),
	fahrzeuge: async () => datenbank.collection<FahrzeugDoc>('fahrzeuge'),
	zustellungen: async () => datenbank.collection<ZustellungDoc>('zustellungen')
};

/**
 * Einmal beim Start aufrufen, nach `start_mongo()`.
 * Der Unique-Index auf (einsatzId, userId) ist das, was Doppel-Rückmeldungen
 * verhindert – ohne Replica Set haben wir keine Transaktionen.
 */
export async function indizesAnlegen(): Promise<void> {
	const [rm, ei, zu, us, fz] = await Promise.all([
		col.rueckmeldungen(),
		col.einsaetze(),
		col.zustellungen(),
		col.users(),
		col.fahrzeuge()
	]);

	await Promise.all([
		rm.createIndex({ einsatzId: 1, userId: 1 }, { unique: true }),
		rm.createIndex({ einsatzId: 1, ankunftPrognose: 1 }),
		ei.createIndex({ status: 1, alarmzeit: -1 }),
		ei.createIndex({ ortsgruppen: 1, alarmzeit: -1 }),
		ei.createIndex({ externalId: 1 }, { unique: true, sparse: true }),
		zu.createIndex({ einsatzId: 1, userId: 1 }),
		us.createIndex({ 'pushSubscriptions.endpoint': 1 }),
		us.createIndex({ 'ortsgruppen.ortsgruppeId': 1 }),
		fz.createIndex({ ortsgruppeId: 1 })
	]);
}

export async function schliesse(): Promise<void> {
	await client.close();
}