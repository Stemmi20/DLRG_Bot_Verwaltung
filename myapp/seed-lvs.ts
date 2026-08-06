/**
 * Beispieldaten für die Entwicklung.
 *   npx tsx scripts/seed-lvs.ts
 *
 * Legt zwei Ortsgruppen an (damit du den Standort-Wechsel testen kannst),
 * drei Fahrzeuge und drei Personen – eine davon in beiden Ortsgruppen.
 */
import { MongoClient, ObjectId } from 'mongodb';

const URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
const DB = process.env.MONGODB_DB ?? 'dlrg';

const client = new MongoClient(URI);
await client.connect();
const db = client.db(DB);

const fnId = new ObjectId();
const fnWache = new ObjectId();
const fnBoot = new ObjectId();
const ailingenId = new ObjectId();
const ailingenWache = new ObjectId();

await db.collection('ortsgruppen').deleteMany({});
await db.collection('ortsgruppen').insertMany([
	{
		_id: fnId,
		name: 'DLRG Friedrichshafen',
		kuerzel: 'FN',
		standorte: [
			{
				_id: fnWache,
				name: 'Wache Seestraße',
				adresse: 'Seestraße 1, 88045 Friedrichshafen',
				lat: 47.6503,
				lng: 9.4797
			},
			{
				_id: fnBoot,
				name: 'Bootshaus Fischbach',
				adresse: 'Hafenstraße 12, 88048 Friedrichshafen',
				lat: 47.6389,
				lng: 9.4147
			}
		]
	},
	{
		_id: ailingenId,
		name: 'DLRG Ailingen',
		kuerzel: 'AI',
		standorte: [
			{
				_id: ailingenWache,
				name: 'Gerätehaus Ailingen',
				adresse: 'Hauptstraße 40, 88048 Friedrichshafen',
				lat: 47.6852,
				lng: 9.4636
			}
		]
	}
]);

await db.collection('fahrzeuge').deleteMany({});
await db.collection('fahrzeuge').insertMany([
	{
		_id: new ObjectId(),
		ortsgruppeId: fnId,
		funkrufname: 'Wasserrettung Friedrichshafen 1/83/1',
		typ: 'MZB',
		kennzeichen: 'FN-DL 831',
		sollBesatzung: ['Bootsführer', 'Motorist', 'SAN'],
		status: 2,
		statusSeit: new Date(),
		aktuellerEinsatz: null
	},
	{
		_id: new ObjectId(),
		ortsgruppeId: fnId,
		funkrufname: 'Wasserrettung Friedrichshafen 1/19/1',
		typ: 'GW-Wasserrettung',
		kennzeichen: 'FN-DL 191',
		sollBesatzung: ['Fahrer', 'SAN'],
		status: 2,
		statusSeit: new Date(),
		aktuellerEinsatz: null
	},
	{
		_id: new ObjectId(),
		ortsgruppeId: ailingenId,
		funkrufname: 'Wasserrettung Ailingen 1/83/1',
		typ: 'MZB',
		kennzeichen: 'FN-DL 832',
		sollBesatzung: ['Bootsführer', 'Motorist'],
		status: 2,
		statusSeit: new Date(),
		aktuellerEinsatz: null
	}
]);

await db.collection('users').deleteMany({ email: /@beispiel\.test$/ });
await db.collection('users').insertMany([
	{
		_id: new ObjectId(),
		vorname: 'Anna',
		name: 'Beispiel',
		email: 'anna@beispiel.test',
		rollen: ['admin', 'aktiv'],
		ortsgruppen: [{ ortsgruppeId: fnId, primaer: true, standardStandortId: fnWache }],
		qualifikationen: ['Bootsführer', 'SAN'],
		pushSubscriptions: [],
		alarmierung: { aktiv: true, abwesendBis: null }
	},
	{
		_id: new ObjectId(),
		vorname: 'Ben',
		name: 'Muster',
		email: 'ben@beispiel.test',
		rollen: ['aktiv'],
		// Zwei Ortsgruppen: bei dieser Person erscheint die Standortauswahl.
		ortsgruppen: [
			{ ortsgruppeId: fnId, primaer: true, standardStandortId: fnBoot },
			{ ortsgruppeId: ailingenId, primaer: false, standardStandortId: ailingenWache }
		],
		qualifikationen: ['Motorist', 'Fahrer'],
		pushSubscriptions: [],
		alarmierung: { aktiv: true, abwesendBis: null }
	},
	{
		_id: new ObjectId(),
		vorname: 'Clara',
		name: 'Test',
		email: 'clara@beispiel.test',
		rollen: ['einsatzleiter', 'aktiv'],
		ortsgruppen: [{ ortsgruppeId: fnId, primaer: true, standardStandortId: fnWache }],
		qualifikationen: ['SAN'],
		pushSubscriptions: [],
		alarmierung: { aktiv: true, abwesendBis: null }
	}
]);

console.log('Beispieldaten angelegt.');
await client.close();