<script lang="ts">
	import { enhance } from '$app/forms';
	import { title } from 'process';
	import type { ActionData } from '../$types';

	let { form }: { form: ActionData } = $props();

	const KLASSEN = ['B', 'BE', 'C1E', 'CE'] as const;

	let senden = $state(false);
	let dateiNmae = $state('');
	let aktiveKlassen = $state<string[]>(form?.klassen ?? []);

	$effect(() => {
		if (form?.klassen) aktiveKlassen = form.klassen;
	});

	function klassenUmschalten(klasse: string) {
		aktiveKlassen = aktiveKlassen.includes(klasse)
			? aktiveKlassen.filter((k) => k !== klasse)
			: [...aktiveKlassen, klasse];
	}

	function dateiGewaelt(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		dateiNmae = input.files?.[0]?.name ?? '';
	}

	const feldKlassen =
		'w-full rounded-lg p-2 text-black bg-white border-2 border-transparent ' +
		'focus:border-[rgb(255,237,0)] focus:outline-none';
</script>

<svelte:head>
	<title>Anmeldung Kraftahrer-Ausbildung | DLRG Friedrichshafen</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 font-dlrg-normal text-white">
	<header class="mb-8">
		<h1 class="text-3xl font-semibold">Anmeldung Kraftfahrer-Ausbildung</h1>
		<p class="mt-2 text-white">
			Die Zahlen neben den Feldern entsprechen den Fehldnummern auf dem Führerschein - lege ihn dir zum
			Ausfüllen bereit.
		</p>
	</header>

	{#if form?.erfolg}
		<div class="mb-6 rounded-lg border-l-4 border-[rgb(255,237,0)] bg-white/10 p-4" role="status">
			<p class="font-semibold">Anmeldung eingegangen.</p>
			<p class="mt-1 text-white/80">
				Die Ausbildungsleitung prüft die Angaben und meldet sich bei dir.
			</p>
		</div>
	{:else}
		{#if form?.fehler}
			<div class="mb-6 rounded-lg border-l-4 border-[(227,6,19)] bg-white/10 p-4" role="alert">
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
				<legend class="mb-4 text-xl font-semibold text-[rgb(255,237,0)]"> Angaben zur Person </legend>

                <div class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label for="name" class="mb-1 felx items-baseline gap-2">
                            <span class="text-sm text-[rgb-(255,237,0)]">1</span>
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
                            aria-describedby={form?.felder?.name ? 'name-felhler' : undefined}
                            class={feldKlassen}
                        />

                        // Weiter machen

                    </div>
                </div>
			</fieldset>
		</form>
	{/if}
</div>
