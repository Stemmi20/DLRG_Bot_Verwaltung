<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Fahrzeugkarte from '$lib/components/Fahrzeugkarte.svelte';
	import { trackerStream } from '$lib/stores/tracker';
	import { VERALTET_NACH_MIN, type Fahrzeug } from '$lib/types/tracker';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const strom = trackerStream(data.fahrzeuge);
	const fahrzeuge = $derived($strom.fahrzeuge);
	const verbunden = $derived($strom.verbunden);

	let jetzt = $state(Date.now());
	let uhr: ReturnType<typeof setInterval>;
	onMount(() => {
		uhr = setInterval(() => (jetzt = Date.now()), 1000);
	});
	onDestroy(() => clearInterval(uhr));

	function alter(f: Fahrzeug): string {
		const p = f.spur[0];
		if (!p) return '–';
		const sek = Math.max(0, Math.floor((jetzt - Date.parse(p.am)) / 1000));
		if (sek < 60) return `${sek} s`;
		const min = Math.floor(sek / 60);
		if (min < 60) return `${min} min`;
		return `${Math.floor(min / 60)} h`;
	}

	function istVeraltet(f: Fahrzeug): boolean {
		const p = f.spur[0];
		return !p || jetzt - Date.parse(p.am) > VERALTET_NACH_MIN * 60_000;
	}
</script>

<svelte:head><title>Fahrzeugkarte</title></svelte:head>

<div class="h-dvh bg-lvs-nacht text-lvs-eis font-body flex flex-col p-4 gap-4">
	<header class="flex items-baseline gap-4 flex-none">
		<h1 class="font-display font-700 text-4xl uppercase leading-none">Fahrzeuge</h1>
		<span class="ml-auto flex items-center gap-2 text-sm text-lvs-grau">
			<span
				class="w-2.5 h-2.5 rounded-full {verbunden ? 'bg-lvs-gruen' : 'bg-lvs-rot'}"
				title={verbunden ? 'Live verbunden' : 'Verbindung unterbrochen'}
			></span>
			{verbunden ? 'Live' : 'Getrennt'}
		</span>
	</header>

	<div class="flex-1 min-h-0 grid gap-4 lg:grid-cols-[1fr_280px]">
		<Fahrzeugkarte {fahrzeuge} />

		<aside class="lvs-panel overflow-y-auto">
			{#if fahrzeuge.length === 0}
				<div class="p-4 text-sm text-lvs-grau">
					<p class="font-600 text-lvs-eis mb-1">Noch keine Position empfangen</p>
					<p>
						Sobald der Tracker etwas auf <span class="lvs-zahl">tracker/+/position</span> sendet,
						erscheint er hier und auf der Karte.
					</p>
				</div>
			{:else}
				<ul class="divide-y divide-lvs-kante">
					{#each fahrzeuge as f (f.id)}
						{@const alt = istVeraltet(f)}
						<li class="px-4 py-3">
							<div class="flex items-center gap-2">
								<span
									class="w-2.5 h-2.5 rounded-full flex-none {alt ? 'bg-lvs-grau' : 'bg-lvs-rot'}"
								></span>
								<span class="font-display text-lg uppercase truncate flex-1">{f.name}</span>
								<span class="lvs-zahl text-sm {alt ? 'text-lvs-grau' : 'text-lvs-gruen'}"
									>{alter(f)}</span
								>
							</div>
							<div class="mt-1 text-xs text-lvs-grau lvs-zahl flex flex-wrap gap-x-3">
								{#if f.spur[0]}
									<span>{f.spur[0].lat.toFixed(5)}, {f.spur[0].lng.toFixed(5)}</span>
								{/if}
								{#if f.spur[0]?.speed !== null && f.spur[0]?.speed !== undefined}
									<span>{Math.round(f.spur[0].speed)} km/h</span>
								{/if}
								{#if f.sats !== null}<span>{f.sats} Sat</span>{/if}
								{#if f.batt !== null}<span>{f.batt} %</span>{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</aside>
	</div>
</div>