import { col } from '$lib/server/database';
import { ladeUser } from '$lib/server/guards';
import { aktuellerEinsatzFuer } from '$lib/server/alarm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await ladeUser(locals);
	const einsaetze = await col.einsaetze();

	// Läuft gerade etwas, das mich betrifft? Das gehört ganz nach oben.
	const laufendId = await aktuellerEinsatzFuer(user._id.toHexString());

	// Die letzten Einsätze – damit du dir Board und Alarmseite auch
	// nach Feierabend noch einmal ansehen kannst.
	const letzte = await einsaetze
		.find(
			{ empfaenger: user._id },
			{
				sort: { alarmzeit: -1 },
				limit: 8,
				projection: { stichwort: 1, typ: 1, alarmzeit: 1, status: 1, 'einsatzort.ort': 1 }
			}
		)
		.toArray();

	return {
		name: user.vorname,
		istAdmin: user.rollen?.includes('admin') ?? false,
		darfBoard: user.rollen?.some((r) => r === 'admin' || r === 'einsatzleiter') ?? false,
		alarmierungEingerichtet: (user.pushSubscriptions?.length ?? 0) > 0,
		mehrereOrtsgruppen: user.ortsgruppen.length > 1,
		laufendId,
		letzte: letzte.map((e) => ({
			id: e._id.toHexString(),
			stichwort: e.stichwort,
			typ: e.typ,
			ort: e.einsatzort?.ort ?? '',
			alarmzeit: e.alarmzeit.toISOString(),
			status: e.status
		}))
	};
};