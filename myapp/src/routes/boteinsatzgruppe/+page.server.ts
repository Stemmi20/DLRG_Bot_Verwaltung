import { collection } from '$lib/server/usedata';
import { ObjectId } from 'mongodb';
import { error } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async function ({ url, locals }) {
	try {
		const currentUser = await collection.findOne({ 'user._id': locals.userId } as any);

		if (!currentUser) {
			throw error(404, 'User nicht gefunden');
		}

		const data = await collection.find({}).toArray();

		const selectedUserId = url.searchParams.get('userId');

		return {
			data: JSON.parse(JSON.stringify(data)),
			currentUserId: selectedUserId || locals.userId,
			loggedInUserId: locals.userId,
			isAdmin: currentUser.user.ortsgruppe_admin,
		};
	} catch (err) {
		console.error('Error loading data:', err);
		throw error(500, 'Fehler beim Laden der Daten');
	}
};

export const actions = {
	save: async (event) => {
		try {
			const formData = await event.request.formData();

			const _id = formData.get('_id') as string;

			console.log('Received _id:', _id);
			console.log('_id type:', typeof _id);

			if (!_id) {
				console.error('Keine _id gefunden in den Daten!');
				return {
					success: false,
					error: 'Keine _id vorhanden',
				};
			}

			let objectId: ObjectId;
			try {
				objectId = new ObjectId(_id);
				console.log('Created ObjectId:', objectId);
			} catch (err) {
				console.error('Fehler beim Erstellen der ObjectId:', err);
				return {
					success: false,
					error: 'Ungültige _id',
				};
			}

			const updateData: any = {
				vorname: formData.get('vorname') || '',
				nachname: formData.get('nachname') || '',
				benutzername: formData.get('benutzername') || '',
				ortsgruppe: formData.get('ortsgruppe') || '',
				zweitOrtsgruppe: formData.get('zweitOrtsgruppe') || '',
			};

			updateData.ausruestung = {
				neoprenSchuh: formData.get('ausruestung.neoprenSchuh') || '',
				schildmütze: formData.get('ausruestung.schildmütze') || '',
				jacke: formData.get('ausruestung.jacke') || '',
				badebekleidung: formData.get('ausruestung.badebekleidung') || '',
				pullover: formData.get('ausruestung.pullover') || '',
				hose: formData.get('ausruestung.hose') || '',
				namensschild: formData.get('ausruestung.namensschild') || '',
				TShirt: formData.get('ausruestung.TShirt') || '',
				schuhe: formData.get('ausruestung.schuhe') || '',
				neoprenAnzug: formData.get('ausruestung.neoprenAnzug') || '',
				handschuhe: formData.get('ausruestung.handschuhe') || '',
				neoprenHandschuhe: formData.get('ausruestung.neoprenHandschuhe') || '',
			};

			updateData.funktionen = {
				evd: formData.get('funktionen.evd') === 'on',
				bf: formData.get('funktionen.bf') === 'on',
				kf: formData.get('funktionen.kf') === 'on',
				wr: formData.get('funktionen.wr') === 'on',
				zf: formData.get('funktionen.zf') === 'on',
				et: formData.get('funktionen.et') === 'on',
				sr: formData.get('funktionen.sr') === 'on',
				gf: formData.get('funktionen.gf') === 'on',
			};

			console.log('Update Data:', JSON.stringify(updateData, null, 2));

			let existingDoc = await collection.findOne({ 'user._id': _id } as any);
			console.log('Found document:', existingDoc ? 'YES' : 'NO');

			if (!existingDoc) {
				console.error('Dokument mit dieser _id nicht gefunden');
				const allDocs = await collection.find({}).limit(3).toArray();
				console.log('First 3 documents structure:', JSON.stringify(allDocs, null, 2));
				return {
					success: false,
					error: 'Dokument nicht gefunden',
				};
			}

			console.log('Found document structure:', JSON.stringify(existingDoc, null, 2));

			const updateFields: any = {
				'user.vorname': updateData.vorname,
				'user.nachname': updateData.nachname,
				'user.benutzername': updateData.benutzername,
				'user.ortsgruppe': updateData.ortsgruppe,
				'user.zweitOrtsgruppe': updateData.zweitOrtsgruppe,
				'user.ausruestung.neoprenSchuh': updateData.ausruestung.neoprenSchuh,
				'user.ausruestung.schildmütze': updateData.ausruestung.schildmütze,
				'user.ausruestung.jacke': updateData.ausruestung.jacke,
				'user.ausruestung.badebekleidung': updateData.ausruestung.badebekleidung,
				'user.ausruestung.pullover': updateData.ausruestung.pullover,
				'user.ausruestung.hose': updateData.ausruestung.hose,
				'user.ausruestung.namensschild': updateData.ausruestung.namensschild,
				'user.ausruestung.TShirt': updateData.ausruestung.TShirt,
				'user.ausruestung.schuhe': updateData.ausruestung.schuhe,
				'user.ausruestung.neoprenAnzug': updateData.ausruestung.neoprenAnzug,
				'user.ausruestung.handschuhe': updateData.ausruestung.handschuhe,
				'user.ausruestung.neoprenHandschuhe': updateData.ausruestung.neoprenHandschuhe,
				'user.funktionen.evd': updateData.funktionen.evd,
				'user.funktionen.bf': updateData.funktionen.bf,
				'user.funktionen.kf': updateData.funktionen.kf,
				'user.funktionen.wr': updateData.funktionen.wr,
				'user.funktionen.zf': updateData.funktionen.zf,
				'user.funktionen.et': updateData.funktionen.et,
				'user.funktionen.sr': updateData.funktionen.sr,
				'user.funktionen.gf': updateData.funktionen.gf,
			};

			console.log('Update fields:', JSON.stringify(updateFields, null, 2));

			const result = await collection.updateOne({ 'user._id': _id } as any, { $set: updateFields });

			console.log('Update result:', result);

			return {
				success: true,
				modified: result.modifiedCount,
			};
		} catch (error) {
			console.error('Error saving to MongoDB:', error);
			return {
				success: false,
				error: 'Fehler beim Speichern in die Datenbank: ' + (error as Error).message,
			};
		}
	},
} satisfies Actions;
