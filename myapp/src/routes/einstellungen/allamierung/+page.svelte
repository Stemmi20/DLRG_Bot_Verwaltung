<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { anmelden, abmelden, zustand, istIosOhneHomescreen, type PushZustand } from '$lib/client/push';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let push = $state<PushZustand>('aus');
	let laedt = $state(false);
	let testLaeuft = $state(false);
	let hinweis = $state<string | null>(null);

	onMount(async () => {
		push = await zustand();
	});

	async function umschalten() {
		laedt = true;
		push = push === 'an' ? await abmelden() : await anmelden();
		laedt = false;
	}

	/** Eigentest: Alarm nur an die eigenen Geräte. Braucht keine Adminrechte. */
	async function eigentest() {
		testLaeuft = true;
		hinweis = null;
		try {
			const res = await fetch('/api/alarm', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					typ: 'eigentest',
					stichwort: 'TESTALARM',
					meldebild: 'Selbsttest der Alarmierung',
					einsatzort: { strasse: 'Testalarm', plz: '', ort: '', hinweis: '', lat: null, lng: null },
					ortsgruppenIds: [],
					fahrzeugIds: [],
					scope: 'self'
				})
			});
			if (!res.ok) throw new Error();
			const { einsatzId } = await res.json();
			hinweis = 'Testalarm gesendet. Wenn nichts ankommt, prüfe die Benachrichtigungen in den Systemeinstellungen.';
			setTimeout(() => goto(`/alarm/${einsatzId}`), 2500);
		} catch {
			hinweis = 'Testalarm konnte nicht gesendet werden.';
		} finally {
			testLaeuft = false;
		}
	}
</script>

<svelte:head><title>Alarmierung</title></svelte:head>

<div class="min-h-dvh bg-lvs-nacht text-lvs-eis font-body p-4">
	<div class="max-w-xl mx-auto grid gap-5">
		<h1 class="font-display font-700 text-4xl uppercase">Alarmierung</h1>

		<section class="lvs-panel p-4 grid gap-3">
			<div class="flex items-center justify-between gap-4">
				<span>
					<span class="block font-600">Alarme auf diesem Gerät</span>
					<span class="text-sm text-lvs-grau">
						{push === 'an'
							? 'Eingerichtet'
							: push === 'blockiert'
								? 'Vom Browser blockiert'
								: push === 'nicht-unterstuetzt'
									? 'Dieser Browser kann keine Alarme empfangen'
									: 'Noch nicht eingerichtet'}
					</span>
				</span>
				<button
					type="button"
					disabled={laedt || push === 'nicht-unterstuetzt' || push === 'blockiert'}
					onclick={umschalten}
					class="lvs-taste text-base {push === 'an'
						? 'bg-lvs-stahl border border-lvs-kante'
						: 'bg-lvs-gruen text-lvs-nacht'}"
				>
					{push === 'an' ? 'Abmelden' : 'Einrichten'}
				</button>
			</div>

			{#if push === 'blockiert'}
				<p class="text-sm text-lvs-gelb">
					Benachrichtigungen sind für diese Seite gesperrt. Du musst sie in den Browsereinstellungen
					wieder freigeben.
				</p>
			{/if}

			{#if istIosOhneHomescreen()}
				<p class="text-sm text-lvs-gelb">
					Auf dem iPhone kommen Alarme nur an, wenn du die Seite über „Teilen → Zum Home-Bildschirm"
					installierst und sie von dort öffnest.
				</p>
			{/if}

			<p class="text-sm text-lvs-grau border-t border-lvs-kante pt-3">
				Alarme über den Browser klingeln nicht, wenn dein Handy stumm geschaltet ist. Verlass dich
				nicht allein darauf.
			</p>
		</section>

		{#if data.geraete.length}
			<section class="lvs-panel p-4">
				<span class="lvs-label block mb-2">Angemeldete Geräte</span>
				<ul class="grid gap-1 text-sm">
					{#each data.geraete as g (g.endpoint)}
						<li class="flex justify-between text-lvs-grau">
							<span>{g.geraet}</span>
							<span class="lvs-zahl">{new Date(g.erstelltAm).toLocaleDateString('de-DE')}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#each data.ortsgruppen as og (og.id)}
			{#if og.standorte.length > 1 || data.ortsgruppen.length > 1}
				<form method="POST" action="?/standort" class="lvs-panel p-4 grid gap-2">
					<span class="lvs-label">Standardstandort · {og.name}</span>
					<input type="hidden" name="ortsgruppeId" value={og.id} />
					<div class="grid gap-2">
						{#each og.standorte as s (s.id)}
							<button
								type="submit"
								name="standortId"
								value={s.id}
								class="lvs-taste justify-start text-base {og.standardStandortId === s.id
									? 'bg-lvs-wasser text-lvs-nacht'
									: 'bg-lvs-nacht border border-lvs-kante'}">{s.name}</button
							>
						{/each}
					</div>
					<p class="text-xs text-lvs-grau">
						Wird bei einem Alarm vorausgewählt. Ändern kannst du ihn dort trotzdem.
					</p>
				</form>
			{/if}
		{/each}

		<form method="POST" action="?/abwesenheit" class="lvs-panel p-4 grid gap-2">
			<span class="lvs-label">Abwesend bis</span>
			<div class="flex gap-2">
				<input
					type="date"
					name="bis"
					value={data.abwesendBis}
					class="flex-1 bg-lvs-nacht border border-lvs-kante rounded-lg px-3 h-12"
				/>
				<button type="submit" class="lvs-taste bg-lvs-stahl border border-lvs-kante text-base"
					>Speichern</button
				>
			</div>
			<p class="text-xs text-lvs-grau">Bis dahin wirst du nicht alarmiert.</p>
		</form>

		<button
			type="button"
			disabled={testLaeuft || push !== 'an'}
			onclick={eigentest}
			class="lvs-taste bg-lvs-gelb text-lvs-nacht h-14 disabled:opacity-40"
		>
			{testLaeuft ? 'Wird gesendet …' : 'Testalarm an mich senden'}
		</button>
		{#if hinweis}<p class="text-sm text-lvs-grau text-center">{hinweis}</p>{/if}
	</div>
</div>
