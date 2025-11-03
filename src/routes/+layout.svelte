<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon/favicon.ico';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	const isHomePage = $derived($page.url.pathname === '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-col min-h-screen">
	{#if !isHomePage}
		<Header />
	{/if}
	<main class="flex-1">
		{@render children?.()}
	</main>
	{#if !isHomePage}
		<Footer />
	{/if}
</div>
