<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let erzeugt = $state(false);
	let fehler = $state<string | null>(null);
	/** ID, mit der die Links zu Alarmseite und Board funktionieren. */
	let testId = $state<string | null>(null);

	const einsatzId = $derived(testId ?? data.laufendId ?? data.letzte[0]?.id ?? null);

	/**
	 * Ohne Einsatz keine [id] – deshalb hier ein Knopf, der einen Eigentest
	 * anlegt. Der geht ausschließlich an dich selbst, niemand sonst merkt etwas.
	 */
	async function testeinsatz() {
		erzeugt = true;
		fehler = null;
		try {
			const res = await fetch('/api/alarm', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					typ: 'eigentest',
					stichwort: 'WASSER 3',
					meldebild: 'Person im Wasser, Uferbereich – Testeinsatz',
					einsatzort: {
						strasse: 'Uferpromenade 4',
						plz: '88045',
						ort: 'Friedrichshafen',
						hinweis: 'Zufahrt über Hafenbahnhof',
						lat: 47.6503,
						lng: 9.4797,
					},
					ortsgruppenIds: [],
					fahrzeugIds: [],
					scope: 'self',
				}),
			});
			if (!res.ok) throw new Error();
			testId = (await res.json()).einsatzId;
		} catch {
			fehler = 'Testeinsatz konnte nicht angelegt werden.';
		} finally {
			erzeugt = false;
		}
	}

	function zeit(iso: string): string {
		return new Date(iso).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	}
</script>

<svelte:head><title>Alarmierung – Übersicht</title></svelte:head>

