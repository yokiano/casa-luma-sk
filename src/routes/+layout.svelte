<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';
	import favicon from '$lib/assets/favicon/favicon.ico';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';

	let { children } = $props();
	const isHomePage = $derived(page.url.pathname === '/');
	const isPrintPage = $derived(
		page.url.pathname.startsWith('/menu/print') ||
			page.url.pathname.startsWith('/print/') ||
			page.url.pathname === '/customer-intake/print' ||
			page.url.pathname.startsWith('/tools/onboarding')
	);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex flex-col min-h-screen">
	{#if !isHomePage && !isPrintPage}
		<Header />
	{/if}

	<main class="flex-1">{@render children?.()}</main>

	{#if !isHomePage && !isPrintPage}
		<Footer />
	{/if}
</div>
