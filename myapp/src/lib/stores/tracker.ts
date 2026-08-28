import { readable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Fahrzeug, TrackerEvent } from '$lib/types/tracker';

export interface Trackerzustand {
	fahrzeuge: Fahrzeug[];
	verbunden: boolean;
	/** Zeitpunkt der letzten empfangenen Position, ISO. */
	zuletzt: string | null;
}

/**
 * Abonniert den SSE-Kanal und pflegt die Fahrzeugliste fort.
 * Die Wiederverbindung übernimmt der Browser (siehe `retry:` im Stream).
 */
export function trackerStream(start: Fahrzeug[]): Readable<Trackerzustand> {
	return readable<Trackerzustand>(
		{ fahrzeuge: start, verbunden: false, zuletzt: start[0]?.spur[0]?.am ?? null },
		(setze) => {
			if (!browser) return;

			let liste = start;
			let zuletzt = start[0]?.spur[0]?.am ?? null;
			const quelle = new EventSource('/api/tracker/stream');

			quelle.onopen = () => setze({ fahrzeuge: liste, verbunden: true, zuletzt });
			quelle.onerror = () => setze({ fahrzeuge: liste, verbunden: false, zuletzt });

			quelle.onmessage = (e) => {
				const ereignis = JSON.parse(e.data) as TrackerEvent;

				if (ereignis.art === 'ping') return;

				if (ereignis.art === 'init') {
					liste = ereignis.fahrzeuge;
				} else {
					const ohne = liste.filter((f) => f.id !== ereignis.fahrzeug.id);
					liste = [...ohne, ereignis.fahrzeug].sort((a, b) =>
						a.name.localeCompare(b.name, 'de')
					);
					zuletzt = ereignis.fahrzeug.spur[0]?.am ?? zuletzt;
				}

				setze({ fahrzeuge: liste, verbunden: true, zuletzt });
			};

			return () => quelle.close();
		}
	);
}