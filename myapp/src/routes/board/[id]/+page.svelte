<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Zeitband from '$lib/components/Zeitband.svelte';
	import Einsatzkarte from '$lib/components/Einsatzkarte.svelte';
	import Fahrzeugkachel from '$lib/components/Fahrzeugkachel.svelte';
	import { einsatzStream } from '$lib/stores/einsatz';
	import type { RueckmeldungDto } from '$lib/types/lvs';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const strom = einsatzStream(data.board.einsatz.id, data.board);
	const b = $derived($strom.board ?? data.board);
	const verbunden = $derived($strom.verbunden);

	let jetzt = $state(Date.now());
	let uhr: ReturnType<typeof setInterval>;
	onMount(() => {
		uhr = setInterval(() => (jetzt = Date.now()), 1000);
	});
	onDestroy(() => clearInterval(uhr));

	const seitAlarm = $derived(Math.floor((jetzt - Date.parse(b.einsatz.alarmzeit)) / 1000));
	const seitAlarmText = $derived(
		`${String(Math.floor(seitAlarm / 60)).padStart(2, '0')}:${String(seitAlarm % 60).padStart(2, '0')}`
	);

	const kommend = $derived(b.rueckmeldungen.filter((r) => r.antwort === 'kommt'));
	const absagen = $derived(b.rueckmeldungen.filter((r) => r.antwort !== 'kommt'));
	const alleStandorte = $derived(b.einsatz.ortsgruppen.flatMap((og) => og.standorte));

	/** Nach Standort gruppieren – bei zwei Ortsgruppen ist genau das die Frage. */
	const nachStandort = $derived.by(() => {
		const gruppen = new Map<string, RueckmeldungDto[]>();
		for (const r of kommend) {
			const schluessel = r.standortName ?? 'Ohne Angabe';
			gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), r]);
		}
		return [...gruppen.entries()].sort((a, b) => b[1].length - a[1].length);
	});

	function restzeit(r: RueckmeldungDto): string {
		if (r.angekommenAm) return 'da';
		if (!r.ankunftPrognose) return '–';
		const sek = Math.round((Date.parse(r.ankunftPrognose) - jetzt) / 1000);
		if (sek <= 0) return 'fällig';
		return `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
	}

	async function beenden() {
		if (!confirm('Einsatz beenden? Rückmeldungen sind danach gesperrt.')) return;
		await fetch(`/api/alarm/${b.einsatz.id}/beenden`, { method: 'POST' });
	}
</script>

<svelte:head><title>Board · {b.einsatz.stichwort}</title></svelte:head>

<div class="min-h-dvh bg-lvs-nacht text-lvs-eis font-body p-4 lg:p-6">
	<header class="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-5">
		<h1 class="font-display font-700 text-5xl uppercase leading-none">{b.einsatz.stichwort}</h1>
		<span class="lvs-zahl text-4xl font-600 text-lvs-gelb">{seitAlarmText}</span>
		<span class="text-lvs-grau">
			{b.einsatz.einsatzort.strasse}, {b.einsatz.einsatzort.ort}
			{#if b.einsatz.typ !== 'einsatz'}
				<span class="ml-3 px-2 py-0.5 rounded bg-lvs-gelb text-lvs-nacht text-xs font-600 uppercase"
					>Probe</span
				>
			{/if}
		</span>

		<span class="ml-auto flex items-center gap-3">
			<span
				class="w-2.5 h-2.5 rounded-full {verbunden ? 'bg-lvs-gruen' : 'bg-lvs-rot'}"
				title={verbunden ? 'Live verbunden' : 'Verbindung unterbrochen'}
			></span>
			{#if data.darfSteuern && b.einsatz.status === 'laufend'}
				<button type="button" onclick={beenden} class="lvs-taste bg-lvs-stahl border border-lvs-kante text-sm"
					>Einsatz beenden</button
				>
			{/if}
		</span>
	</header>

	<!-- Zählerleiste: die vier Zahlen, die während des Alarms zählen -->
	<div class="grid grid-cols-4 gap-3 mb-4">
		{#each [['Kommen', b.zaehler.kommt, 'text-lvs-gruen'], ['Später', b.zaehler.spaeter, 'text-lvs-gelb'], ['Nicht verfügbar', b.zaehler.kommtNicht, 'text-lvs-rot'], ['Keine Antwort', b.zaehler.offen, 'text-lvs-grau']] as [titel, wert, farbe] (titel)}
			<div class="lvs-panel px-4 py-3">
				<span class="lvs-label block">{titel}</span>
				<span class="lvs-zahl text-4xl font-600 {farbe}">{wert}</span>
			</div>
		{/each}
	</div>

	<div class="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
		<div class="grid gap-4 content-start">
			<Zeitband rueckmeldungen={b.rueckmeldungen} />

			{#each nachStandort as [standort, leute] (standort)}
				<section class="lvs-panel overflow-hidden">
					<h2 class="px-4 py-2 bg-lvs-kante/40 font-display text-lg uppercase tracking-wide">
						{standort}
						<span class="lvs-zahl text-lvs-gruen ml-2">{leute.length}</span>
					</h2>
					<ul class="divide-y divide-lvs-kante">
						{#each leute as r (r.userId)}
							<li class="px-4 py-2.5 flex items-center gap-3">
								<span class="flex-1 min-w-0">
									<span class="block truncate">{r.name}</span>
									{#if r.qualifikationen.length}
										<span class="text-xs text-lvs-grau">{r.qualifikationen.join(' · ')}</span>
									{/if}
								</span>
								<span
									class="lvs-zahl text-2xl font-600 {r.angekommenAm
										? 'text-lvs-gruen'
										: 'text-lvs-eis'}">{restzeit(r)}</span
								>
							</li>
						{/each}
					</ul>
				</section>
			{/each}

			{#if absagen.length || b.offen.length}
				<section class="lvs-panel p-4 text-sm">
					{#if absagen.length}
						<span class="lvs-label block mb-1">Abgesagt</span>
						<p class="text-lvs-grau mb-3">{absagen.map((r) => r.name).join(', ')}</p>
					{/if}
					{#if b.offen.length}
						<span class="lvs-label block mb-1">Noch keine Antwort</span>
						<p class="text-lvs-grau">{b.offen.map((o) => o.name).join(', ')}</p>
					{/if}
				</section>
			{/if}
		</div>

		<div class="grid gap-4 content-start">
			<Einsatzkarte einsatzort={b.einsatz.einsatzort} standorte={alleStandorte} hoehe="420px" />

			{#if b.fahrzeuge.length}
				<div>
					<span class="lvs-label block mb-2">Alarmierte Fahrzeuge</span>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each b.fahrzeuge as f (f.id)}
							<Fahrzeugkachel
								fahrzeug={f}
								einsatzId={b.einsatz.id}
								bearbeitbar={data.darfSteuern}
							/>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
