import { board } from '$lib/server/alarm';
import { abonniere } from '$lib/server/events';
import { ladeUser } from '$lib/server/guards';
import type { EinsatzEvent } from '$lib/types/lvs';
import type { RequestHandler } from './$types';

/**
 * Server-Sent Events. Reicht hier völlig: wir senden nur, der Client antwortet
 * über normale POSTs. Überlebt Reverse Proxies besser als WebSockets.
 *
 * Wichtig für nginx:  proxy_buffering off;  proxy_read_timeout 3600s;
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	await ladeUser(locals);
	const einsatzId = params.id;

	let abmelden: (() => void) | null = null;
	let herzschlag: ReturnType<typeof setInterval> | null = null;

	const stream = new ReadableStream({
		async start(controller) {
			const enc = new TextEncoder();
			const sende = (e: EinsatzEvent) => {
				try {
					controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
				} catch {
					// Verbindung ist schon weg – der cancel-Handler räumt auf.
				}
			};

			// Retry-Hinweis an den Browser: nach Abbruch in 3 s neu verbinden.
			controller.enqueue(enc.encode('retry: 3000\n\n'));
			sende({ art: 'init', board: await board(einsatzId) });

			abmelden = abonniere(einsatzId, sende);
			herzschlag = setInterval(() => sende({ art: 'ping' }), 25_000);
		},
		cancel() {
			abmelden?.();
			if (herzschlag) clearInterval(herzschlag);
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive',
			'x-accel-buffering': 'no'
		}
	});
};
