<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let typ = $state<'einsatz' | 'probealarm'>('probealarm');
	let stichwort = $state('');
	let meldebild = $state('');
	let strasse = $state('');
	let plz = $state('');
	let ort = $state('');
	let hinweis = $state('');
	let lat = $state<string>('');
	let lng = $state<string>('');
	let ortsgruppenIds = $state<string[]>([]);
	let fahrzeugIds = $state<string[]>([]);
	let sendet = $state(false);
	let fehler = $state<string | null>(null);

	const fahrzeugAuswahl = $derived(
		data.fahrzeuge.filter(
			(f) => ortsgruppenIds.length === 0 || ortsgruppenIds.includes(f.ortsgruppeId)
		)
	);

	function umschalten(liste: string[], id: string): string[] {
		return liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id];
	}

	async function ausloesen() {
		fehler = null;
		if (!stichwort.trim()) return (fehler = 'Stichwort fehlt.');
		if (ortsgruppenIds.length === 0) return (fehler = 'Wähle mindestens eine Ortsgruppe.');
		if (typ === 'einsatz' && !confirm(`SCHARFEN Alarm "${stichwort}" auslösen?`)) return;

		sendet = true;
		try {
			const res = await fetch('/api/alarm', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					typ,
					stichwort,
					meldebild,
					einsatzort: {
						strasse,
						plz,
						ort,
						hinweis,
						lat: lat ? Number(lat) : null,
						lng: lng ? Number(lng) : null
					},
					ortsgruppenIds,
					fahrzeugIds,
					scope: 'alle'
				})
			});
			if (!res.ok) throw new Error();
			const { einsatzId } = await res.json();
			await goto(`/board/${einsatzId}`);
		} catch {
			fehler = 'Alarm konnte nicht ausgelöst werden. Bitte erneut versuchen.';
		} finally {
			sendet = false;
		}
	}
</script>

<svelte:head><title>Alarm auslösen</title></svelte:head>

<div class="min-h-dvh bg-lvs-nacht text-lvs-eis font-body p-4 lg:p-8">
	<div class="max-w-3xl mx-auto grid gap-5">
		<h1 class="font-display font-700 text-4xl uppercase">Alarm auslösen</h1>

		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={() => (typ = 'probealarm')}
				class="lvs-taste {typ === 'probealarm'
					? 'bg-lvs-gelb text-lvs-nacht'
					: 'bg-lvs-stahl border border-lvs-kante'}">Probealarm</button
			>
			<button
				type="button"
				onclick={() => (typ = 'einsatz')}
				class="lvs-taste {typ === 'einsatz'
					? 'bg-lvs-rot text-white'
					: 'bg-lvs-stahl border border-lvs-kante'}">Scharfer Alarm</button
			>
		</div>

		<div class="lvs-panel p-4 grid gap-3">
			<label class="grid gap-1">
				<span class="lvs-label">Stichwort</span>
				<input
					bind:value={stichwort}
					placeholder="WASSER 3"
					class="bg-lvs-nacht border border-lvs-kante rounded-lg px-3 h-12 font-display text-2xl uppercase"
				/>
			</label>
			<label class="grid gap-1">
				<span class="lvs-label">Meldebild</span>
				<input
					bind:value={meldebild}
					placeholder="Person im Wasser, Uferbereich"
					class="bg-lvs-nacht border border-lvs-kante rounded-lg px-3 h-12"
				/>
			</label>
		</div>

		<div class="lvs-panel p-4 grid gap-3 sm:grid-cols-2">
			<label class="grid gap-1 sm:col-span-2">
				<span class="lvs-label">Straße</span>
				<input bind:value={strasse} class="bg-lvs-nacht border border-lvs-kante rounded-lg px-3 h-12" />
			</label>
			<label class="grid gap-1">
				<span class="lvs-label">PLZ</span>
				<input bind:value={plz} class="bg-lvs-nacht border border-lvs-kante rounded-lg px-3 h-12" />
			</label>
			<label class="grid gap-1">
				<span class="lvs-label">Ort</span>
				<input bind:value={ort} class="bg-lvs-nacht border border-lvs-kante rounded-lg px-3 h-12" />
			</label>
			<label class="grid gap-1">
				<span class="lvs-label">Breitengrad</span>
				<input bind:value={lat} inputmode="decimal" placeholder="47.6503" class="bg-lvs-nacht border border-lvs-kante rounded-lg px-3 h-12 lvs-zahl" />
			</label>
			<label class="grid gap-1">
				<span class="lvs-label">Längengrad</span>
				<input bind:value={lng} inputmode="decimal" placeholder="9.4797" class="bg-lvs-nacht border border-lvs-kante rounded-lg px-3 h-12 lvs-zahl" />
			</label>
			<label class="grid gap-1 sm:col-span-2">
				<span class="lvs-label">Hinweis</span>
				<input bind:value={hinweis} placeholder="Zufahrt über Uferpromenade" class="bg-lvs-nacht border border-lvs-kante rounded-lg px-3 h-12" />
			</label>
		</div>

		<div class="lvs-panel p-4">
			<span class="lvs-label block mb-2">Ortsgruppen</span>
			<div class="flex flex-wrap gap-2">
				{#each data.ortsgruppen as og (og.id)}
					<button
						type="button"
						onclick={() => (ortsgruppenIds = umschalten(ortsgruppenIds, og.id))}
						class="lvs-taste px-4 text-base {ortsgruppenIds.includes(og.id)
							? 'bg-lvs-wasser text-lvs-nacht'
							: 'bg-lvs-nacht border border-lvs-kante'}">{og.name}</button
					>
				{/each}
			</div>
		</div>

		{#if fahrzeugAuswahl.length}
			<div class="lvs-panel p-4">
				<span class="lvs-label block mb-2">Fahrzeuge alarmieren</span>
				<div class="flex flex-wrap gap-2">
					{#each fahrzeugAuswahl as f (f.id)}
						<button
							type="button"
							onclick={() => (fahrzeugIds = umschalten(fahrzeugIds, f.id))}
							class="lvs-taste px-4 text-base {fahrzeugIds.includes(f.id)
								? 'bg-lvs-wasser text-lvs-nacht'
								: 'bg-lvs-nacht border border-lvs-kante'}">{f.funkrufname}</button
						>
					{/each}
				</div>
			</div>
		{/if}

		{#if fehler}<p class="text-lvs-gelb">{fehler}</p>{/if}

		<p class="text-sm text-lvs-grau">
			{data.erreichbar} von {data.gesamt} Personen haben die Alarmierung auf mindestens einem Gerät
			eingerichtet.
		</p>

		<button
			type="button"
			disabled={sendet}
			onclick={ausloesen}
			class="lvs-taste h-16 text-2xl {typ === 'einsatz'
				? 'bg-lvs-rot text-white'
				: 'bg-lvs-gelb text-lvs-nacht'}"
		>
			{sendet ? 'Wird ausgelöst …' : typ === 'einsatz' ? 'Alarm auslösen' : 'Probealarm auslösen'}
		</button>
	</div>
</div>
