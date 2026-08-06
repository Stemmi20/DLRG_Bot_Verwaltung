import { readable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import type { BoardDto, EinsatzEvent } from '$lib/types/lvs';

export interface Streamzustand {
	board: BoardDto | null;
	verbunden: boolean;
}

/**
 * Abonniert den SSE-Kanal eines Einsatzes und pflegt die Boarddaten fort.
 * Wiederverbindung übernimmt der Browser (siehe `retry:` im Stream).
 */
export function einsatzStream(einsatzId: string, start: BoardDto): Readable<Streamzustand> {
	return readable<Streamzustand>({ board: start, verbunden: false }, (setze) => {
		if (!browser) return;

		let aktuell = start;
		const quelle = new EventSource(`/api/alarm/${einsatzId}/stream`);

		quelle.onopen = () => setze({ board: aktuell, verbunden: true });
		quelle.onerror = () => setze({ board: aktuell, verbunden: false });

		quelle.onmessage = (e) => {
			const ereignis = JSON.parse(e.data) as EinsatzEvent;

			switch (ereignis.art) {
				case 'ping':
					return;
				case 'init':
					aktuell = ereignis.board;
					break;
				case 'rueckmeldung': {
					const ohne = aktuell.rueckmeldungen.filter(
						(r) => r.userId !== ereignis.rueckmeldung.userId
					);
					const liste = [...ohne, ereignis.rueckmeldung].sort(sortiereNachAnkunft);
					aktuell = {
						...aktuell,
						rueckmeldungen: liste,
						offen: aktuell.offen.filter((o) => o.userId !== ereignis.rueckmeldung.userId),
						zaehler: zaehle(liste, aktuell.offen.length)
					};
					break;
				}
				case 'fahrzeug':
					aktuell = {
						...aktuell,
						fahrzeuge: aktuell.fahrzeuge.map((f) =>
							f.id === ereignis.fahrzeug.id ? ereignis.fahrzeug : f
						)
					};
					break;
				case 'beendet':
					aktuell = {
						...aktuell,
						einsatz: { ...aktuell.einsatz, status: 'beendet', beendetAm: ereignis.beendetAm }
					};
					break;
			}

			setze({ board: aktuell, verbunden: true });
		};

		return () => quelle.close();
	});
}

function sortiereNachAnkunft(a: { ankunftPrognose: string | null; name: string }, b: typeof a) {
	if (a.ankunftPrognose && b.ankunftPrognose) {
		return a.ankunftPrognose.localeCompare(b.ankunftPrognose);
	}
	if (a.ankunftPrognose) return -1;
	if (b.ankunftPrognose) return 1;
	return a.name.localeCompare(b.name, 'de');
}

function zaehle(liste: BoardDto['rueckmeldungen'], offenVorher: number) {
	const kommt = liste.filter((r) => r.antwort === 'kommt').length;
	const kommtNicht = liste.filter((r) => r.antwort === 'kommt_nicht').length;
	const spaeter = liste.filter((r) => r.antwort === 'spaeter').length;
	return { kommt, kommtNicht, spaeter, offen: Math.max(0, offenVorher - 1) };
}