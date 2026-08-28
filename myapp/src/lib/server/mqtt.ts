import mqtt, { type MqttClient } from 'mqtt';
import { EventEmitter } from 'node:events';
import {
	SPURLAENGE,
	type Fahrzeug,
	type Position,
	type TrackerEvent,
	type TrackerNutzlast
} from '$lib/types/tracker';

/**
 * MQTT-Anbindung für die Fahrzeugkarte.
 *
 * Der Server abonniert den Broker (Port 1883, reines TCP) und reicht jede
 * Position per SSE an die Browser weiter. Der Umweg über den Server ist nötig,
 * weil ein Browser nur WebSocket kann – und er hält die Zugangsdaten aus dem
 * Client heraus, falls du später auf einen eigenen Broker mit Passwort gehst.
 */

const BROKER = 'mqtt://broker.hivemq.com:1883';

/** Wildcard: fängt tracker/tracker-01/position genauso wie weitere Geräte. */
const TOPIC = 'tracker/+/position';

const bus = new EventEmitter();
bus.setMaxListeners(0);

/** Letzter Stand je Fahrzeug, im Speicher – reicht für eine Node-Instanz. */
const fahrzeuge = new Map<string, Fahrzeug>();

/*
 * Vite lädt Servermodule bei jeder Änderung neu. Ohne diesen Umweg über
 * globalThis würde sich im Dev-Betrieb mit jedem Speichern eine weitere
 * Verbindung zum Broker öffnen.
 */
const G = globalThis as typeof globalThis & { __lvsMqtt?: MqttClient };

export function starteMqtt(): void {
	if (G.__lvsMqtt) return;

	const client = mqtt.connect(BROKER, {
		clientId: `dlrg-board-${Math.random().toString(16).slice(2, 10)}`,
		reconnectPeriod: 5000,
		connectTimeout: 10_000
	});
	G.__lvsMqtt = client;

	client.on('connect', () => {
		console.log('[mqtt] verbunden mit', BROKER);
		client.subscribe(TOPIC, { qos: 0 }, (fehler) => {
			if (fehler) console.error('[mqtt] Abonnement fehlgeschlagen', fehler);
			else console.log('[mqtt] abonniert:', TOPIC);
		});
	});

	client.on('message', (topic, rohdaten) => {
		try {
			verarbeite(topic, rohdaten.toString());
		} catch (fehler) {
			console.error('[mqtt] Nachricht unlesbar auf', topic, fehler);
		}
	});

	client.on('error', (fehler) => console.error('[mqtt]', fehler.message));
	client.on('reconnect', () => console.log('[mqtt] Neuverbindung …'));
}

function verarbeite(topic: string, text: string): void {
	// tracker/<id>/position  →  <id>
	const id = topic.split('/')[1] ?? 'unbekannt';
	const daten = JSON.parse(text) as TrackerNutzlast;

	const lat = daten.lat;
	const lng = daten.lng ?? daten.lon;

	// Ohne gültige Koordinaten ist die Nachricht wertlos. Der Tracker sendet
	// beim Kaltstart gerne 0/0, bevor er Satelliten hat – das filtern wir mit.
	if (typeof lat !== 'number' || typeof lng !== 'number') return;
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
	if (lat === 0 && lng === 0) return;
	if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

	const position: Position = {
		lat,
		lng,
		am: new Date().toISOString(),
		speed: typeof daten.speed === 'number' ? daten.speed : null,
		course: typeof daten.course === 'number' ? daten.course : null
	};

	const vorher = fahrzeuge.get(id);
	const fahrzeug: Fahrzeug = {
		id,
		name: daten.name?.trim() || vorher?.name || id,
		// Neueste zuerst, auf drei Punkte begrenzt.
		spur: [position, ...(vorher?.spur ?? [])].slice(0, SPURLAENGE),
		sats: typeof daten.sats === 'number' ? daten.sats : (vorher?.sats ?? null),
		batt: typeof daten.batt === 'number' ? daten.batt : (vorher?.batt ?? null)
	};

	fahrzeuge.set(id, fahrzeug);
	bus.emit('tracker', { art: 'position', fahrzeug } satisfies TrackerEvent);
}

export function alleFahrzeuge(): Fahrzeug[] {
	return [...fahrzeuge.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Gibt die Abmeldefunktion zurück – im SSE-`cancel` aufrufen. */
export function abonniere(hoerer: (e: TrackerEvent) => void): () => void {
	bus.on('tracker', hoerer);
	return () => bus.off('tracker', hoerer);
}