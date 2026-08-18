<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import type { LayoutServerLoad } from './$types';

	export const load: LayoutServerLoad = async ({ locals }) => {
		console.log('[layout] locals.user =', locals.user);
		return { user: locals.user }
	}
	
	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const OHNE_NAVIGATION = ['/minecraft', '/login'];

	const navZeigen = $derived(!OHNE_NAVIGATION.includes($page.url.pathname));
</script>

{#if navZeigen}
	<Navbar user={data.user} />
{/if}

{@render children()}