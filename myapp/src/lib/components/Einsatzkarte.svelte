<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Einsatzort, Standort } from '$lib/types/lvs';

	let {
		einsatzort,
		standorte = [],
		hoehe = '100%'
	}: { einsatzort: Einsatzort; standorte?: Standort[]; hoehe?: string } = $props();

	let behaelter: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let karte: any = null;

	onMount(async () => {
		// Leaflet erst im Browser laden – sonst bricht das SSR-Rendering.
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		const mitte: [number, number] =
			einsatzort.lat && einsatzort.lng
				? [einsatzort.lat, einsatzort.lng]
				: [standorte[0]?.lat ?? 47.6503, standorte[0]?.lng ?? 9.4797]; // Friedrichshafen

		karte = L.map(behaelter, { zoomControl: false, attributionControl: true }).setView(mitte, 14);

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap'
		}).addTo(karte);
		L.control.zoom({ position: 'bottomright' }).addTo(karte);

		const punkt = (farbe: string, beschriftung: string) =>
			L.divIcon({
				className: '',
				html: `<span style="display:flex;width:26px;height:26px;border-radius:50%;
					background:${farbe};border:3px solid #0B1014;box-shadow:0 0 0 2px ${farbe}55;
					align-items:center;justify-content:center;font:600 12px 'IBM Plex Sans',sans-serif;
					color:#0B1014">${beschriftung}</span>`,
				iconSize: [26, 26],
				iconAnchor: [13, 13]
			});

		const grenzen: [number, number][] = [];

		if (einsatzort.lat && einsatzort.lng) {
			L.marker([einsatzort.lat, einsatzort.lng], { icon: punkt('#E30613', '!') })
				.addTo(karte)
				.bindPopup(`<b>${einsatzort.strasse}</b><br>${einsatzort.plz} ${einsatzort.ort}`);
			grenzen.push([einsatzort.lat, einsatzort.lng]);
		}

		for (const s of standorte) {
			L.marker([s.lat, s.lng], { icon: punkt('#0090D4', 'W') }).addTo(karte).bindPopup(s.name);
			grenzen.push([s.lat, s.lng]);
		}

		if (grenzen.length > 1) karte.fitBounds(grenzen, { padding: [48, 48] });
	});

	onDestroy(() => karte?.remove());
</script>

<div bind:this={behaelter} style:height={hoehe} class="w-full rounded-xl overflow-hidden bg-lvs-stahl"></div>