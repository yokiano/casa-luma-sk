<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon/favicon.ico';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	const isHomePage = $derived($page.url.pathname === '/');
	const isMenuPrintPage = $derived($page.url.pathname.startsWith('/menu/print'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-col min-h-screen">
	{#if !isHomePage && !isMenuPrintPage}
		<Header />
	{/if}
	<main class="flex-1">
		{@render children?.()}
	</main>
	{#if !isHomePage && !isMenuPrintPage}
		<Footer />
	{/if}
</div>
