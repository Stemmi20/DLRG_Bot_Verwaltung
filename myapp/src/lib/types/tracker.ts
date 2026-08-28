/** Typen für die Live-Fahrzeugkarte. */

/** Was der ESP32 auf dem MQTT-Topic veröffentlicht. */
export interface TrackerNutzlast {
	name?: string;
	lat?: number;
	lon?: number;
	lng?: number;
	/** Optional, falls der Tracker sie mitliefert. */
	speed?: number;
	course?: number;
	sats?: number;
	batt?: number;
}

export interface Position {
	lat: number;
	lng: number;
	/** Empfangszeit auf dem Server, ISO. */
	am: string;
	speed: number | null;
	course: number | null;
}

export interface Fahrzeug {
	/** Aus dem Topic: tracker/<id>/position */
	id: string;
	name: string;
	/** Neueste zuerst, maximal drei. */
	spur: Position[];
	sats: number | null;
	batt: number | null;
}

export type TrackerEvent =
	| { art: 'init'; fahrzeuge: Fahrzeug[] }
	| { art: 'position'; fahrzeug: Fahrzeug }
	| { art: 'ping' };

/** Wie viele Punkte der Spur behalten werden. */
export const SPURLAENGE = 3;

/** Deckkraft je Spurpunkt: aktuell, vorletzter, drittletzter. */
export const SPUR_DECKKRAFT = [1, 0.5, 0.3] as const;

/** Ab wann eine Position als veraltet gilt (Minuten). */
export const VERALTET_NACH_MIN = 5;