<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { RueckmeldungDto } from '$lib/types/lvs';

	/**
	 * Das Zeitband ist das Herzstück des Boards: eine Zeitachse von "jetzt" bis
	 * zur letzten erwarteten Ankunft. Jede Kraft ist ein Punkt, die Treppe darunter
	 * zeigt, wie viele Kräfte zu welchem Zeitpunkt vor Ort sind.
	 *
	 * Die eine Frage, die der Einsatzleiter wirklich hat, lautet:
	 * "Wann kann ich mit welcher Besatzung ausrücken?" – das steht hier.
	 */
	let { rueckmeldungen }: { rueckmeldungen: RueckmeldungDto[] } = $props();

	let jetzt = $state(Date.now());
	let uhr: ReturnType<typeof setInterval>;
	onMount(() => {
		uhr = setInterval(() => (jetzt = Date.now()), 1000);
	});
	onDestroy(() => clearInterval(uhr));

	const kommend = $derived(
		rueckmeldungen
			.filter((r) => r.antwort === 'kommt' && r.ankunftPrognose)
			.map((r) => ({
				name: r.name.split(' ').at(-1) ?? r.name,
				zeit: Date.parse(r.ankunftPrognose!),
				da: r.angekommenAm !== null
			}))
			.sort((a, b) => a.zeit - b.zeit)
	);

	/** Achse läuft immer bis mindestens 15 Minuten, damit sie nicht springt. */
	const spanne = $derived(
		Math.max(15 * 60_000, (kommend.at(-1)?.zeit ?? jetzt) - jetzt + 60_000)
	);
	const B = 1000;
	const H = 96;

	function x(zeit: number): number {
		return Math.max(0, Math.min(B, ((zeit - jetzt) / spanne) * B));
	}

	const bereitsDa = $derived(kommend.filter((k) => k.da || k.zeit <= jetzt).length);
	const marken = $derived(
		[5, 10, 15, 20, 30, 45, 60].filter((m) => m * 60_000 <= spanne).map((m) => ({
			m,
			x: x(jetzt + m * 60_000)
		}))
	);
</script>

<div class="lvs-panel p-4">
	<div class="flex items-baseline justify-between mb-3">
		<span class="lvs-label">Ankunft an der Wache</span>
		<span class="font-display text-lvs-eis">
			<span class="lvs-zahl text-3xl font-600 text-lvs-gruen">{bereitsDa}</span>
			<span class="text-lvs-grau text-sm"> von {kommend.length} eingetroffen</span>
		</span>
	</div>

	<svg viewBox="0 0 {B} {H}" class="w-full h-24" role="img" aria-label="Zeitachse der Ankünfte">
		<!-- Treppe: kumulierte Kräfte über die Zeit -->
		{#each kommend as k, i (k.name + k.zeit)}
			<rect
				x={x(k.zeit)}
				y={H - 22 - ((i + 1) / Math.max(1, kommend.length)) * 46}
				width={B - x(k.zeit)}
				height={((i + 1) / Math.max(1, kommend.length)) * 46}
				fill="#35B27A"
				opacity="0.13"
			/>
		{/each}

		<!-- Grundlinie -->
		<line x1="0" y1={H - 22} x2={B} y2={H - 22} stroke="#243342" stroke-width="2" />

		<!-- Minutenmarken -->
		{#each marken as mk (mk.m)}
			<line x1={mk.x} y1={H - 28} x2={mk.x} y2={H - 16} stroke="#243342" stroke-width="2" />
			<text
				x={mk.x}
				y={H - 4}
				fill="#8A9AA8"
				font-size="13"
				font-family="IBM Plex Mono, monospace"
				text-anchor="middle">+{mk.m}</text
			>
		{/each}

		<!-- Jetzt-Linie -->
		<line x1="1" y1="6" x2="1" y2={H - 16} stroke="#FFDD00" stroke-width="3" />

		<!-- Ankünfte -->
		{#each kommend as k (k.name + k.zeit)}
			<g transform="translate({x(k.zeit)}, 0)">
				<circle
					cx="0"
					cy={H - 22}
					r={k.da ? 7 : 5}
					fill={k.da ? '#35B27A' : '#0B1014'}
					stroke="#35B27A"
					stroke-width="2.5"
				/>
				<text
					x="0"
					y="18"
					fill="#E6EDF2"
					font-size="14"
					font-family="Barlow Condensed, sans-serif"
					text-anchor="middle"
					transform="rotate(-32, 0, 18)">{k.name}</text
				>
			</g>
		{/each}
	</svg>
</div>