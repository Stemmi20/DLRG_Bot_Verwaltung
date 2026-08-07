<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const KLASSEN = ['B', 'BE', 'C1E', 'CE'] as const;

	let senden = $state(false);
	let dateiName = $state('');
	let aktiveKlassen = $state<string[]>(form?.klassen ?? []);

	// Bei einem fehlgeschlagenen Absenden die Auswahl wiederherstellen
	$effect(() => {
		if (form?.klassen) aktiveKlassen = form.klassen;
	});

	function klasseUmschalten(klasse: string) {
		aktiveKlassen = aktiveKlassen.includes(klasse)
			? aktiveKlassen.filter((k) => k !== klasse)
			: [...aktiveKlassen, klasse];
	}

	function dateiGewaehlt(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		dateiName = input.files?.[0]?.name ?? '';
	}

	const feldKlassen =
		'w-full rounded-lg p-2 text-black bg-white border-2 border-transparent ' +
		'focus:border-[rgb(255,237,0)] focus:outline-none';
</script>

<svelte:head>
	<title>Anmeldung Kraftfahrer-Ausbildung | DLRG Friedrichshafen</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 font-dlrg-normal text-white">
	<header class="mb-8">
		<h1 class="text-3xl font-semibold">Anmeldung Kraftfahrer-Ausbildung</h1>
		<p class="mt-2 text-white/70">
			Die Zahlen neben den Feldern entsprechen den Feldnummern auf dem Führerschein — leg ihn dir
			zum Ausfüllen bereit.
		</p>
	</header>

	{#if form?.erfolg}
		<div
			class="mb-6 rounded-lg border-l-4 border-[rgb(255,237,0)] bg-white/10 p-4"
			role="status"
		>
			<p class="font-semibold">Anmeldung eingegangen.</p>
			<p class="mt-1 text-white/80">
				Die Ausbildungsleitung prüft die Angaben und meldet sich bei dir.
			</p>
		</div>
	{:else}
		{#if form?.fehler}
			<div
				class="mb-6 rounded-lg border-l-4 border-[rgb(227,6,19)] bg-white/10 p-4"
				role="alert"
			>
				{form.fehler}
			</div>
		{/if}

		<form
			method="POST"
			enctype="multipart/form-data"
			class="flex flex-col gap-8"
			use:enhance={() => {
				senden = true;
				return async ({ update }) => {
					await update({ reset: false });
					senden = false;
				};
			}}
		>
			<fieldset class="border-0 p-0">
				<legend class="mb-4 text-xl font-semibold text-[rgb(255,237,0)]">
					Angaben zur Person
				</legend>

				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="name" class="mb-1 flex items-baseline gap-2">
							<span class="text-sm text-[rgb(255,237,0)]">1</span>
							<span>Name</span>
						</label>
						<input
							id="name"
							name="name"
							type="text"
							required
							autocomplete="family-name"
							value={form?.werte?.name ?? ''}
							aria-invalid={form?.felder?.name ? 'true' : undefined}
							aria-describedby={form?.felder?.name ? 'name-fehler' : undefined}
							class={feldKlassen}
						/>
						{#if form?.felder?.name}
							<p id="name-fehler" class="mt-1 text-sm text-[rgb(255,237,0)]">
								{form.felder.name}
							</p>
						{/if}
					</div>

					<div>
						<label for="vorname" class="mb-1 flex items-baseline gap-2">
							<span class="text-sm text-[rgb(255,237,0)]">2</span>
							<span>Vorname</span>
						</label>
						<input
							id="vorname"
							name="vorname"
							type="text"
							required
							autocomplete="given-name"
							value={form?.werte?.vorname ?? ''}
							aria-invalid={form?.felder?.vorname ? 'true' : undefined}
							aria-describedby={form?.felder?.vorname ? 'vorname-fehler' : undefined}
							class={feldKlassen}
						/>
						{#if form?.felder?.vorname}
							<p id="vorname-fehler" class="mt-1 text-sm text-[rgb(255,237,0)]">
								{form.felder.vorname}
							</p>
						{/if}
					</div>

					<div>
						<label for="geburtsdatum" class="mb-1 flex items-baseline gap-2">
							<span class="text-sm text-[rgb(255,237,0)]">3</span>
							<span>Geburtsdatum</span>
						</label>
						<input
							id="geburtsdatum"
							name="geburtsdatum"
							type="date"
							required
							value={form?.werte?.geburtsdatum ?? ''}
							aria-invalid={form?.felder?.geburtsdatum ? 'true' : undefined}
							aria-describedby={form?.felder?.geburtsdatum ? 'geburtsdatum-fehler' : undefined}
							class={feldKlassen}
						/>
						{#if form?.felder?.geburtsdatum}
							<p id="geburtsdatum-fehler" class="mt-1 text-sm text-[rgb(255,237,0)]">
								{form.felder.geburtsdatum}
							</p>
						{/if}
					</div>

					<div>
						<label for="geburtsort" class="mb-1 flex items-baseline gap-2">
							<span class="text-sm text-[rgb(255,237,0)]">3</span>
							<span>Geburtsort</span>
						</label>
						<input
							id="geburtsort"
							name="geburtsort"
							type="text"
							required
							value={form?.werte?.geburtsort ?? ''}
							aria-invalid={form?.felder?.geburtsort ? 'true' : undefined}
							aria-describedby={form?.felder?.geburtsort ? 'geburtsort-fehler' : undefined}
							class={feldKlassen}
						/>
						{#if form?.felder?.geburtsort}
							<p id="geburtsort-fehler" class="mt-1 text-sm text-[rgb(255,237,0)]">
								{form.felder.geburtsort}
							</p>
						{/if}
					</div>
				</div>
			</fieldset>

			<fieldset class="border-0 p-0">
				<legend class="mb-4 text-xl font-semibold text-[rgb(255,237,0)]">Führerschein</legend>

				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="ausstellungsdatum" class="mb-1 flex items-baseline gap-2">
							<span class="text-sm text-[rgb(255,237,0)]">4a</span>
							<span>Ausstellungsdatum</span>
						</label>
						<input
							id="ausstellungsdatum"
							name="ausstellungsdatum"
							type="date"
							required
							value={form?.werte?.ausstellungsdatum ?? ''}
							aria-invalid={form?.felder?.ausstellungsdatum ? 'true' : undefined}
							class={feldKlassen}
						/>
						{#if form?.felder?.ausstellungsdatum}
							<p class="mt-1 text-sm text-[rgb(255,237,0)]">{form.felder.ausstellungsdatum}</p>
						{/if}
					</div>

					<div>
						<label for="ablaufdatum" class="mb-1 flex items-baseline gap-2">
							<span class="text-sm text-[rgb(255,237,0)]">4b</span>
							<span>Ablaufdatum</span>
						</label>
						<input
							id="ablaufdatum"
							name="ablaufdatum"
							type="date"
							required
							value={form?.werte?.ablaufdatum ?? ''}
							aria-invalid={form?.felder?.ablaufdatum ? 'true' : undefined}
							class={feldKlassen}
						/>
						{#if form?.felder?.ablaufdatum}
							<p class="mt-1 text-sm text-[rgb(255,237,0)]">{form.felder.ablaufdatum}</p>
						{/if}
					</div>

					<div>
						<label for="behoerde" class="mb-1 flex items-baseline gap-2">
							<span class="text-sm text-[rgb(255,237,0)]">4c</span>
							<span>Ausstellungsbehörde</span>
						</label>
						<input
							id="behoerde"
							name="behoerde"
							type="text"
							required
							value={form?.werte?.behoerde ?? ''}
							aria-invalid={form?.felder?.behoerde ? 'true' : undefined}
							class={feldKlassen}
						/>
						{#if form?.felder?.behoerde}
							<p class="mt-1 text-sm text-[rgb(255,237,0)]">{form.felder.behoerde}</p>
						{/if}
					</div>

					<div>
						<label for="fsNummer" class="mb-1 flex items-baseline gap-2">
							<span class="text-sm text-[rgb(255,237,0)]">5</span>
							<span>Führerscheinnummer</span>
						</label>
						<input
							id="fsNummer"
							name="fsNummer"
							type="text"
							required
							value={form?.werte?.fsNummer ?? ''}
							aria-invalid={form?.felder?.fsNummer ? 'true' : undefined}
							class={feldKlassen}
						/>
						{#if form?.felder?.fsNummer}
							<p class="mt-1 text-sm text-[rgb(255,237,0)]">{form.felder.fsNummer}</p>
						{/if}
					</div>
				</div>
			</fieldset>

			<fieldset class="border-0 p-0">
				<legend class="mb-1 text-xl font-semibold text-[rgb(255,237,0)]">
					Fahrerlaubnisklassen
				</legend>
				<p class="mb-4 text-sm text-white/70">
					Rückseite, Spalten 9 bis 11. Kreuze jede Klasse an, die du besitzt, und trag die
					zugehörigen Daten ein.
				</p>

				{#if form?.felder?.klasse}
					<p class="mb-3 text-sm text-[rgb(255,237,0)]">{form.felder.klasse}</p>
				{/if}

				<div class="flex flex-col gap-3">
					{#each KLASSEN as klasse (klasse)}
						{@const aktiv = aktiveKlassen.includes(klasse)}
						<div class="rounded-lg bg-white/5 p-3">
							<label class="flex cursor-pointer items-center gap-3">
								<input
									type="checkbox"
									name="klasse"
									value={klasse}
									checked={aktiv}
									onchange={() => klasseUmschalten(klasse)}
									class="h-5 w-5 cursor-pointer"
								/>
								<span class="text-lg font-semibold">{klasse}</span>
							</label>

							{#if aktiv}
								<div class="mt-3 grid gap-3 pl-8 md:grid-cols-2">
									<div>
										<label for="ab_{klasse}" class="mb-1 block text-sm text-white/80">
											Gültig ab (10)
										</label>
										<input
											id="ab_{klasse}"
											name="ab_{klasse}"
											type="date"
											class={feldKlassen}
										/>
										{#if form?.felder?.[`ab_${klasse}`]}
											<p class="mt-1 text-sm text-[rgb(255,237,0)]">
												{form.felder[`ab_${klasse}`]}
											</p>
										{/if}
									</div>
									<div>
										<label for="bis_{klasse}" class="mb-1 block text-sm text-white/80">
											Gültig bis (11) — leer lassen, wenn unbefristet
										</label>
										<input
											id="bis_{klasse}"
											name="bis_{klasse}"
											type="date"
											class={feldKlassen}
										/>
										{#if form?.felder?.[`bis_${klasse}`]}
											<p class="mt-1 text-sm text-[rgb(255,237,0)]">
												{form.felder[`bis_${klasse}`]}
											</p>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<div class="mt-4">
					<label for="zusatz" class="mb-1 flex items-baseline gap-2">
						<span class="text-sm text-[rgb(255,237,0)]">12</span>
						<span>Beschränkungen und Zusatzangaben</span>
					</label>
					<input
						id="zusatz"
						name="zusatz"
						type="text"
						value={form?.werte?.zusatz ?? ''}
						class={feldKlassen}
					/>
				</div>
			</fieldset>

			<fieldset class="border-0 p-0">
				<legend class="mb-1 text-xl font-semibold text-[rgb(255,237,0)]">
					Kopie des Führerscheins
				</legend>
				<p class="mb-4 text-sm text-white/70">
					JPG, PNG oder PDF, höchstens 5 MB. Die Datei wird nur zur Prüfung der Angaben
					verwendet.
				</p>

				<label
					for="fuehrerschein"
					class="inline-block cursor-pointer rounded-lg bg-[rgb(255,237,0)] px-4 py-2 text-black hover:bg-yellow-400"
				>
					Datei auswählen
				</label>
				<input
					id="fuehrerschein"
					name="fuehrerschein"
					type="file"
					accept="image/jpeg,image/png,application/pdf"
					required
					onchange={dateiGewaehlt}
					class="sr-only"
				/>

				{#if dateiName}
					<p class="mt-2 text-sm text-white/80">Ausgewählt: {dateiName}</p>
				{/if}
				{#if form?.felder?.fuehrerschein}
					<p class="mt-2 text-sm text-[rgb(255,237,0)]">{form.felder.fuehrerschein}</p>
				{/if}
			</fieldset>

			<div>
				<button
					type="submit"
					disabled={senden}
					class="rounded-lg bg-[rgb(255,237,0)] px-8 py-3 text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{senden ? 'Wird gesendet …' : 'Anmeldung absenden'}
				</button>
			</div>
		</form>
	{/if}
</div>