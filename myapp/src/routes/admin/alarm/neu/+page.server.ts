import { ladeAdmin } from '$lib/server/guards';
import { col } from '$lib/server/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	await ladeAdmin(locals);

	const [ortsgruppen, fahrzeuge, users] = await Promise.all([
		col.ortsgruppen(),
		col.fahrzeuge(),
		col.users()
	]);

	const ogs = await ortsgruppen.find({}).toArray();
	const fzs = await fahrzeuge.find({}).toArray();

	// Wie viele würden aktuell überhaupt erreicht? Das gehört vor den Auslöseknopf.
	const erreichbar = await users.countDocuments({
		'alarmierung.aktiv': true,
		'pushSubscriptions.0': { $exists: true }
	});
	const gesamt = await users.countDocuments({});

	return {
		ortsgruppen: ogs.map((o) => ({
			id: o._id.toHexString(),
			name: o.name,
			kuerzel: o.kuerzel
		})),
		fahrzeuge: fzs.map((f) => ({
			id: f._id.toHexString(),
			funkrufname: f.funkrufname,
			ortsgruppeId: f.ortsgruppeId.toHexString()
		})),
		erreichbar,
		gesamt
	};
};
