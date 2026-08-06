import { ObjectId } from 'mongodb';
import { col, type EinsatzDoc, type FahrzeugDoc, type UserDoc } from './database';
import { veroeffentliche } from './events';
import { protokolliere, webPushKanal } from './push';
import {
	etaZuPrognose,
	type Antwort,
	type BoardDto,
	type EinsatzDto,
	type EinsatzTyp,
	type Einsatzort,
	type EtaMinuten,
	type FahrzeugDto,
	type FmsStatus,
	type RueckmeldungDto
} from '$lib/types/lvs';

// ------------------------------------------------------------ Alarm auslösen

export interface AlarmEingabe {
	typ: EinsatzTyp;
	stichwort: string;
	meldebild: string;
	einsatzort: Einsatzort;
	ortsgruppenIds: string[];
	fahrzeugIds: string[];
	/** 'alle' = alle aktiven der gewählten Ortsgruppen, 'self' = nur der Auslöser. */
	scope: 'alle' | 'auswahl' | 'self';
	empfaengerIds?: string[];
	externalId?: string;
}

export async function alarmAusloesen(eingabe: AlarmEingabe, ausloeser: UserDoc): Promise<string> {
	const users = await col.users();
	const einsaetze = await col.einsaetze();
	const fahrzeuge = await col.fahrzeuge();

	const ogIds = eingabe.ortsgruppenIds.map((id) => new ObjectId(id));
	const jetzt = new Date();

	// Empfänger zum Alarmzeitpunkt einfrieren – wer später dazukommt, taucht
	// auf diesem Board nicht auf. Sonst stimmt der "offen"-Zähler nie.
	let empfaenger: UserDoc[];
	if (eingabe.scope === 'self') {
		empfaenger = [ausloeser];
	} else {
		const filter: Record<string, unknown> = {
			'ortsgruppen.ortsgruppeId': { $in: ogIds },
			'alarmierung.aktiv': true,
			$or: [{ 'alarmierung.abwesendBis': null }, { 'alarmierung.abwesendBis': { $lt: jetzt } }]
		};
		if (eingabe.scope === 'auswahl' && eingabe.empfaengerIds?.length) {
			filter._id = { $in: eingabe.empfaengerIds.map((id) => new ObjectId(id)) };
		}
		empfaenger = await users.find(filter).toArray();
	}

	const fzIds = eingabe.fahrzeugIds.map((id) => new ObjectId(id));
	const fzDocs = fzIds.length ? await fahrzeuge.find({ _id: { $in: fzIds } }).toArray() : [];

	const einsatz: EinsatzDoc = {
		_id: new ObjectId(),
		typ: eingabe.typ,
		stichwort: eingabe.stichwort,
		meldebild: eingabe.meldebild,
		einsatzort: eingabe.einsatzort,
		alarmzeit: jetzt,
		ausgeloestVon: ausloeser._id,
		ortsgruppen: ogIds,
		empfaenger: empfaenger.map((u) => u._id),
		fahrzeuge: fzDocs.map((f) => ({ fahrzeugId: f._id, status: 2 as FmsStatus, statusSeit: jetzt })),
		status: 'laufend',
		beendetAm: null,
		externalId: eingabe.externalId ?? null
	};

	await einsaetze.insertOne(einsatz);

	if (fzIds.length) {
		await fahrzeuge.updateMany(
			{ _id: { $in: fzIds } },
			{ $set: { aktuellerEinsatz: einsatz._id, status: 2, statusSeit: jetzt } }
		);
	}

	// Push ist bewusst nicht awaited-blockierend fürs Ergebnis: der Einsatz steht
	// schon in der DB, die Alarmseite ist erreichbar, auch wenn ein Push scheitert.
	void webPushKanal
		.sende(empfaenger, {
			einsatzId: einsatz._id.toHexString(),
			typ: einsatz.typ,
			stichwort: einsatz.stichwort,
			meldebild: einsatz.meldebild,
			ort: `${einsatz.einsatzort.strasse}, ${einsatz.einsatzort.ort}`,
			alarmzeit: jetzt.toISOString()
		})
		.then((ergebnisse) => protokolliere(einsatz._id, ergebnisse))
		.catch((e) => console.error('[lvs] Push fehlgeschlagen', e));

	return einsatz._id.toHexString();
}

export async function einsatzBeenden(einsatzId: string): Promise<void> {
	const einsaetze = await col.einsaetze();
	const fahrzeuge = await col.fahrzeuge();
	const id = new ObjectId(einsatzId);
	const jetzt = new Date();

	await einsaetze.updateOne({ _id: id }, { $set: { status: 'beendet', beendetAm: jetzt } });
	await fahrzeuge.updateMany(
		{ aktuellerEinsatz: id },
		{ $set: { aktuellerEinsatz: null, status: 2, statusSeit: jetzt } }
	);

	veroeffentliche(einsatzId, { art: 'beendet', beendetAm: jetzt.toISOString() });
}

// ------------------------------------------------------------ Rückmeldung

