import { json, error } from '@sveltejs/kit';
import { rueckmeldungSetzen, alsAngekommenMarkieren } from '$lib/server/alarm';
import { ladeUser } from '$lib/server/guards';
import { ETA_OPTIONEN, type Antwort, type EtaMinuten } from '$lib/types/lvs';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	const user = await ladeUser(locals);
	const body = (await request.json()) as {
		antwort: Antwort;
		etaMinuten?: number;
		ortsgruppeId?: string;
		standortId?: string;
		angekommen?: boolean;
	};

	if (body.angekommen) {
		await alsAngekommenMarkieren(params.id, user._id.toHexString());
		return json({ ok: true });
	}

	if (!['kommt', 'kommt_nicht', 'spaeter'].includes(body.antwort)) {
		throw error(400, 'Unbekannte Antwort');
	}

	let eta: EtaMinuten | null = null;
	if (body.antwort === 'kommt') {
		if (!ETA_OPTIONEN.includes(body.etaMinuten as EtaMinuten)) {
			throw error(400, 'Bitte wähle, in wie vielen Minuten du an der Wache bist');
		}
		eta = body.etaMinuten as EtaMinuten;
	}

	// Standort nur prüfen, wenn die Person überhaupt mehrere Ortsgruppen hat.
	if (user.ortsgruppen.length > 1 && body.antwort === 'kommt' && !body.standortId) {
		throw error(400, 'Bitte wähle den Standort, zu dem du kommst');
	}

	const rueckmeldung = await rueckmeldungSetzen(params.id, user._id.toHexString(), {
		antwort: body.antwort,
		etaMinuten: eta,
		ortsgruppeId: body.ortsgruppeId ?? null,
		standortId: body.standortId ?? null
	});

	return json(rueckmeldung);
};
