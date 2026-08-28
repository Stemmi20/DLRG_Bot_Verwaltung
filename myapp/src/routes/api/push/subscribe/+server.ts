import { json, error } from '@sveltejs/kit';
import { col, type PushSubscriptionDoc } from '$lib/server/database';
import { ladeUser } from '$lib/server/guards';
import { oeffentlicherVapidKey } from '$lib/server/push';
import type { RequestHandler } from './$types';

/** Der Client holt sich hier den VAPID-Public-Key. */
export const GET: RequestHandler = async () => json({ vapidKey: oeffentlicherVapidKey });

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await ladeUser(locals);
	const body = (await request.json()) as {
		endpoint?: string;
		keys?: { p256dh: string; auth: string };
		geraet?: string;
	};

	if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
		throw error(400, 'Push-Abo unvollständig');
	}

	const users = await col.users();
	// Erst raus, dann rein: so bleibt das Abo eindeutig, auch wenn der
	// Browser denselben Endpoint mit neuen Schlüsseln liefert.
	await users.updateOne(
		{ _id: user._id },
		{ $pull: { pushSubscriptions: { endpoint: body.endpoint } } }
	);
	// Der Treiber akzeptiert beim $push kein anonymes Literal - vorher typisieren.
	const abo: PushSubscriptionDoc = {
		endpoint: body.endpoint,
		keys: body.keys,
		geraet: (body.geraet ?? 'Unbekanntes Gerät').slice(0, 120),
		erstelltAm: new Date(),
		zuletztOk: null
	};

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const user = await ladeUser(locals);
	const { endpoint } = (await request.json()) as { endpoint: string };
	const users = await col.users();
	await users.updateOne({ _id: user._id }, { $pull: { pushSubscriptions: { endpoint } } });
	return json({ ok: true });
};