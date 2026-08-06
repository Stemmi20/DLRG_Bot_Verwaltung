<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	export let data: PageData;
	export let form: ActionData;

	$: edit = false;
	$: saving = false;
	$: searchQuery = '';
	
	$: currentUserId = data.currentUserId || data.data[0]?.user?._id;
	$: user = data.data.find(d => d.user._id === currentUserId)?.user || data.data[0]?.user;
	
	$: loggedInUser = data.data.find(d => d.user._id === data.loggedInUserId)?.user;
	
	$: filteredUsers = data.data
		.filter(d => {
			if (d.user.ortsgruppe !== loggedInUser?.ortsgruppe) return false;
			
			if (searchQuery.trim() === '') return true;
			
			const query = searchQuery.toLowerCase();
			const vorname = d.user.vorname?.toLowerCase() || '';
			const nachname = d.user.nachname?.toLowerCase() || '';
			
			return vorname.includes(query) || nachname.includes(query);
		})
		.sort((a, b) => {
			const nameA = a.user.vorname?.toLowerCase() || '';
			const nameB = b.user.vorname?.toLowerCase() || '';
			return nameA.localeCompare(nameB);
		});
	
	function selectUser(userId: string) {
		goto(`?userId=${userId}`);
		edit = false;
	}
</script>