<div class="min-h-dvh bg-lvs-nacht text-lvs-eis font-body p-4 lg:p-8">
	<div class="max-w-4xl mx-auto grid gap-6 ">
		<div class="lvs-panel p-4 grid gap-3 bg-lvs-rot">
			<span>
				<span class="font-display text-2xl font-600 uppercase block flex justify-center">Einsatz</span>
			</span>
		</div>
		<!-- Läuft gerade etwas? Dann ist das die einzige Information, die zählt. -->
		{#if data.laufendId}
			<a
				href="/alarm/{data.laufendId}"
				class="block bg-lvs-rot rounded-xl px-5 py-4 no-underline text-white alarmpuls"
			>
				<span class="lvs-label text-white/75 block">Einsatz läuft</span>
				<span class="font-display text-3xl font-700 uppercase">Jetzt zurückmelden</span>
			</a>
		{/if}

		{#if !data.alarmierungEingerichtet}
			<a
				href="/einstellungen/alarmierung"
				class="lvs-panel border-lvs-gelb px-5 py-4 flex items-center justify-between no-underline text-lvs-eis"
			>
				<span>
					<span class="font-600 block">Alarmierung ist noch nicht eingerichtet</span>
					<span class="text-sm text-lvs-grau">Auf diesem Gerät kommt bisher kein Alarm an.</span>
				</span>
				<span class="font-display uppercase text-lvs-gelb">Einrichten</span>
			</a>
		{/if}

		<!-- Alles zum Durchklicken -->
		<nav class="grid gap-3 sm:grid-cols-2">
			<a
				href="/einstellungen/alarmierung"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Meine Alarmierung</span>
				<span class="text-sm text-lvs-grau">
					Geräte, Standardstandort{data.mehrereOrtsgruppen ? ' je Ortsgruppe' : ''}, Abwesenheit,
					Testalarm an dich selbst
				</span>
			</a>

			{#if data.istAdmin}
				<a
					href="/admin/alarm/neu"
					class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-rot transition-colors"
				>
					<span class="font-display text-2xl font-600 uppercase block">Alarm auslösen</span>
					<span class="text-sm text-lvs-grau">Probealarm oder scharfer Alarm für die Ortsgruppen</span>
				</a>
			{/if}

			<a
				href={einsatzId ? `/alarm/${einsatzId}` : '#'}
				aria-disabled={!einsatzId}
				class="lvs-panel p-4 no-underline text-lvs-eis transition-colors
					{einsatzId ? 'hover:border-lvs-gruen' : 'opacity-40 pointer-events-none'}"
			>
				<span class="font-display text-2xl font-600 uppercase block">Alarmseite</span>
				<span class="text-sm text-lvs-grau">Rückmeldung mit Ankunftszeit, für das Handy gebaut</span>
			</a>

			{#if data.darfBoard}
				<a
					href={einsatzId ? `/board/${einsatzId}` : '#'}
					aria-disabled={!einsatzId}
					class="lvs-panel p-4 no-underline text-lvs-eis transition-colors
						{einsatzId ? 'hover:border-lvs-wasser' : 'opacity-40 pointer-events-none'}"
				>
					<span class="font-display text-2xl font-600 uppercase block">Übersichtsboard</span>
					<span class="text-sm text-lvs-grau"> Rückmeldungen, Zeitband, Karte und Fahrzeugstatus </span>
				</a>
			{/if}

			<a
				href="/rescue-connect"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Rescue Connect</span>
				<span class="text-sm text-lvs-grau">Bestehender Bereich</span>
			</a>
		</nav>

		{#if !einsatzId}
			<div class="lvs-panel p-4 grid gap-3">
				<span>
					<span class="font-600 block">Noch kein Einsatz vorhanden</span>
					<span class="text-sm text-lvs-grau">
						Alarmseite und Board brauchen einen Einsatz. Der Testeinsatz geht nur an dich – sonst bekommt
						niemand etwas mit.
					</span>
				</span>
				<button
					type="button"
					disabled={erzeugt}
					onclick={testeinsatz}
					class="lvs-taste bg-lvs-gelb text-lvs-nacht"
				>
					{erzeugt ? 'Wird angelegt …' : 'Testeinsatz anlegen'}
				</button>
				{#if fehler}<p class="text-sm text-lvs-gelb">{fehler}</p>{/if}
			</div>
		{:else if testId}
			<p class="text-sm text-lvs-grau">
				Testeinsatz angelegt – Alarmseite und Board zeigen ihn jetzt an.
				<button
					type="button"
					onclick={() => goto(`/board/${testId}`)}
					class="underline text-lvs-wasser bg-transparent border-0 cursor-pointer p-0"
					>Direkt zum Board</button
				>
			</p>
		{/if}

		{#if data.letzte.length}
			<section class="lvs-panel overflow-hidden">
				<h2 class="px-4 py-2 bg-lvs-kante/40 font-display text-lg uppercase tracking-wide">
					Letzte Alarmierungen
				</h2>
				<ul class="divide-y divide-lvs-kante">
					{#each data.letzte as e (e.id)}
						<li class="flex items-center gap-3 px-4 py-2.5">
							<span class="flex-1 min-w-0">
								<span class="font-display text-lg uppercase block truncate">
									{e.stichwort}
									{#if e.typ !== 'einsatz'}
										<span class="ml-2 text-xs text-lvs-gelb normal-case font-body">Probe</span>
									{/if}
								</span>
								<span class="text-xs text-lvs-grau lvs-zahl">{zeit(e.alarmzeit)}</span>
								{#if e.ort}<span class="text-xs text-lvs-grau"> · {e.ort}</span>{/if}
							</span>
							<a href="/alarm/{e.id}" class="text-sm text-lvs-wasser no-underline">Alarm</a>
							{#if data.darfBoard}
								<a href="/board/{e.id}" class="text-sm text-lvs-wasser no-underline">Board</a>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		<div class="lvs-panel p-4 grid gap-3 bg-lvs-wasser">
			<span>
				<span class="font-display text-2xl font-600 uppercase block flex justify-center"
					>Verwaltung</span
				>
			</span>
		</div>
		<nav class="grid gap-3 sm:grid-cols-2">
			<a
				href="/boteinsatzgruppe"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Verwaltung Einsatzgruppe</span>
				<span class="text-sm text-lvs-grau">Verwaltung von Quallifikationen und Rollen</span>
			</a>
			<a
				href="/aufgaben"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">RWS Aufgaben</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
			<a
				href="/botevd"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Verwaltung EvD</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
			<a
				href="/botrws"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Verwaltung RWS</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
		</nav>
		<div class="lvs-panel p-4 grid gap-3 bg-green-9">
			<span>
				<span class="font-display text-2xl font-600 uppercase block flex justify-center"
					>Ausbildung</span
				>
			</span>
		</div>
		<nav class="grid gap-3 sm:grid-cols-2">
			<a
				href="/bfausb"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Bootsführer Ausbildung</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
			<a
				href="/kfausb"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Kraftfahrer Ausbildung</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
		</nav>
	</div>
</div>

<style>
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
