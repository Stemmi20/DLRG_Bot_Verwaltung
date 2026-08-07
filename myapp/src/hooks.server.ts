// src/hooks.server.ts
import { redirect, type Handle } from '@sveltejs/kit';
import { sitzungPruefen } from '$lib/server/auth';

// Alles unter diesen Pfaden erfordert eine Anmeldung
const GESCHUETZT = ['/boteinsatzgruppe', '/admin', '/alarm', '/board', '/einstellungen', '/kfausb'];

export const handle: Handle = async ({ event, resolve }) => {
	const sitzungsId = event.cookies.get('session');
	const sitzung = sitzungsId ? await sitzungPruefen(sitzungsId) : null;

	if (sitzungsId && !sitzung) {
		event.cookies.delete('session', { path: '/' });
	}

	// Einzige Quelle der Wahrheit: was hier landet, kommt aus der Datenbank -
	// nicht aus einem Cookie, das der Browser setzen koennte.
	event.locals.user = sitzung
		? {
				id: sitzung.benutzer._id.toString(),
				vorname: sitzung.benutzer.vorname ?? '',
				nachname: sitzung.benutzer.nachname ?? '',
				ortsgruppe: sitzung.benutzer.ortsgruppe ?? '',
				istAdmin: sitzung.benutzer.ortsgruppe_admin === true
			}
		: null;

	event.locals.userId = event.locals.user?.id ?? null;

	const pfad = event.url.pathname;
	const brauchtAnmeldung = GESCHUETZT.some((p) => pfad === p || pfad.startsWith(p + '/'));

	if (brauchtAnmeldung && !event.locals.user) {
		redirect(303, `/login?weiter=${encodeURIComponent(pfad)}`);
	}

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%unocss-svelte-scoped.global%', 'unocss_svelte_scoped_global_styles')
	});
};