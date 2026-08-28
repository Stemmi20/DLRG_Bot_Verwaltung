import { abonniere, alleFahrzeuge, starteMqtt } from '$lib/server/mqtt';
import type { TrackerEvent } from '$lib/types/tracker';
import type { RequestHandler } from './$types';

/**
 * Server-Sent Events für die Fahrzeugkarte.
 *
 * Wichtig für nginx:  proxy_buffering off;  proxy_read_timeout 3600s;
 */
export const GET: RequestHandler = async () => {
	starteMqtt();

	let abmelden: (() => void) | null = null;
	let herzschlag: ReturnType<typeof setInterval> | null = null;

	const stream = new ReadableStream({
		start(controller) {
			const enc = new TextEncoder();
			const sende = (e: TrackerEvent) => {
				try {
					controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
				} catch {
					// Verbindung ist schon weg – der cancel-Handler räumt auf.
				}
			};

			// Retry-Hinweis an den Browser: nach Abbruch in 3 s neu verbinden.
			controller.enqueue(enc.encode('retry: 3000\n\n'));
			sende({ art: 'init', fahrzeuge: alleFahrzeuge() });

			abmelden = abonniere(sende);
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