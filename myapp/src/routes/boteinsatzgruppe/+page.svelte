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

<div class="font-dlrg-normal font-semi-bold color-white m-5 flex flex-col">
	<div class="font-size-5 mb-5 bg-[rgb(255,237,0)] color-black p-1 rounded-2">
		Bearbeiten	</div>
	<div class="mb-2">
		Personendaten <br />
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Vorname"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Nachname"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Benutzername"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Ortsgruppe"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Zweite Ortsgruppe"
		/>
	</div>
	<div>
		Ausrüstung <br />
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Neopren Schuhe"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Schildmütze"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Jacke"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Badebekleidung"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Pullover"
		/>
		<br />
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Hose"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Namensschild"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;T-Shirt"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Schuhe"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Neopren Anzug"
		/> <br />
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Handschuhe"
		/>
		<input
			class="m-2 ml-0 rounded-2 h-10 bg-gray color-white placeholder-white font-size-4"
			type="text"
			placeholder="&nbsp;Neopren Handschuehe"
		/>
	</div>
	<div class="mt-2">
		Funktionen <br />
		<input class="mt-2" type="checkbox" /> EvD (Einsatzleiter vom Dienst)<br />
		<input class="mt-2" type="checkbox" /> BF (Bootsführer)<br />
		<input class="mt-2" type="checkbox" /> KF (Kraftfahrer)<br />
		<input class="mt-2" type="checkbox" /> WR (Wasserretter)<br />
		<input class="mt-2" type="checkbox" /> ZF (Zug Führer)<br />
		<input class="mt-2" type="checkbox" /> ET (Einsatztaucher)<br />
		<input class="mt-2" type="checkbox" /> SR (Strömungsretter)<br />
		<input class="mt-2" type="checkbox" /> GF (Gruppen Führer)
	</div>
</div>
