/**
 * Gemeinsame Typen für die LVS-Ablöse.
 * Wird von Server und Client benutzt – hier stehen bewusst keine Mongo-Typen drin,
 * IDs sind immer Strings (serialisierbar).
 */

export type Antwort = 'kommt' | 'kommt_nicht' | 'spaeter';

export const ETA_OPTIONEN = [5, 10, 15, 20, 30, 45] as const;
export type EtaMinuten = (typeof ETA_OPTIONEN)[number];

export type EinsatzTyp = 'einsatz' | 'probealarm' | 'eigentest';
export type EinsatzStatus = 'laufend' | 'beendet';

/** FMS-Status, wie sie im BOS-Funk gesprochen werden. */
export const FMS_STATUS = {
	1: 'Einsatzbereit über Funk',
	2: 'Einsatzbereit auf Wache',
	3: 'Anfahrt Einsatzort',
	4: 'Am Einsatzort',
	5: 'Sprechwunsch',
	6: 'Nicht einsatzbereit'
} as const;
export type FmsStatus = keyof typeof FMS_STATUS;

export interface Standort {
	id: string;
	name: string;
	adresse: string;
	lat: number;
	lng: number;
}

export interface OrtsgruppeKurz {
	id: string;
	name: string;
	kuerzel: string;
	standorte: Standort[];
}

/** Zugehörigkeit einer Person zu einer Ortsgruppe. Mehrere sind ausdrücklich erlaubt. */
export interface Zugehoerigkeit {
	ortsgruppeId: string;
	primaer: boolean;
	standardStandortId: string | null;
}

export interface Einsatzort {
	strasse: string;
	plz: string;
	ort: string;
	hinweis: string;
	lat: number | null;
	lng: number | null;
}

export interface EinsatzDto {
	id: string;
	typ: EinsatzTyp;
	stichwort: string;
	meldebild: string;
	einsatzort: Einsatzort;
	alarmzeit: string; // ISO
	status: EinsatzStatus;
	beendetAm: string | null;
	ortsgruppen: OrtsgruppeKurz[];
	anzahlAlarmiert: number;
}

export interface RueckmeldungDto {
	userId: string;
	name: string;
	qualifikationen: string[];
	antwort: Antwort;
	etaMinuten: EtaMinuten | null;
	/** ISO – Basis für den Countdown auf dem Board. */
	ankunftPrognose: string | null;
	angekommenAm: string | null;
	standortId: string | null;
	standortName: string | null;
	eingegangenAm: string;
}

export interface FahrzeugDto {
	id: string;
	funkrufname: string;
	typ: string;
	status: FmsStatus;
	statusSeit: string;
	sollBesatzung: string[];
	/** Qualifikationen aus der Sollbesatzung, die noch von niemandem gedeckt sind. */
	fehlend: string[];
}

/** Alles, was das Übersichtsboard braucht – ein Objekt, ein Render. */
export interface BoardDto {
	einsatz: EinsatzDto;
	rueckmeldungen: RueckmeldungDto[];
	fahrzeuge: FahrzeugDto[];
	offen: { userId: string; name: string }[];
	zaehler: { kommt: number; kommtNicht: number; spaeter: number; offen: number };
}

/** Was über SSE an Board und Alarmseite geht. */
export type EinsatzEvent =
	| { art: 'init'; board: BoardDto }
	| { art: 'rueckmeldung'; rueckmeldung: RueckmeldungDto }
	| { art: 'fahrzeug'; fahrzeug: FahrzeugDto }
	| { art: 'beendet'; beendetAm: string }
	| { art: 'ping' };

export function etaZuPrognose(alarmzeit: Date, eta: EtaMinuten): Date {
	return new Date(alarmzeit.getTime() + eta * 60_000);
}