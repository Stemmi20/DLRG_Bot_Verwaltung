<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const OHNE_NAVIGATION = ['/minecraft'];

	const navZeigen = $derived(!OHNE_NAVIGATION.includes($page.url.pathname));
</script>

{@render children()}