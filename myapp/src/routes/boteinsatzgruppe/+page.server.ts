// src/routes/boteinsatzgruppe/+page.server.ts
import { collection } from '$lib/server/usedata';
import { ObjectId, type Filter, type Document } from 'mongodb';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AUSRUESTUNG, FUNKTIONEN, STAMMDATEN } from '$lib/types/mitglied';

/**
 * locals.userId kann je nach hooks.server.ts eine Mongo-_id (Hex-String)
 * oder die telegramID sein. Beide Faelle werden hier abgedeckt.
 */
function userQuery(id: string | number | null | undefined): Filter<Document> {
	if (id === undefined || id === null || id === '') {
		throw error(401, 'Nicht angemeldet');
	}
	if (typeof id === 'string' && ObjectId.isValid(id)) {
		return { _id: new ObjectId(id) };
	}
	return { telegramID: Number(id) };
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const currentUser = await collection.findOne(userQuery(locals.userId));

	if (!currentUser) {
		throw error(404, 'Benutzer nicht gefunden');
	}

	const eigeneId = currentUser._id.toString();
	const istAdmin = currentUser.ortsgruppe_admin === true;

	// Nicht-Admins bekommen ausschliesslich den eigenen Datensatz.
	// Admins sehen nur die eigene Ortsgruppe, nicht die gesamte Datenbank.
	const filter = istAdmin ? { ortsgruppe: currentUser.ortsgruppe } : { _id: currentUser._id };

	const rohdaten = await collection.find(filter).toArray();
	const data = rohdaten.map((doc) => ({ ...doc, _id: doc._id.toString() }));

	// Fremde Datensaetze darf nur ein Admin der gleichen Ortsgruppe oeffnen
	const gewuenschteId = url.searchParams.get('userId');
	const erlaubt = gewuenschteId && data.some((d) => d._id === gewuenschteId);

	return {
		data: JSON.parse(JSON.stringify(data)),
		currentUserId: erlaubt ? gewuenschteId : eigeneId,
		loggedInUserId: eigeneId,
		isAdmin: istAdmin
	};
};

export const actions = {
	save: async ({ request, locals }) => {
		const currentUser = await collection.findOne(userQuery(locals.userId));
		if (!currentUser) {
			return fail(401, { success: false, error: 'Nicht angemeldet' });
		}

		const formData = await request.formData();
		const id = formData.get('_id');

		if (typeof id !== 'string' || !ObjectId.isValid(id)) {
			return fail(400, { success: false, error: 'Ungültige oder fehlende ID' });
		}

		const objectId = new ObjectId(id);
		const istAdmin = currentUser.ortsgruppe_admin === true;
		const istEigenerDatensatz = currentUser._id.toString() === id;

		if (!istAdmin && !istEigenerDatensatz) {
			return fail(403, { success: false, error: 'Keine Berechtigung für diesen Datensatz' });
		}

		const zielDoc = await collection.findOne({ _id: objectId });
		if (!zielDoc) {
			return fail(404, { success: false, error: 'Datensatz nicht gefunden' });
		}

		// Admins nur innerhalb der eigenen Ortsgruppe
		if (istAdmin && !istEigenerDatensatz && zielDoc.ortsgruppe !== currentUser.ortsgruppe) {
			return fail(403, { success: false, error: 'Datensatz gehört zu einer anderen Ortsgruppe' });
		}

		function text(feld: string): string {
			const wert = formData.get(feld);
			return typeof wert === 'string' ? wert.trim() : '';
		}

		const updateFields: Record<string, string | boolean> = {};

		for (const { key } of STAMMDATEN) {
			updateFields[key] = text(key);
		}

		for (const { key } of AUSRUESTUNG) {
			updateFields[`ausruestung.${key}`] = text(`ausruestung.${key}`);
		}

		// Funktionen darf ausschliesslich ein Admin aendern
		if (istAdmin) {
			for (const { key } of FUNKTIONEN) {
				updateFields[`funktionen.${key}`] = formData.get(`funktionen.${key}`) === 'on';
			}
		}

		try {
			const result = await collection.updateOne({ _id: objectId }, { $set: updateFields });

			return {
				success: true,
				modified: result.modifiedCount
			};
		} catch (err) {
			console.error('boteinsatzgruppe: Speichern fehlgeschlagen', err);
			return fail(500, {
				success: false,
				error: 'Fehler beim Speichern in die Datenbank'
			});
		}
	}
} satisfies Actions;