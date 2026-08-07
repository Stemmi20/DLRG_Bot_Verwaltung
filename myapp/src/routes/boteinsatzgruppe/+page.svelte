<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { AUSRUESTUNG, FUNKTIONEN } from '$lib/types/mitglied';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let edit = $state(false);
	let saving = $state(false);
	let searchQuery = $state('');

	const user = $derived(
		data.data.find((d: any) => d._id === data.currentUserId) ?? data.data[0]
	);

	const loggedInUser = $derived(
		data.data.find((d: any) => d._id === data.loggedInUserId)
	);

	const darfBearbeiten = $derived(
		data.isAdmin || user?._id === data.loggedInUserId
	);

	const filteredUsers = $derived(
		data.data
			.filter((d: any) => {
				const query = searchQuery.trim().toLowerCase();
				if (query === '') return true;
				return (
					(d.vorname?.toLowerCase() ?? '').includes(query) ||
					(d.nachname?.toLowerCase() ?? '').includes(query)
				);
			})
			.sort((a: any, b: any) =>
				(a.vorname ?? '').localeCompare(b.vorname ?? '', 'de')
			)
	);

	function selectUser(userId: string) {
		edit = false;
		goto(`?userId=${userId}`);
	}

	const feldKlassen =
		'mb-2 h-10 rounded-2 bg-gray-700 px-2 color-white placeholder-gray-400 font-size-4 ' +
		'border border-gray-600 focus:border-yellow-500 focus:outline-none ' +
		'disabled:opacity-70 disabled:cursor-not-allowed';
</script>

