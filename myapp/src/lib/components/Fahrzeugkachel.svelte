<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { FMS_STATUS, type FahrzeugDto, type FmsStatus } from '$lib/types/lvs';

	let {
		fahrzeug,
		einsatzId,
		bearbeitbar = false
	}: { fahrzeug: FahrzeugDto; einsatzId: string; bearbeitbar?: boolean } = $props();

	const FARBE: Record<FmsStatus, string> = {
		1: 'bg-lvs-gruen text-lvs-nacht',
		2: 'bg-lvs-gruen text-lvs-nacht',
		3: 'bg-lvs-gelb text-lvs-nacht',
		4: 'bg-lvs-wasser text-lvs-nacht',
		5: 'bg-lvs-eis text-lvs-nacht',
		6: 'bg-lvs-rot text-white'
	};

	let jetzt = $state(Date.now());
	let uhr: ReturnType<typeof setInterval>;
	onMount(() => {
		uhr = setInterval(() => (jetzt = Date.now()), 1000);
	});
	onDestroy(() => clearInterval(uhr));

	const seit = $derived(Math.floor((jetzt - Date.parse(fahrzeug.statusSeit)) / 1000));
	const seitText = $derived(
		`${String(Math.floor(seit / 60)).padStart(2, '0')}:${String(seit % 60).padStart(2, '0')}`
	);

	async function setze(status: FmsStatus) {
		await fetch(`/api/fahrzeug/${fahrzeug.id}/status`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ einsatzId, status })
		});
	}
</script>

<div class="lvs-panel p-3">
	<div class="flex items-center gap-3">
		<span
			class="w-11 h-11 rounded-lg flex items-center justify-center font-zahl text-2xl font-600 {FARBE[
				fahrzeug.status
			]}">{fahrzeug.status}</span
		>
		<span class="min-w-0 flex-1">
			<span class="font-display text-xl font-600 uppercase block truncate text-lvs-eis"
				>{fahrzeug.funkrufname}</span
			>
			<span class="text-xs text-lvs-grau">{FMS_STATUS[fahrzeug.status]} · <span class="lvs-zahl">{seitText}</span></span
			>
		</span>
	</div>

	{#if fahrzeug.fehlend.length > 0}
		<p class="mt-2 text-xs text-lvs-gelb">
			Besatzung unvollständig: {fahrzeug.fehlend.join(', ')}
		</p>
	{:else if fahrzeug.sollBesatzung.length > 0}
		<p class="mt-2 text-xs text-lvs-gruen">Besatzung steht</p>
	{/if}

	{#if bearbeitbar}
		<div class="mt-3 flex gap-1">
			{#each [2, 3, 4, 6] as s (s)}
				<button
					type="button"
					onclick={() => setze(s as FmsStatus)}
					class="flex-1 h-9 rounded font-zahl text-sm border border-lvs-kante
						{fahrzeug.status === s ? FARBE[s as FmsStatus] : 'text-lvs-grau hover:text-lvs-eis'}"
					aria-label={FMS_STATUS[s as FmsStatus]}>{s}</button
				>
			{/each}
		</div>
	{/if}
</div>