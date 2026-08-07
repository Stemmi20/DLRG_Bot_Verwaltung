// src/lib/server/auth.ts
import { randomBytes, createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { db } from './database';
import { collection } from './usedata';

const sitzungen = db.collection('sitzungen');

const SITZUNGSDAUER_MS = 1000 * 60 * 60 * 8; // 8 Stunden
const VERLAENGERN_AB_MS = 1000 * 60 * 60; // Restlaufzeit, ab der verlaengert wird

const MAX_VERSUCHE = 5;
const SPERRE_MS = 1000 * 60 * 15;

let indexAngelegt = false;

/** TTL-Index: MongoDB raeumt abgelaufene Sitzungen selbst auf. */
async function indexSicherstellen() {
	if (indexAngelegt) return;
	await sitzungen.createIndex({ laeuftAbAm: 1 }, { expireAfterSeconds: 0 });
	indexAngelegt = true;
}

/**
 * Im Cookie steht der Klartext, in der Datenbank nur der Hash.
 * Wer Lesezugriff auf die Collection bekommt, kann damit keine Sitzung uebernehmen.
 */
function hashen(sitzungsId: string): string {
	return createHash('sha256').update(sitzungsId).digest('hex');
}

export async function sitzungAnlegen(userId: ObjectId): Promise<string> {
	await indexSicherstellen();

	const sitzungsId = randomBytes(32).toString('base64url');

	await sitzungen.insertOne({
		_id: hashen(sitzungsId) as never,
		userId,
		erstelltAm: new Date(),
		laeuftAbAm: new Date(Date.now() + SITZUNGSDAUER_MS)
	});

	return sitzungsId;
}

export async function sitzungPruefen(sitzungsId: string) {
	await indexSicherstellen();

	const hash = hashen(sitzungsId);
	const sitzung = await sitzungen.findOne({ _id: hash as never });

	if (!sitzung) return null;

	if (sitzung.laeuftAbAm.getTime() < Date.now()) {
		await sitzungen.deleteOne({ _id: hash as never });
		return null;
	}

	const benutzer = await collection.findOne({ _id: sitzung.userId });

	// Zugriff kann ueber den Bot entzogen worden sein, ohne dass die Sitzung endet
	if (!benutzer || benutzer.user?.zugriff === false || benutzer.status !== 'AKTIV') {
		await sitzungen.deleteOne({ _id: hash as never });
		return null;
	}

	// Gleitende Verlaengerung, damit aktive Nutzer nicht mitten im Formular rausfliegen
	const restlaufzeit = sitzung.laeuftAbAm.getTime() - Date.now();
	if (restlaufzeit < VERLAENGERN_AB_MS) {
		await sitzungen.updateOne(
			{ _id: hash as never },
			{ $set: { laeuftAbAm: new Date(Date.now() + SITZUNGSDAUER_MS) } }
		);
	}

	return { benutzer, laeuftAbAm: sitzung.laeuftAbAm };
}

export async function sitzungBeenden(sitzungsId: string): Promise<void> {
	await sitzungen.deleteOne({ _id: hashen(sitzungsId) as never });
}

/** Meldet ein Geraet ueberall ab, z.B. wenn der Bot den Token neu vergibt. */
export async function alleSitzungenBeenden(userId: ObjectId): Promise<void> {
	await sitzungen.deleteMany({ userId });
}

// --- Rate Limiting -------------------------------------------------------
// Bewusst im Arbeitsspeicher: reicht fuer eine einzelne Node-Instanz.
// Bei mehreren Instanzen oder Neustarts gehen die Zaehler verloren -
// dann gehoert das in die Datenbank oder einen Redis.

const versuche = new Map<string, { anzahl: number; letzter: number }>();

export function istGesperrt(schluessel: string): boolean {
	const eintrag = versuche.get(schluessel);
	if (!eintrag) return false;

	if (Date.now() - eintrag.letzter > SPERRE_MS) {
		versuche.delete(schluessel);
		return false;
	}

	return eintrag.anzahl >= MAX_VERSUCHE;
}

export function fehlversuchMerken(schluessel: string): void {
	const eintrag = versuche.get(schluessel);
	const anzahl = eintrag && Date.now() - eintrag.letzter <= SPERRE_MS ? eintrag.anzahl + 1 : 1;
	versuche.set(schluessel, { anzahl, letzter: Date.now() });
}

export function versucheZuruecksetzen(schluessel: string): void {
	versuche.delete(schluessel);
}