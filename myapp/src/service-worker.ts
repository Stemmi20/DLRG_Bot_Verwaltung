/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `lvs-${version}`;
const VORRAT = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((c) => c.addAll(VORRAT)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
			.then(() => sw.clients.claim())
	);
});

// ------------------------------------------------------------------ Alarm

interface AlarmNutzlast {
	einsatzId: string;
	typ: 'einsatz' | 'probealarm' | 'eigentest';
	stichwort: string;
	meldebild: string;
	ort: string;
	alarmzeit: string;
}

/**
 * `renotify`, `vibrate` und `actions` stehen in der Push-Spezifikation, fehlen
 * aber in den TypeScript-DOM-Typen. Deshalb hier eine eigene Erweiterung.
 */
type AlarmOptionen = NotificationOptions & {
	renotify?: boolean;
	vibrate?: number[];
	actions?: { action: string; title: string }[];
};

sw.addEventListener('push', (event) => {
	if (!event.data) return;
	const alarm = event.data.json() as AlarmNutzlast;
	const probe = alarm.typ !== 'einsatz';

	const optionen: AlarmOptionen = {
		body: `${alarm.meldebild}\n${alarm.ort}`,
		icon: '/icons/alarm-192.png',
		badge: '/icons/badge-72.png',
		tag: `einsatz-${alarm.einsatzId}`,
		// Gleicher Tag, aber trotzdem erneut melden: bei einer Statusaenderung
		// soll das Geraet noch einmal vibrieren.
		renotify: true,
		requireInteraction: true,
		vibrate: probe ? [200, 100, 200] : [400, 150, 400, 150, 400, 150, 400],
		data: alarm,
		actions: [
			{ action: 'kommt-10', title: 'Kommt · 10 min' },
			{ action: 'kommt-nicht', title: 'Kommt nicht' }
		]
	};

	event.waitUntil(
		sw.registration.showNotification(
			probe ? `PROBE · ${alarm.stichwort}` : alarm.stichwort,
			optionen
		)
	);
});

sw.addEventListener('notificationclick', (event) => {
	const alarm = event.notification.data as AlarmNutzlast;
	event.notification.close();
	const ziel = `/alarm/${alarm.einsatzId}`;

	if (event.action === 'kommt-10') {
		event.waitUntil(
			sendeRueckmeldung(alarm.einsatzId, { antwort: 'kommt', etaMinuten: 10 }).then(() =>
				oeffne(ziel)
			)
		);
		return;
	}
	if (event.action === 'kommt-nicht') {
		event.waitUntil(sendeRueckmeldung(alarm.einsatzId, { antwort: 'kommt_nicht' }));
		return;
	}
	event.waitUntil(oeffne(ziel));
});

async function oeffne(pfad: string): Promise<void> {
	const fenster = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
	for (const f of fenster) {
		if ('focus' in f) {
			await (f as WindowClient).navigate(pfad);
			return void (f as WindowClient).focus();
		}
	}
	await sw.clients.openWindow(pfad);
}

// ------------------------------------------------- Rückmeldung mit Wiedervorlage

interface Nachzustellen {
	einsatzId: string;
	body: Record<string, unknown>;
}

/**
 * Netz an der Wache ist oft mies. Schlägt der POST fehl, legen wir ihn in
 * IndexedDB und versuchen es über Background Sync erneut. Der Server-Endpunkt
 * ist ein Upsert, doppeltes Senden ist deshalb harmlos.
 */
async function sendeRueckmeldung(
	einsatzId: string,
	body: Record<string, unknown>
): Promise<void> {
	try {
		const antwort = await fetch(`/api/alarm/${einsatzId}/rueckmeldung`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(body)
		});
		if (!antwort.ok) throw new Error(String(antwort.status));
	} catch {
		await inWarteschlange({ einsatzId, body });
		await (sw.registration as ServiceWorkerRegistration & {
			sync?: { register(tag: string): Promise<void> };
		}).sync?.register('lvs-rueckmeldung');
	}
}

sw.addEventListener('sync', (event) => {
	const e = event as ExtendableEvent & { tag: string };
	if (e.tag === 'lvs-rueckmeldung') e.waitUntil(warteschlangeAbarbeiten());
});

const DB = 'lvs-outbox';
const STORE = 'rueckmeldungen';

function oeffneDb(): Promise<IDBDatabase> {
	return new Promise((res, rej) => {
		const anfrage = indexedDB.open(DB, 1);
		anfrage.onupgradeneeded = () =>
			anfrage.result.createObjectStore(STORE, { autoIncrement: true });
		anfrage.onsuccess = () => res(anfrage.result);
		anfrage.onerror = () => rej(anfrage.error);
	});
}

async function inWarteschlange(eintrag: Nachzustellen): Promise<void> {
	const db = await oeffneDb();
	await new Promise((res, rej) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).add(eintrag);
		tx.oncomplete = res;
		tx.onerror = () => rej(tx.error);
	});
}

async function warteschlangeAbarbeiten(): Promise<void> {
	const db = await oeffneDb();
	const eintraege: Nachzustellen[] = await new Promise((res, rej) => {
		const tx = db.transaction(STORE, 'readonly');
		const anfrage = tx.objectStore(STORE).getAll();
		anfrage.onsuccess = () => res(anfrage.result as Nachzustellen[]);
		anfrage.onerror = () => rej(anfrage.error);
	});

	for (const e of eintraege) {
		await fetch(`/api/alarm/${e.einsatzId}/rueckmeldung`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(e.body)
		});
	}

	const tx = db.transaction(STORE, 'readwrite');
	tx.objectStore(STORE).clear();
}

// ---------------------------------------------------------------- Fetch

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	// API und SSE nie aus dem Cache – veraltete Alarmdaten wären gefährlich.
	if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

	event.respondWith(
		fetch(event.request).catch(async () => {
			const treffer = await caches.match(event.request);
			if (treffer) return treffer;
			return new Response('Offline', { status: 503 });
		})
	);
});