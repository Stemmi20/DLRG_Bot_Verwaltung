<script lang="ts">
	import { page } from '$app/stores';

	let {
		user
	}: {
		user: { vorname: string; nachname: string; istAdmin: boolean } | null;
	} = $props();

	let menuOffen = $state(false);
	let abmelden = $state(false);

	const LINKS = [
		{ pfad: '/', label: 'Start' },
		{ pfad: '/boteinsatzgruppe', label: 'Einsatzgruppe' },
		{ pfad: '/board', label: 'Board' },
		{ pfad: '/kfausb', label: 'Kraftfahrer' },
		{ pfad: '/einstellungen/allamierung', label: 'Alarmierung' }
	];

	const ADMIN_LINKS = [{ pfad: '/admin/alarm/neu', label: 'Alarm auslösen' }];

	const sichtbareLinks = $derived(user?.istAdmin ? [...LINKS, ...ADMIN_LINKS] : LINKS);

	function istAktiv(pfad: string): boolean {
		const aktuell = $page.url.pathname;
		return pfad === '/' ? aktuell === '/' : aktuell.startsWith(pfad);
	}

	async function abmeldenKlick() {
		abmelden = true;
		await fetch('/api/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<header class="bg-[rgb(227,6,19)] font-dlrg-normal color-white">
	<div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
		<!-- Links: Logo -->
		<a href="/" class="shrink-0" aria-label="Zur Startseite">
			<img src="/dlrg_og_fn.svg" alt="DLRG" class="h-10 w-auto" />
		</a>

		<!-- Mitte: Begrüßung und Titel -->
		<div class="min-w-0 flex-1 text-center">
			{#if user}
				<p class="truncate text-sm color-[rgb(255,237,0)]">
					Hallo {user.vorname}
				</p>
			{/if}
			<p class="truncate font-semibold color-[rgb(255,237,0)]">DLRG Verwaltung</p>
		</div>

		<!-- Rechts: Abmelden und Menüknopf -->
		<div class="flex shrink-0 items-center gap-2">
			{#if user}
				<button
					type="button"
					onclick={abmeldenKlick}
					disabled={abmelden}
					class="rounded-lg bg-[rgb(255,237,0)] px-4 py-2 color-black transition hover:bg-yellow-300 disabled:opacity-60"
				>
					{abmelden ? 'Wird abgemeldet …' : 'Abmelden'}
				</button>
			{:else}
				<a
					href="/login"
					class="rounded-lg bg-[rgb(255,237,0)] px-4 py-2 color-black transition hover:bg-yellow-300"
				>
					Anmelden
				</a>
			{/if}

			<button
				type="button"
				onclick={() => (menuOffen = !menuOffen)}
				aria-expanded={menuOffen}
				aria-controls="hauptmenue"
				aria-label={menuOffen ? 'Menü schließen' : 'Menü öffnen'}
				class="rounded-lg p-2 transition hover:bg-white/15 lg:hidden"
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
					aria-hidden="true"
				>
					{#if menuOffen}
						<path d="M18 6 6 18M6 6l12 12" />
					{:else}
						<path d="M3 6h18M3 12h18M3 18h18" />
					{/if}
				</svg>
			</button>
		</div>
	</div>

	<!-- Navigationslinks: ab lg in der Leiste, darunter aufklappbar -->
	{#if user}
		<nav
			id="hauptmenue"
			class="border-t border-white/20 {menuOffen ? 'block' : 'hidden'} lg:block"
			aria-label="Hauptnavigation"
		>
			<ul class="mx-auto flex max-w-7xl flex-col px-4 lg:flex-row lg:gap-1">
				{#each sichtbareLinks as link (link.pfad)}
					<li>
						<a
							href={link.pfad}
							onclick={() => (menuOffen = false)}
							aria-current={istAktiv(link.pfad) ? 'page' : undefined}
							class="block border-b-3 px-3 py-2 transition hover:bg-white/10
								{istAktiv(link.pfad)
								? 'border-[rgb(255,237,0)] color-[rgb(255,237,0)]'
								: 'border-transparent'}"
						>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</header>