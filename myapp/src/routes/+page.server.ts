import { col } from '$lib/server/database';
import { ladeUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await ladeUser(locals);
	const einsaetze = await col.einsaetze();


	const letzte = await einsaetze
		.find(
			{ empfaenger: user._id },
		)
		.toArray();

	return {
		name: user.vorname,
		letzte: letzte.map((e) => ({
			id: e._id.toHexString(),
			stichwort: e.stichwort,
		}))
	};
};