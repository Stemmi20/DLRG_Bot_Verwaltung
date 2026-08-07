// src/routes/kfausb/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/database';
import { saveFuehrerschein, deleteFuehrerschein } from '$lib/server/files';

const MAX_BYTES = 5 * 1024 * 1024;
const ERLAUBTE_TYPEN = ['image/jpeg', 'image/png', 'application/pdf'];
const KLASSEN = ['B', 'BE', 'C1E', 'CE'] as const;

type Klasse = (typeof KLASSEN)[number];

function text(form: FormData, feld: string): string {
	const wert = form.get(feld);
	return typeof wert === 'string' ? wert.trim() : '';
}

function istDatum(wert: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(wert) && !Number.isNaN(Date.parse(wert));
}

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();

		const werte = {
			name: text(form, 'name'),
			vorname: text(form, 'vorname'),
			geburtsdatum: text(form, 'geburtsdatum'),
			geburtsort: text(form, 'geburtsort'),
			ausstellungsdatum: text(form, 'ausstellungsdatum'),
			ablaufdatum: text(form, 'ablaufdatum'),
			behoerde: text(form, 'behoerde'),
			fsNummer: text(form, 'fsNummer'),
			zusatz: text(form, 'zusatz')
		};

		const gewaehlteKlassen = form
			.getAll('klasse')
			.filter((k): k is string => typeof k === 'string')
			.filter((k): k is Klasse => (KLASSEN as readonly string[]).includes(k));

		const felder: Record<string, string> = {};

		if (!werte.name) felder.name = 'Bitte den Nachnamen eintragen.';
		if (!werte.vorname) felder.vorname = 'Bitte den Vornamen eintragen.';
		if (!istDatum(werte.geburtsdatum)) felder.geburtsdatum = 'Bitte ein gueltiges Datum waehlen.';
		if (!werte.geburtsort) felder.geburtsort = 'Bitte den Geburtsort eintragen.';
		if (!istDatum(werte.ausstellungsdatum))
			felder.ausstellungsdatum = 'Bitte Feld 4a vom Fuehrerschein uebernehmen.';
		if (!istDatum(werte.ablaufdatum))
			felder.ablaufdatum = 'Bitte Feld 4b vom Fuehrerschein uebernehmen.';
		if (!werte.behoerde) felder.behoerde = 'Bitte Feld 4c vom Fuehrerschein uebernehmen.';
		if (!werte.fsNummer) felder.fsNummer = 'Bitte Feld 5 vom Fuehrerschein uebernehmen.';

		if (
			istDatum(werte.ausstellungsdatum) &&
			istDatum(werte.ablaufdatum) &&
			werte.ablaufdatum <= werte.ausstellungsdatum
		) {
			felder.ablaufdatum = 'Das Ablaufdatum muss nach dem Ausstellungsdatum liegen.';
		}

		if (gewaehlteKlassen.length === 0) {
			felder.klasse = 'Bitte mindestens eine Fahrerlaubnisklasse auswaehlen.';
		}

		const klassenDaten = gewaehlteKlassen.map((klasse) => {
			const ab = text(form, `ab_${klasse}`);
			const bis = text(form, `bis_${klasse}`);

			if (!istDatum(ab)) felder[`ab_${klasse}`] = `Gueltig ab fehlt fuer Klasse ${klasse}.`;
			if (bis && !istDatum(bis)) felder[`bis_${klasse}`] = `Ungueltiges Datum fuer Klasse ${klasse}.`;
			if (istDatum(ab) && istDatum(bis) && bis <= ab) {
				felder[`bis_${klasse}`] = `"Gueltig bis" muss nach "gueltig ab" liegen (${klasse}).`;
			}

			return { klasse, gueltigAb: ab, gueltigBis: bis || null };
		});

		const datei = form.get('fuehrerschein');

		if (!(datei instanceof File) || datei.size === 0) {
			felder.fuehrerschein = 'Bitte eine Kopie des Fuehrerscheins hochladen.';
		} else if (datei.size > MAX_BYTES) {
			felder.fuehrerschein = 'Die Datei ist groesser als 5 MB.';
		} else if (!ERLAUBTE_TYPEN.includes(datei.type)) {
			felder.fuehrerschein = 'Erlaubt sind JPG, PNG und PDF.';
		}

		if (Object.keys(felder).length > 0) {
			return fail(400, {
				fehler: 'Bitte die markierten Felder pruefen.',
				felder,
				werte,
				klassen: gewaehlteKlassen
			});
		}

		let dateiId;
		try {
			dateiId = await saveFuehrerschein(datei as File, { zweck: 'kfausb' });

			await db.collection('kfausb_anmeldungen').insertOne({
				...werte,
				klassen: klassenDaten,
				dateiId,
				eingegangenAm: new Date(),
				status: 'offen'
			});
		} catch (err) {
			// Verwaiste Datei wieder entfernen, wenn der Datensatz nicht geschrieben wurde
			if (dateiId) await deleteFuehrerschein(dateiId).catch(() => {});
			console.error('kfausb: Anmeldung fehlgeschlagen', err);

			return fail(500, {
				fehler: 'Die Anmeldung konnte nicht gespeichert werden. Bitte spaeter erneut versuchen.',
				felder,
				werte,
				klassen: gewaehlteKlassen
			});
		}

		return { erfolg: true };
	}
};