<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SPUR_DECKKRAFT, VERALTET_NACH_MIN, type Fahrzeug } from '$lib/types/tracker';

	let {
		fahrzeuge = [],
		hoehe = '100%'
	}: { fahrzeuge?: Fahrzeug[]; hoehe?: string } = $props();

	let behaelter: HTMLDivElement;
	/* eslint-disable @typescript-eslint/no-explicit-any */
	let L: any = null;
	let karte: any = null;
	let ebene: any = null;
	/* eslint-enable @typescript-eslint/no-explicit-any */

	/** Beim ersten Empfang einmal auf die Fahrzeuge zoomen, danach nicht mehr. */
	let ersterZoom = true;

	onMount(async () => {
		// Leaflet erst im Browser laden – sonst bricht das SSR-Rendering.
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		karte = L.map(behaelter, { zoomControl: false }).setView([47.6503, 9.4797], 12);

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap'
		}).addTo(karte);
		L.control.zoom({ position: 'bottomright' }).addTo(karte);

		ebene = L.layerGroup().addTo(karte);
		zeichne();
	});

	onDestroy(() => karte?.remove());

	// Bei jedem neuen Datensatz neu zeichnen. Drei Punkte pro Fahrzeug sind
	// so wenig, dass komplettes Neuzeichnen billiger ist als Marker-Diffing.
	$effect(() => {
		void fahrzeuge;
		if (karte && ebene) zeichne();
	});

	function veraltet(f: Fahrzeug): boolean {
		const letzte = f.spur[0];
		if (!letzte) return true;
		return Date.now() - Date.parse(letzte.am) > VERALTET_NACH_MIN * 60_000;
	}

	function zeichne() {
		ebene.clearLayers();
		const grenzen: [number, number][] = [];

		for (const f of fahrzeuge) {
			if (f.spur.length === 0) continue;
			const alt = veraltet(f);
			const farbe = alt ? '#8A9AA8' : '#E30613';

			// Verbindungslinie durch die Spur – zeigt die Fahrtrichtung.
			if (f.spur.length > 1) {
				L.polyline(
					f.spur.map((p) => [p.lat, p.lng]),
					{ color: farbe, weight: 3, opacity: 0.45, dashArray: '6 6' }
				).addTo(ebene);
			}

			// Spurpunkte von hinten nach vorne, damit der aktuelle oben liegt.
			for (let i = f.spur.length - 1; i >= 0; i--) {
				const p = f.spur[i];
				const deckkraft = SPUR_DECKKRAFT[i] ?? 0.3;
				const aktuell = i === 0;
				grenzen.push([p.lat, p.lng]);

				if (aktuell) {
					L.marker([p.lat, p.lng], { icon: fahrzeugSymbol(f, farbe, alt) })
						.addTo(ebene)
						.bindPopup(popupText(f, p));
				} else {
					L.circleMarker([p.lat, p.lng], {
						radius: 7 - i * 1.5,
						color: farbe,
						weight: 2,
						fillColor: farbe,
						fillOpacity: deckkraft * 0.6,
						opacity: deckkraft
					}).addTo(ebene);
				}
			}
		}

		if (ersterZoom && grenzen.length > 0) {
			if (grenzen.length === 1) karte.setView(grenzen[0], 15);
			else karte.fitBounds(grenzen, { padding: [64, 64] });
			ersterZoom = false;
		}
	}

	/** Punkt plus Namensschild – der Name steht laut Datensatz am aktuellen Punkt. */
	function fahrzeugSymbol(f: Fahrzeug, farbe: string, alt: boolean) {
		const puls = alt ? '' : 'lebt';
		return L.divIcon({
			className: '',
			html: `<div class="marker">
				<span class="punkt ${puls}" style="background:${farbe}"></span>
				<span class="schild" style="border-color:${farbe}">${escape(f.name)}</span>
			</div>`,
			iconSize: [0, 0],
			iconAnchor: [0, 0]
		});
	}

	function popupText(f: Fahrzeug, p: Fahrzeug['spur'][0]): string {
		const zeit = new Date(p.am).toLocaleTimeString('de-DE');
		const zeilen = [`<b>${escape(f.name)}</b>`, `Stand ${zeit}`];
		if (p.speed !== null) zeilen.push(`${Math.round(p.speed)} km/h`);
		if (f.sats !== null) zeilen.push(`${f.sats} Satelliten`);
		if (f.batt !== null) zeilen.push(`Akku ${f.batt} %`);
		return zeilen.join('<br>');
	}

	function escape(text: string): string {
		return text.replace(
			/[&<>"]/g,
			(z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[z] ?? z
		);
	}
</script>

<div
	bind:this={behaelter}
	style:height={hoehe}
	class="w-full rounded-xl overflow-hidden bg-lvs-stahl"
></div>

<style>
	/* Nicht scoped, weil Leaflet die Marker außerhalb der Komponente einhängt. */
	:global(.marker) {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		transform: translate(-9px, -9px);
	}

	:global(.marker .punkt) {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 3px solid #0b1014;
		flex: none;
	}

	/* Der Puls markiert "Daten kommen gerade rein" – graue Marker pulsen nicht. */
	:global(.marker .punkt.lebt) {
		animation: trackerpuls 2s ease-out infinite;
	}

	@keyframes trackerpuls {
		0% {
			box-shadow: 0 0 0 0 rgb(227 6 19 / 55%);
		}
		70% {
			box-shadow: 0 0 0 16px rgb(227 6 19 / 0%);
		}
		100% {
			box-shadow: 0 0 0 0 rgb(227 6 19 / 0%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.marker .punkt.lebt) {
			animation: none;
		}
	}

	:global(.marker .schild) {
		background: #0b1014;
		color: #e6edf2;
		font:
			600 14px/1 'Barlow Condensed',
			sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 4px 8px;
		border-radius: 4px;
		border-left: 3px solid;
		white-space: nowrap;
	}
</style>