import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { board } from '$lib/server/alarm';
import { col } from '$lib/server/database';
import { ladeUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await ladeUser(locals);
	const daten = await board(params.id);

	const gehoertDazu = daten.einsatz.ortsgruppen.some((og) =>
		user.ortsgruppen.some((z) => z.ortsgruppeId.toString() === og.id)
	);
	if (!gehoertDazu) throw error(403, 'Dieser Alarm gilt nicht für deine Ortsgruppe');

	// Nur die Ortsgruppen anbieten, in denen die Person auch wirklich ist –
	// und die von diesem Alarm betroffen sind.
	const ortsgruppen = await col.ortsgruppen();
	const meineIds = user.ortsgruppen.map((z) => new ObjectId(z.ortsgruppeId));
	const meine = await ortsgruppen.find({ _id: { $in: meineIds } }).toArray();

	const auswahl = meine
		.filter((og) => daten.einsatz.ortsgruppen.some((e) => e.id === og._id.toHexString()))
		.map((og) => ({
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
		}));

	const standard = user.ortsgruppen.find((z) => z.primaer) ?? user.ortsgruppen[0];

	return {
		board: daten,
		meineRueckmeldung:
			daten.rueckmeldungen.find((r) => r.userId === user._id.toHexString()) ?? null,
		meineOrtsgruppen: auswahl,
		standardStandortId: standard?.standardStandortId?.toString() ?? null,
		// Nur wenn mehr als eine Ortsgruppe hinterlegt ist, zeigen wir die Auswahl.
		mussStandortWaehlen: auswahl.length > 1
	};
};