<div class="flex h-screen">
	{#if loggedInUser?.ortsgruppe_admin}
		<div class="w-80 bg-gray-800 color-white flex flex-col border-r border-gray-700">
			<div class="p-4 border-b border-gray-700">
				<h2 class="font-bold text-xl mb-2">Ortsgruppe: {loggedInUser?.ortsgruppe}</h2>
				<p class="text-sm text-gray-400">{filteredUsers.length} Mitglieder</p>
			</div>
			
			<div class="p-4 border-b border-gray-700">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Nach Name suchen..."
					class="w-full p-2 rounded bg-gray-700 color-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-yellow-500"
				/>
			</div>
			
			<div class="flex-1 overflow-y-auto">
				{#each filteredUsers as userData}
					<button
						class="w-full p-3 text-left hover:bg-gray-700 transition border-b border-gray-700 {userData.user._id === currentUserId ? 'bg-gray-700 border-l-4 border-yellow-500' : ''}"
						onclick={() => selectUser(userData.user._id)}
					>
						<div class="font-semibold">
							{userData.user.vorname} {userData.user.nachname}
						</div>
						<div class="text-sm text-gray-400">
							{userData.user.benutzername || 'Kein Benutzername'}
						</div>
						{#if userData.user.zweitOrtsgruppe && userData.user.zweitOrtsgruppe !== 'keine'}
							<div class="text-xs text-yellow-500 mt-1">
								+ {userData.user.zweitOrtsgruppe}
							</div>
						{/if}
					</button>
				{/each}
				
				{#if filteredUsers.length === 0}
					<div class="p-4 text-center text-gray-400">
						Keine Mitglieder gefunden
					</div>
				{/if}
			</div>
		</div>
	{/if}
	
	<div class="flex-1 overflow-y-auto">
		<div class="font-dlrg-normal font-semi-bold color-white m-5 flex flex-col">
			<div class="flex flex-row">
				<div class="flex flex-col">
					<button
						hidden={!user?.ortsgruppe_admin && user?.telegramID !== 2093760015}
						onclick={() => (edit = !edit)}
						class="font-size-6 mb-5 bg-[rgb(255,237,0)] color-black p-1 rounded-2 w-40 mr-2"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="lucide lucide-pencil-icon lucide-pencil"
						>
							<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
							<path d="m15 5 4 4" />
						</svg>
						Bearbeiten
					</button>
				</div>
			</div>

			<form method="POST" action="?/save" use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					await update();
					edit = false;
					saving = false;
				};
			}}>
				<input type="hidden" name="_id" value={user?._id} />
				
				<button
					hidden={!user?.ortsgruppe_admin && user?.telegramID !== 2093760015}
					class="font-size-6 mb-5 bg-[rgb(0,237,0)] color-black p-1 rounded-2 w-25 ml-2"
					type="submit"
					disabled={saving}
				>
					<svg
						fill="#000000"
						height="24"
						width="24"
						version="1.1"
						id="Layer_1"
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
						viewBox="0 0 512 512"
						xml:space="preserve"
					>
						<g>
							<g>
								<path
									d="M440.125,0H0v512h512V71.875L440.125,0z M281.6,31.347h31.347v94.041H281.6V31.347z M136.359,31.347h113.894v125.388
				h94.041V31.347h32.392v156.735H136.359V31.347z M417.959,480.653H94.041V344.816h323.918V480.653z M417.959,313.469H94.041
				v-31.347h323.918V313.469z M480.653,480.653h-31.347V250.775H62.694v229.878H31.347V31.347h73.665v188.082h303.02V31.347h19.108
				l53.512,53.512V480.653z"
								/>
							</g>
						</g>
					</svg>
					{saving ? 'Speichert...' : 'Save'}
				</button>
				<br />
				
				{#if form?.success}
					<div class="bg-green-500 text-white p-2 rounded mb-4">
						Erfolgreich gespeichert! ({form.modified} Dokument(e) aktualisiert)
					</div>
				{/if}
				{#if form?.error}
					<div class="bg-red-500 text-white p-2 rounded mb-4">
						Fehler: {form.error}
					</div>
				{/if}
				
				Personendaten

				<div class="mb-2">
					<div class="grid grid-cols-3 gap-4 mb-4">
						<div class="flex flex-col">
							<div class="mb-1">Vorname</div>
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.vorname || ''}
								placeholder="&nbsp;Vorname"
								disabled={!edit}
								name="vorname"
							/>
						</div>
						<div class="flex flex-col">
							<div class="mb-1">Nachname</div>
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.nachname || ''}
								placeholder="&nbsp;Nachname"
								disabled={!edit}
								name="nachname"
							/>
						</div>
						<div class="flex flex-col">
							<div class="mb-1">Benutzername</div>
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.benutzername || ''}
								placeholder="&nbsp;Benutzername"
								disabled={!edit}
								name="benutzername"
							/>
						</div>
					</div>
					<div class="grid grid-cols-3 gap-4">
						<div class="flex flex-col">
							<div class="mb-1">Ortsgruppe</div>
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ortsgruppe || ''}
								placeholder="&nbsp;Ortsgruppe"
								disabled={!edit}
								name="ortsgruppe"
							/>
						</div>
						<div class="flex flex-col">
							<div class="mb-1">Zweite Ortsgruppe</div>
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.zweitOrtsgruppe || ''}
								placeholder="&nbsp;Zweite Ortsgruppe"
								disabled={!edit}
								name="zweitOrtsgruppe"
							/>
						</div>
					</div>
				</div>
				
				Ausrüstung
				<div class="mb-2">
					<div class="grid grid-cols-4 gap-4 mb-4">
						<div class="flex flex-col">
							Neopren Schuhe
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.neoprenSchuh || ''}
								placeholder="&nbsp;Neopren Schuhe"
								disabled={!edit}
								name="ausruestung.neoprenSchuh"
							/>
						</div>
						<div class="flex flex-col">
							Schildmütze
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.schildmütze || ''}
								placeholder="&nbsp;Schildmütze"
								disabled={!edit}
								name="ausruestung.schildmütze"
							/>
						</div>
						<div class="flex flex-col">
							Jacke
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.jacke || ''}
								placeholder="&nbsp;Jacke"
								disabled={!edit}
								name="ausruestung.jacke"
							/>
						</div>
						<div class="flex flex-col">
							Badebekleidung
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.badebekleidung || ''}
								placeholder="&nbsp;Badebekleidung"
								disabled={!edit}
								name="ausruestung.badebekleidung"
							/>
						</div>
					</div>
					<div class="grid grid-cols-4 gap-4 mb-4">
						<div class="flex flex-col">
							Pullover
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.pullover || ''}
								placeholder="&nbsp;Pullover"
								disabled={!edit}
								name="ausruestung.pullover"
							/>
						</div>
						<div class="flex flex-col">
							Hose
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.hose || ''}
								placeholder="&nbsp;Hose"
								disabled={!edit}
								name="ausruestung.hose"
							/>
						</div>
						<div class="flex flex-col">
							Namensschild
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.namensschild || ''}
								placeholder="&nbsp;Namensschild"
								disabled={!edit}
								name="ausruestung.namensschild"
							/>
						</div>
						<div class="flex flex-col">
							T-Shirt
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.TShirt || ''}
								placeholder="&nbsp;T-Shirt"
								disabled={!edit}
								name="ausruestung.TShirt"
							/>
						</div>
					</div>
					<div class="grid grid-cols-4 gap-4 mb-4">
						<div class="flex flex-col">
							Schuhe
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.schuhe || ''}
								placeholder="&nbsp;Schuhe"
								disabled={!edit}
								name="ausruestung.schuhe"
							/>
						</div>
						<div class="flex flex-col">
							Neopren Anzug
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.neoprenAnzug || ''}
								placeholder="&nbsp;Neopren Anzug"
								disabled={!edit}
								name="ausruestung.neoprenAnzug"
							/>
						</div>
						<div class="flex flex-col">
							Handschuhe
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.handschuhe || ''}
								placeholder="&nbsp;Handschuhe"
								disabled={!edit}
								name="ausruestung.handschuhe"
							/>
						</div>
						<div class="flex flex-col">
							Neopren Handschuhe
							<input
								class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
								type="text"
								value={user?.ausruestung?.neoprenHandschuhe || ''}
								placeholder="&nbsp;Neopren Handschuhe"
								disabled={!edit}
								name="ausruestung.neoprenHandschuhe"
							/>
						</div>
					</div>
					<div class="mt-2">
						Funktionen <br />
						<input
							class="mt-2"
							type="checkbox"
							name="funktionen.evd"
							checked={user?.funktionen?.evd || false}
							disabled={!user?.ortsgruppe_admin || !edit}
						/>
						EVD (Einsatzleiter vor Dienst)<br />
						<input
							class="mt-2"
							type="checkbox"
							name="funktionen.bf"
							checked={user?.funktionen?.bf || false}
							disabled={!user?.ortsgruppe_admin || !edit}
						/>
						BF (Bootsführer)<br />
						<input
							class="mt-2"
							type="checkbox"
							name="funktionen.kf"
							checked={user?.funktionen?.kf || false}
							disabled={!user?.ortsgruppe_admin || !edit}
						/>
						KF (Kraftfahrer)<br />
						<input
							class="mt-2"
							type="checkbox"
							name="funktionen.wr"
							checked={user?.funktionen?.wr || false}
							disabled={!user?.ortsgruppe_admin || !edit}
						/>
						WR (Wasserretter)<br />
						<input
							class="mt-2"
							type="checkbox"
							name="funktionen.zf"
							checked={user?.funktionen?.zf || false}
							disabled={!user?.ortsgruppe_admin || !edit}
						/>
						ZF (Zugführer)<br />
						<input
							class="mt-2"
							type="checkbox"
							name="funktionen.et"
							checked={user?.funktionen?.et || false}
							disabled={!user?.ortsgruppe_admin || !edit}
						/>
						ET (Einsatztaucher)<br />
						<input
							class="mt-2"
							type="checkbox"
							name="funktionen.sr"
							checked={user?.funktionen?.sr || false}
							disabled={!user?.ortsgruppe_admin || !edit}
						/>
						SR (Strömungsretter)<br />
						<input
							class="mt-2"
							type="checkbox"
							name="funktionen.gf"
							checked={user?.funktionen?.gf || false}
							disabled={!user?.ortsgruppe_admin || !edit}
						/>
						GF (Gruppenführer)
					</div>
				</div>
			</form>
		</div>
	</div>
</div>