<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon/favicon.ico';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import { setWebsiteMediaContext } from '$lib/context/website-media';
	import { WebsiteMediaState } from '$lib/state/website-media.svelte';
	import type { WebsiteImageMap } from '$lib/types/website-media';

	interface Props {
		children?: Snippet;
		data: {
			websiteImages: WebsiteImageMap;
		};
	};

	let { children, data }: Props = $props();
	const websiteMedia = new WebsiteMediaState(data.websiteImages);
	setWebsiteMediaContext(websiteMedia);

	$effect(() => {
		websiteMedia.setImages(data.websiteImages);
	});

	const isPrintPage = $derived(
		page.url.pathname.startsWith('/menu/print') ||
			page.url.pathname.startsWith('/print/') ||
			page.url.pathname === '/customer-intake/print' ||
			page.url.pathname.startsWith('/tools/onboarding') ||
			page.url.pathname.startsWith('/customer-intake') ||
			page.url.pathname === '/tools/salary-payment' ||
			page.url.pathname.startsWith('/test-cfai')
	);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex flex-col min-h-screen">
	{#if !isPrintPage}
		<Header />
	{/if}

	<main class="flex-1">{@render children?.()}</main>

	{#if !isPrintPage}
		<Footer />
	{/if}
</div>