export interface RueckmeldungEingabe {
	antwort: Antwort;
	etaMinuten: EtaMinuten | null;
	ortsgruppeId: string | null;
	standortId: string | null;
}

/**
 * Upsert auf (einsatzId, userId). Mehrfaches Absenden derselben Antwort ist
 * unschädlich – wichtig, weil der Service Worker bei schlechtem Netz erneut sendet.
 */
export async function rueckmeldungSetzen(
	einsatzId: string,
	userId: string,
	eingabe: RueckmeldungEingabe
): Promise<RueckmeldungDto> {
	const einsaetze = await col.einsaetze();
	const rueckmeldungen = await col.rueckmeldungen();

	const eId = new ObjectId(einsatzId);
	const uId = new ObjectId(userId);

	const einsatz = await einsaetze.findOne({ _id: eId });
	if (!einsatz) throw new Error('Einsatz nicht gefunden');
	if (einsatz.status === 'beendet') throw new Error('Einsatz ist bereits beendet');

	const eta = eingabe.antwort === 'kommt' ? eingabe.etaMinuten : null;
	const jetzt = new Date();

	await rueckmeldungen.updateOne(
		{ einsatzId: eId, userId: uId },
		{
			$set: {
				antwort: eingabe.antwort,
				etaMinuten: eta,
				// Prognose ab *jetzt*, nicht ab Alarmzeit: wer nach 8 Minuten
				// "in 10 Minuten da" meldet, ist in 10 Minuten da.
				ankunftPrognose: eta ? etaZuPrognose(jetzt, eta) : null,
				ortsgruppeId: eingabe.ortsgruppeId ? new ObjectId(eingabe.ortsgruppeId) : null,
				standortId: eingabe.standortId ? new ObjectId(eingabe.standortId) : null,
				eingegangenAm: jetzt
			},
			$setOnInsert: { _id: new ObjectId(), angekommenAm: null },
			$push: { verlauf: { antwort: eingabe.antwort, etaMinuten: eta, am: jetzt } }
		},
		{ upsert: true }
	);

	const dto = (await board(einsatzId)).rueckmeldungen.find((r) => r.userId === userId)!;
	veroeffentliche(einsatzId, { art: 'rueckmeldung', rueckmeldung: dto });
	return dto;
}

export async function alsAngekommenMarkieren(einsatzId: string, userId: string): Promise<void> {
	const rueckmeldungen = await col.rueckmeldungen();
	await rueckmeldungen.updateOne(
		{ einsatzId: new ObjectId(einsatzId), userId: new ObjectId(userId) },
		{ $set: { angekommenAm: new Date() } }
	);
	const dto = (await board(einsatzId)).rueckmeldungen.find((r) => r.userId === userId);
	if (dto) veroeffentliche(einsatzId, { art: 'rueckmeldung', rueckmeldung: dto });
}

// ------------------------------------------------------------ Fahrzeuge

export async function fahrzeugStatusSetzen(
	einsatzId: string,
	fahrzeugId: string,
	status: FmsStatus
): Promise<FahrzeugDto> {
	const einsaetze = await col.einsaetze();
	const fahrzeuge = await col.fahrzeuge();
	const jetzt = new Date();
	const fId = new ObjectId(fahrzeugId);

	await fahrzeuge.updateOne({ _id: fId }, { $set: { status, statusSeit: jetzt } });
	await einsaetze.updateOne(
		{ _id: new ObjectId(einsatzId), 'fahrzeuge.fahrzeugId': fId },
		{ $set: { 'fahrzeuge.$.status': status, 'fahrzeuge.$.statusSeit': jetzt } }
	);

	const dto = (await board(einsatzId)).fahrzeuge.find((f) => f.id === fahrzeugId)!;
	veroeffentliche(einsatzId, { art: 'fahrzeug', fahrzeug: dto });
	return dto;
}

/**
 * Greedy-Abgleich: welche Qualifikationen der Sollbesatzung sind durch
 * zurückgemeldete Kräfte gedeckt? Eine Person zählt nur einmal.
 * Genau das will der Einsatzleiter sehen – "MZB fährt nicht, Bootsführer fehlt".
 */
function besatzungPruefen(
	sollBesatzung: string[],
	verfuegbar: { userId: string; qualifikationen: string[] }[]
): string[] {
	const frei = verfuegbar.map((p) => new Set(p.qualifikationen));
	const fehlend: string[] = [];

	for (const quali of sollBesatzung) {
		const treffer = frei.findIndex((q) => q.has(quali));
		if (treffer === -1) fehlend.push(quali);
		else frei.splice(treffer, 1);
	}
	return fehlend;
}

// ------------------------------------------------------------ Boarddaten

