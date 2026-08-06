import { ObjectId } from 'mongodb';
import { col } from '$lib/server/database';
import { ladeUser } from '$lib/server/guards';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await ladeUser(locals);
	const ortsgruppen = await col.ortsgruppen();
	const meine = await ortsgruppen
		.find({ _id: { $in: user.ortsgruppen.map((z) => new ObjectId(z.ortsgruppeId)) } })
		.toArray();

	return {
		geraete: (user.pushSubscriptions ?? []).map((p) => ({
			endpoint: p.endpoint,
			geraet: p.geraet,
			erstelltAm: p.erstelltAm.toISOString()
		})),
		aktiv: user.alarmierung?.aktiv ?? false,
		abwesendBis: user.alarmierung?.abwesendBis?.toISOString().slice(0, 10) ?? '',
		ortsgruppen: meine.map((og) => {
			const z = user.ortsgruppen.find((x) => x.ortsgruppeId.toString() === og._id.toHexString());
			return {
				id: og._id.toHexString(),
				name: og.name,
				primaer: z?.primaer ?? false,
				standardStandortId: z?.standardStandortId?.toString() ?? null,
				standorte: og.standorte.map((s) => ({ id: s._id.toHexString(), name: s.name }))
			};
		})
	};
};

export const actions: Actions = {
	standort: async ({ request, locals }) => {
		const user = await ladeUser(locals);
		const daten = await request.formData();
		const ortsgruppeId = String(daten.get('ortsgruppeId'));
		const standortId = String(daten.get('standortId'));

		const users = await col.users();
		await users.updateOne(
			{ _id: user._id, 'ortsgruppen.ortsgruppeId': new ObjectId(ortsgruppeId) },
			{ $set: { 'ortsgruppen.$.standardStandortId': new ObjectId(standortId) } }
		);
		return { ok: true };
	},

	abwesenheit: async ({ request, locals }) => {
		const user = await ladeUser(locals);
		const daten = await request.formData();
		const bis = String(daten.get('bis') ?? '');
		const users = await col.users();
		await users.updateOne(
			{ _id: user._id },
			{ $set: { 'alarmierung.abwesendBis': bis ? new Date(bis) : null } }
		);
		return { ok: true };
	}
};
