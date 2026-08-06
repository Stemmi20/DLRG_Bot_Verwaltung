<script lang="ts">
	import { page } from '$app/stores';
	import Buttons from '$lib/components/Buttons.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	const excludeOn = ['/minecraft'];
	$: show = !excludeOn.includes($page.url.pathname);

	let x = 0;
	let y = 0;
	let lastUpdate = Date.now();

	$: width = 0;
</script>

{#if width > 700}
	<Buttons close={() => {}} />
{/if}
{#if width < 700}
	<Sidebar />
{/if}

<slot />
<svelte:window
	on:mousemove={(e) => {
		if (lastUpdate + 10 < Date.now()) {
			lastUpdate = Date.now();
			x = e.clientX;
			y = e.clientY;
		}
	}}
	bind:outerWidth={width}
/>
