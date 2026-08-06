<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ETA_OPTIONEN, type Antwort, type EtaMinuten } from '$lib/types/lvs';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const einsatz = data.board.einsatz;
	const probe = einsatz.typ !== 'einsatz';

	let antwort = $state<Antwort | null>(data.meineRueckmeldung?.antwort ?? null);
	let eta = $state<EtaMinuten | null>(data.meineRueckmeldung?.etaMinuten ?? null);
	let standortId = $state<string | null>(
		data.meineRueckmeldung?.standortId ?? data.standardStandortId
	);
	let sendet = $state(false);
	let fehler = $state<string | null>(null);
	let gespeichertUm = $state<string | null>(data.meineRueckmeldung?.eingegangenAm ?? null);

	// Laufende Uhr seit Alarmierung – der erste Blick gilt immer der Zeit.
	let jetzt = $state(Date.now());
	let uhr: ReturnType<typeof setInterval>;
	onMount(() => {
		uhr = setInterval(() => (jetzt = Date.now()), 1000);
	});
	onDestroy(() => clearInterval(uhr));

	const seitAlarm = $derived(Math.max(0, Math.floor((jetzt - Date.parse(einsatz.alarmzeit)) / 1000)));
	const seitAlarmText = $derived(
		`${String(Math.floor(seitAlarm / 60)).padStart(2, '0')}:${String(seitAlarm % 60).padStart(2, '0')}`
	);

	const gewaehlterStandort = $derived(
		data.meineOrtsgruppen.flatMap((og) => og.standorte).find((s) => s.id === standortId) ?? null
	);

	const kartenLink = $derived(
		einsatz.einsatzort.lat && einsatz.einsatzort.lng
			? `geo:${einsatz.einsatzort.lat},${einsatz.einsatzort.lng}?q=${einsatz.einsatzort.lat},${einsatz.einsatzort.lng}`
			: `geo:0,0?q=${encodeURIComponent(
					`${einsatz.einsatzort.strasse}, ${einsatz.einsatzort.plz} ${einsatz.einsatzort.ort}`
				)}`
	);

	async function melde(gewaehlt: Antwort, minuten: EtaMinuten | null = null) {
		fehler = null;

		if (gewaehlt === 'kommt' && minuten === null) {
			// Erst die ETA-Auswahl aufklappen, noch nichts senden.
			antwort = 'kommt';
			return;
		}
		if (gewaehlt === 'kommt' && data.mussStandortWaehlen && !standortId) {
			fehler = 'Wähle zuerst den Standort, zu dem du kommst.';
			return;
		}

		sendet = true;
		const ortsgruppeId =
			data.meineOrtsgruppen.find((og) => og.standorte.some((s) => s.id === standortId))?.id ?? null;

		try {
			const res = await fetch(`/api/alarm/${einsatz.id}/rueckmeldung`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					antwort: gewaehlt,
					etaMinuten: minuten ?? undefined,
					standortId,
					ortsgruppeId
				})
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Fehlgeschlagen');

			antwort = gewaehlt;
			eta = minuten;
			gespeichertUm = new Date().toISOString();
			if (navigator.vibrate) navigator.vibrate(40);
		} catch {
			fehler = 'Rückmeldung konnte nicht gesendet werden. Sie wird automatisch nachgeholt.';
		} finally {
			sendet = false;
		}
	}

	function uhrzeit(iso: string): string {
		return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>{einsatz.stichwort} · Alarm</title>
	<meta name="theme-color" content={probe ? '#16202A' : '#E30613'} />
</svelte:head>

<div class="min-h-dvh bg-lvs-nacht text-lvs-eis font-body flex flex-col">
	<!-- Kopf: Stichwort und Laufzeit. Bei scharfem Alarm rot, bei Probe neutral. -->
	<header
		class="px-5 pt-5 pb-4 {probe ? 'bg-lvs-stahl border-b-3 border-lvs-gelb' : 'bg-lvs-rot alarmpuls'}"
	>
		<div class="flex items-baseline justify-between">
			<span class="lvs-label {probe ? 'text-lvs-gelb' : 'text-white/75'}">
				{probe ? 'Probealarm' : 'Alarm'} · {uhrzeit(einsatz.alarmzeit)}
			</span>
			<span class="lvs-zahl text-xl font-600">{seitAlarmText}</span>
		</div>
		<h1 class="font-display font-700 text-4xl leading-none uppercase mt-2">{einsatz.stichwort}</h1>
		{#if einsatz.meldebild}
			<p class="mt-1 text-base {probe ? 'text-lvs-grau' : 'text-white/90'}">{einsatz.meldebild}</p>
		{/if}
	</header>

	<!-- Einsatzort. Tippen öffnet die Navigations-App des Geräts. -->
	
		href={kartenLink}
		class="mx-4 mt-4 lvs-panel px-4 py-3 flex items-center justify-between no-underline text-lvs-eis"
	<a>
		<span>
			<span class="lvs-label block">Einsatzort</span>
			<span class="font-display text-2xl font-600">{einsatz.einsatzort.strasse}</span>
			<span class="block text-lvs-grau text-sm">
				{einsatz.einsatzort.plz}
				{einsatz.einsatzort.ort}
				{#if einsatz.einsatzort.hinweis}· {einsatz.einsatzort.hinweis}{/if}
			</span>
		</span>
		<span class="i-carbon-direction-straight-right text-2xl text-lvs-wasser" aria-hidden="true"
		></span>
	</a>

	<div class="flex-1"></div>

	<!-- Rückmeldung. Alles im Daumenbereich, drei Ziele, keine Verschachtelung. -->
	<section class="px-4 pb-6 pt-4">
		{#if gespeichertUm && antwort}
			<p class="lvs-label mb-3 text-center">
				Gemeldet um {uhrzeit(gespeichertUm)}
				{#if antwort === 'kommt' && eta}· in {eta} Minuten da{/if}
				{#if gewaehlterStandort}· {gewaehlterStandort.name}{/if}
				· Änderung jederzeit möglich
			</p>
		{/if}

		{#if fehler}
			<p class="mb-3 text-sm text-lvs-gelb text-center">{fehler}</p>
		{/if}

		{#if data.mussStandortWaehlen && antwort !== 'kommt_nicht'}
			<div class="mb-4">
				<span class="lvs-label block mb-2">Zu welchem Standort kommst du?</span>
				<div class="grid gap-2">
					{#each data.meineOrtsgruppen as og (og.id)}
						{#each og.standorte as s (s.id)}
							<button
								type="button"
								onclick={() => (standortId = s.id)}
								class="lvs-taste justify-start text-base
									{standortId === s.id
									? 'bg-lvs-wasser text-lvs-nacht'
									: 'bg-lvs-stahl text-lvs-eis border border-lvs-kante'}"
							>
								{og.kuerzel} · {s.name}
							</button>
						{/each}
					{/each}
				</div>
			</div>
		{/if}

		{#if antwort === 'kommt'}
			<span class="lvs-label block mb-2">In wie vielen Minuten bist du an der Wache?</span>
			<div class="grid grid-cols-3 gap-2 mb-4">
				{#each ETA_OPTIONEN as minuten (minuten)}
					<button
						type="button"
						disabled={sendet}
						onclick={() => melde('kommt', minuten)}
						class="lvs-taste text-2xl
							{eta === minuten ? 'bg-lvs-gruen text-lvs-nacht' : 'bg-lvs-stahl border border-lvs-kante'}"
					>
						<span class="lvs-zahl">{minuten}</span>
						<span class="text-sm font-400 normal-case">min</span>
					</button>
				{/each}
			</div>
		{/if}

		<div class="grid gap-2">
			<button
				type="button"
				disabled={sendet}
				onclick={() => melde('kommt')}
				class="lvs-taste text-xl {antwort === 'kommt'
					? 'bg-lvs-gruen text-lvs-nacht'
					: 'bg-lvs-gruen/15 text-lvs-gruen border-2 border-lvs-gruen'}"
			>
				Ich komme
			</button>

			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					disabled={sendet}
					onclick={() => melde('spaeter')}
					class="lvs-taste text-base {antwort === 'spaeter'
						? 'bg-lvs-gelb text-lvs-nacht'
						: 'bg-lvs-stahl border border-lvs-kante'}"
				>
					Später
				</button>
				<button
					type="button"
					disabled={sendet}
					onclick={() => melde('kommt_nicht')}
					class="lvs-taste text-base {antwort === 'kommt_nicht'
						? 'bg-lvs-rot text-white'
						: 'bg-lvs-stahl border border-lvs-kante'}"
				>
					Nicht verfügbar
				</button>
			</div>
		</div>

		{#if antwort === 'kommt'}
			<button
				type="button"
				onclick={async () => {
					await fetch(`/api/alarm/${einsatz.id}/rueckmeldung`, {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ angekommen: true })
					});
				}}
				class="lvs-taste w-full mt-2 bg-transparent border border-lvs-kante text-lvs-grau text-base"
			>
				Ich bin an der Wache
			</button>
		{/if}
	</section>
</div>

<style>
	/* Der Puls ist der einzige Effekt auf der Seite – er markiert "läuft gerade". */
	.alarmpuls {
		animation: puls 2.4s ease-in-out infinite;
	}
	@keyframes puls {
		0%,
		100% {
			background-color: #e30613;
		}
		50% {
			background-color: #b8050f;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.alarmpuls {
			animation: none;
		}
	}
</style>