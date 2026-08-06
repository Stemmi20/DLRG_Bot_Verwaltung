<script lang="ts">
	let form: HTMLFormElement;
	let error: string = '';
	let loading: boolean = false;

	const submit = async (e: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) => {
		e.preventDefault();
		loading = true;
		error = '';

		const formData = new FormData(form);
		const token = formData.get('token')?.toString().trim();

		if (!token) {
			error = 'Bitte gib deinen Token ein';
			loading = false;
			return;
		}

		try {
			const res = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }),
			});

			if (!res.ok) {
				const errorData = await res.json();
				error = errorData.message || 'Login fehlgeschlagen';
				loading = false;
				return;
			}

			window.location.href = '/';
		} catch (err) {
			error = 'Netzwerkfehler. Bitte versuche es erneut.';
			loading = false;
		}
	};
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900">
	<div class="max-w-md w-full p-8">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">DLRG Login</h1>
			<p class="text-gray-400">Mit Telegram-Token Anmelden</p>
		</div>

		{#if error}
			<div class="bg-red-500 text-white p-3 rounded-lg mb-4 text-center">
				{error}
			</div>
		{/if}

		<form class="flex flex-col gap-4" on:submit={submit} bind:this={form}>
			<div>
				<input
					id="token"
					type="text"
					name="token"
					placeholder="Gib deinen Token ein"
					class="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-yellow-500 focus:outline-none"
					autocomplete="off"
					disabled={loading}
				/>
			</div>

			<button
				type="submit"
				class="w-full bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={loading}
			>
				{loading ? 'Anmelden...' : 'Anmelden'}
			</button>
		</form>

		<div class="mt-6 text-center text-gray-400 text-sm">
			<p>Du hast noch keinen Token?</p>
			<p class="mt-1">Gehe in deinen Telegram DLRG Einsatzgruppen Bot und wähle "⚙️ Meine Datn Bearbeiten".</p>
		</div>
	</div>
</div>