export async function board(einsatzId: string): Promise<BoardDto> {
	const [einsaetze, rueckmeldungen, users, ortsgruppen, fahrzeuge] = await Promise.all([
		col.einsaetze(),
		col.rueckmeldungen(),
		col.users(),
		col.ortsgruppen(),
		col.fahrzeuge()
	]);

	const eId = new ObjectId(einsatzId);
	const einsatz = await einsaetze.findOne({ _id: eId });
	if (!einsatz) throw new Error('Einsatz nicht gefunden');

	const [rmDocs, ogDocs, alleUser] = await Promise.all([
		rueckmeldungen.find({ einsatzId: eId }).toArray(),
		ortsgruppen.find({ _id: { $in: einsatz.ortsgruppen } }).toArray(),
		users.find({ _id: { $in: einsatz.empfaenger } }).toArray()
	]);

	const userNach = new Map(alleUser.map((u) => [u._id.toHexString(), u]));
	const standortNamen = new Map<string, string>();
	for (const og of ogDocs) {
		for (const s of og.standorte) standortNamen.set(s._id.toHexString(), s.name);
	}

	const rmDtos: RueckmeldungDto[] = rmDocs.map((r) => {
		const u = userNach.get(r.userId.toHexString());
		return {
			userId: r.userId.toHexString(),
			name: u ? `${u.vorname} ${u.name}` : 'Unbekannt',
			qualifikationen: u?.qualifikationen ?? [],
			antwort: r.antwort,
			etaMinuten: r.etaMinuten,
			ankunftPrognose: r.ankunftPrognose?.toISOString() ?? null,
			angekommenAm: r.angekommenAm?.toISOString() ?? null,
			standortId: r.standortId?.toHexString() ?? null,
			standortName: r.standortId ? (standortNamen.get(r.standortId.toHexString()) ?? null) : null,
			eingegangenAm: r.eingegangenAm.toISOString()
		};
	});

	// Nach Ankunft sortieren, wer am schnellsten da ist steht oben.
	rmDtos.sort((a, b) => {
		if (a.ankunftPrognose && b.ankunftPrognose) {
			return a.ankunftPrognose.localeCompare(b.ankunftPrognose);
		}
		if (a.ankunftPrognose) return -1;
		if (b.ankunftPrognose) return 1;
		return a.name.localeCompare(b.name, 'de');
	});

	const beantwortet = new Set(rmDtos.map((r) => r.userId));
	const offen = alleUser
		.filter((u) => !beantwortet.has(u._id.toHexString()))
		.map((u) => ({ userId: u._id.toHexString(), name: `${u.vorname} ${u.name}` }))
		.sort((a, b) => a.name.localeCompare(b.name, 'de'));

	const kommend = rmDtos
		.filter((r) => r.antwort === 'kommt')
		.map((r) => ({ userId: r.userId, qualifikationen: r.qualifikationen }));

	const fzIds = einsatz.fahrzeuge.map((f) => f.fahrzeugId);
	const fzDocs: FahrzeugDoc[] = fzIds.length
		? await fahrzeuge.find({ _id: { $in: fzIds } }).toArray()
		: [];

	const fzDtos: FahrzeugDto[] = fzDocs.map((f) => ({
		id: f._id.toHexString(),
		funkrufname: f.funkrufname,
		typ: f.typ,
		status: f.status,
		statusSeit: f.statusSeit.toISOString(),
		sollBesatzung: f.sollBesatzung,
		fehlend: besatzungPruefen(f.sollBesatzung, kommend)
	}));

	const einsatzDto: EinsatzDto = {
		id: einsatz._id.toHexString(),
		typ: einsatz.typ,
		stichwort: einsatz.stichwort,
		meldebild: einsatz.meldebild,
		einsatzort: einsatz.einsatzort,
		alarmzeit: einsatz.alarmzeit.toISOString(),
		status: einsatz.status,
		beendetAm: einsatz.beendetAm?.toISOString() ?? null,
		anzahlAlarmiert: einsatz.empfaenger.length,
		ortsgruppen: ogDocs.map((og) => ({
			id: og._id.toHexString(),
			name: og.name,
			kuerzel: og.kuerzel,
			standorte: og.standorte.map((s) => ({
				id: s._id.toHexString(),
				name: s.name,
				adresse: s.adresse,
				lat: s.lat,
				lng: s.lng
			}))
		}))
	};

	return {
		einsatz: einsatzDto,
		rueckmeldungen: rmDtos,
		fahrzeuge: fzDtos,
		offen,
		zaehler: {
			kommt: rmDtos.filter((r) => r.antwort === 'kommt').length,
			kommtNicht: rmDtos.filter((r) => r.antwort === 'kommt_nicht').length,
			spaeter: rmDtos.filter((r) => r.antwort === 'spaeter').length,
			offen: offen.length
		}
	};
}

/** Für die Startseite: läuft gerade etwas, das mich betrifft? */
export async function aktuellerEinsatzFuer(userId: string): Promise<string | null> {
	const einsaetze = await col.einsaetze();
	const treffer = await einsaetze.findOne(
		{ status: 'laufend', empfaenger: new ObjectId(userId) },
		{ sort: { alarmzeit: -1 }, projection: { _id: 1 } }
	);
	return treffer?._id.toHexString() ?? null;
}