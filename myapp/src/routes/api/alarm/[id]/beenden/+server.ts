import { json } from '@sveltejs/kit';
import { einsatzBeenden } from '$lib/server/alarm';
import { ladeAdmin } from '$lib/server/guards';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	await ladeAdmin(locals);
	await einsatzBeenden(params.id);
	return json({ ok: true });
};
