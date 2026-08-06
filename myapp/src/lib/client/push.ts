/** Push-An-/Abmeldung im Browser. Wird nur auf der Einstellungsseite gebraucht. */

export type PushZustand = 'aus' | 'an' | 'blockiert' | 'nicht-unterstuetzt';

export function pushUnterstuetzt(): boolean {
	return (
		typeof window !== 'undefined' &&
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window
	);
}

/** iOS liefert Web Push nur, wenn die Seite als App auf dem Homescreen läuft. */
export function istIosOhneHomescreen(): boolean {
	if (typeof window === 'undefined') return false;
	const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
	const alsApp = window.matchMedia('(display-mode: standalone)').matches;
	return ios && !alsApp;
}

export async function zustand(): Promise<PushZustand> {
	if (!pushUnterstuetzt()) return 'nicht-unterstuetzt';
	if (Notification.permission === 'denied') return 'blockiert';
	const reg = await navigator.serviceWorker.ready;
	const abo = await reg.pushManager.getSubscription();
	return abo ? 'an' : 'aus';
}

export async function anmelden(): Promise<PushZustand> {
	if (!pushUnterstuetzt()) return 'nicht-unterstuetzt';

	const erlaubnis = await Notification.requestPermission();
	if (erlaubnis !== 'granted') return erlaubnis === 'denied' ? 'blockiert' : 'aus';

	const { vapidKey } = (await (await fetch('/api/push/subscribe')).json()) as { vapidKey: string };
	const reg = await navigator.serviceWorker.ready;

	const abo =
		(await reg.pushManager.getSubscription()) ??
		(await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: base64ZuBytes(vapidKey)
		}));

	const roh = abo.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
	await fetch('/api/push/subscribe', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ ...roh, geraet: geraetename() })
	});

	return 'an';
}

export async function abmelden(): Promise<PushZustand> {
	const reg = await navigator.serviceWorker.ready;
	const abo = await reg.pushManager.getSubscription();
	if (!abo) return 'aus';

	await fetch('/api/push/subscribe', {
		method: 'DELETE',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ endpoint: abo.endpoint })
	});
	await abo.unsubscribe();
	return 'aus';
}

function geraetename(): string {
	const ua = navigator.userAgent;
	const system = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : 'Desktop';
	const browser = /Firefox/.test(ua) ? 'Firefox' : /Chrome/.test(ua) ? 'Chrome' : 'Safari';
	return `${system} · ${browser}`;
}

/**
 * Uint8Array.from() liefert ab TypeScript 5.7 ein Uint8Array<ArrayBufferLike>,
 * applicationServerKey verlangt aber garantiert einen ArrayBuffer. Deshalb den
 * Puffer explizit anlegen.
 */
function base64ZuBytes(base64: string): Uint8Array<ArrayBuffer> {
	const gefuellt = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
		.replace(/-/g, '+')
		.replace(/_/g, '/');
	const roh = atob(gefuellt);

	const bytes = new Uint8Array(new ArrayBuffer(roh.length));
	for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
	return bytes;
}