<div class="flex h-screen font-dlrg-normal">
	{#if data.isAdmin}
		<aside class="flex w-80 flex-col border-r border-gray-700 bg-gray-800 color-white">
			<div class="border-b border-gray-700 p-4">
				<h2 class="mb-2 text-xl font-bold">Ortsgruppe {loggedInUser?.ortsgruppe}</h2>
				<p class="text-sm text-gray-400">{filteredUsers.length} Mitglieder</p>
			</div>

			<div class="border-b border-gray-700 p-4">
				<label for="suche" class="sr-only">Nach Name suchen</label>
				<input
					id="suche"
					type="text"
					bind:value={searchQuery}
					placeholder="Nach Name suchen …"
					class="w-full rounded border border-gray-600 bg-gray-700 p-2 color-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none"
				/>
			</div>

			<div class="flex-1 overflow-y-auto">
				{#each filteredUsers as mitglied (mitglied._id)}
					<button
						type="button"
						class="w-full border-b border-gray-700 p-3 text-left transition hover:bg-gray-700
							{mitglied._id === data.currentUserId ? 'border-l-4 border-l-yellow-500 bg-gray-700' : ''}"
						onclick={() => selectUser(mitglied._id)}
					>
						<div class="font-semibold">
							{mitglied.vorname}
							{mitglied.nachname}
						</div>
						<div class="text-sm text-gray-400">
							{mitglied.benutzername || 'Kein Benutzername'}
						</div>
						{#if mitglied.zweitOrtsgruppe && mitglied.zweitOrtsgruppe !== 'keine'}
							<div class="mt-1 text-xs text-yellow-500">+ {mitglied.zweitOrtsgruppe}</div>
						{/if}
					</button>
				{:else}
					<p class="p-4 text-center text-gray-400">Keine Mitglieder gefunden</p>
				{/each}
			</div>
		</aside>
	{/if}

	<main class="flex-1 overflow-y-auto">
		<div class="m-5 flex flex-col color-white">
			{#if !user}
				<p class="text-gray-400">Kein Datensatz vorhanden.</p>
			{:else}
				<header class="mb-5 flex items-center gap-3">
					<h1 class="text-2xl font-bold">
						{user.vorname}
						{user.nachname}
					</h1>
					{#if user.status}
						<span class="rounded-full bg-gray-700 px-3 py-1 text-sm">{user.status}</span>
					{/if}
				</header>

				{#if form?.success}
					<div class="mb-4 rounded bg-green-600 p-2 text-white" role="status">
						Gespeichert. ({form.modified} Datensatz/Datensätze geändert)
					</div>
				{/if}
				{#if form?.error}
					<div class="mb-4 rounded bg-red-600 p-2 text-white" role="alert">
						{form.error}
					</div>
				{/if}

				<form
					method="POST"
					action="?/save"
					use:enhance={() => {
						saving = true;
						return async ({ update }) => {
							await update();
							edit = false;
							saving = false;
						};
					}}
				>
					<input type="hidden" name="_id" value={user._id} />

					{#if darfBearbeiten}
						<div class="mb-5 flex gap-2">
							{#if !edit}
								<button
									type="button"
									onclick={() => (edit = true)}
									class="rounded-2 bg-[rgb(255,237,0)] px-4 py-2 color-black hover:bg-yellow-400"
								>
									Bearbeiten
								</button>
							{:else}
								<button
									type="submit"
									disabled={saving}
									class="rounded-2 bg-green-500 px-4 py-2 color-black hover:bg-green-400 disabled:opacity-60"
								>
									{saving ? 'Speichert …' : 'Speichern'}
								</button>
								<button
									type="button"
									onclick={() => (edit = false)}
									class="rounded-2 bg-gray-600 px-4 py-2 color-white hover:bg-gray-500"
								>
									Abbrechen
								</button>
							{/if}
						</div>
					{/if}

					<section class="mb-6">
						<h2 class="mb-3 text-xl font-semibold text-[rgb(255,237,0)]">Personendaten</h2>
						<div class="grid gap-4 md:grid-cols-3">
							<div class="flex flex-col">
								<label for="vorname" class="mb-1">Vorname</label>
								<input
									id="vorname"
									name="vorname"
									type="text"
									value={user.vorname ?? ''}
									disabled={!edit}
									class={feldKlassen}
								/>
							</div>
							<div class="flex flex-col">
								<label for="nachname" class="mb-1">Nachname</label>
								<input
									id="nachname"
									name="nachname"
									type="text"
									value={user.nachname ?? ''}
									disabled={!edit}
									class={feldKlassen}
								/>
							</div>
							<div class="flex flex-col">
								<label for="benutzername" class="mb-1">Benutzername</label>
								<input
									id="benutzername"
									name="benutzername"
									type="text"
									value={user.benutzername ?? ''}
									disabled={!edit}
									class={feldKlassen}
								/>
							</div>
							<div class="flex flex-col">
								<label for="ortsgruppe" class="mb-1">Ortsgruppe</label>
								<input
									id="ortsgruppe"
									name="ortsgruppe"
									type="text"
									value={user.ortsgruppe ?? ''}
									disabled={!edit || !data.isAdmin}
									class={feldKlassen}
								/>
							</div>
							<div class="flex flex-col">
								<label for="zweitOrtsgruppe" class="mb-1">Zweite Ortsgruppe</label>
								<input
									id="zweitOrtsgruppe"
									name="zweitOrtsgruppe"
									type="text"
									value={user.zweitOrtsgruppe ?? ''}
									disabled={!edit}
									class={feldKlassen}
								/>
							</div>
						</div>
					</section>

					<section class="mb-6">
						<h2 class="mb-3 text-xl font-semibold text-[rgb(255,237,0)]">Ausrüstung</h2>
						<div class="grid gap-4 md:grid-cols-4">
							{#each AUSRUESTUNG as teil (teil.key)}
								<div class="flex flex-col">
									<label for="ausr-{teil.key}" class="mb-1">{teil.label}</label>
									<input
										id="ausr-{teil.key}"
										name="ausruestung.{teil.key}"
										type="text"
										value={user.ausruestung?.[teil.key] ?? ''}
										disabled={!edit}
										class={feldKlassen}
									/>
								</div>
							{/each}
						</div>
					</section>

					<section class="mb-6">
						<h2 class="mb-1 text-xl font-semibold text-[rgb(255,237,0)]">Funktionen</h2>
						{#if !data.isAdmin}
							<p class="mb-3 text-sm text-gray-400">
								Funktionen können nur von der Ortsgruppenleitung geändert werden.
							</p>
						{/if}
						<div class="grid gap-2 md:grid-cols-2">
							{#each FUNKTIONEN as funktion (funktion.key)}
								<label class="flex items-center gap-2">
									<input
										type="checkbox"
										name="funktionen.{funktion.key}"
										checked={user.funktionen?.[funktion.key] ?? false}
										disabled={!edit || !data.isAdmin}
										class="h-4 w-4"
									/>
									<span>{funktion.label}</span>
								</label>
							{/each}
						</div>
					</section>
				</form>
			{/if}
		</div>
	</main>
</div>