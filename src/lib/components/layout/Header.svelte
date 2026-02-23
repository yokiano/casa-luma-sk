<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { scrollY } from 'svelte/reactivity/window';
	import { BUSINESS_INFO, NAV_LINKS } from '$lib/constants';
	import logoSymbol from '$lib/assets/logo/logo-black-on-transparent-only-symbol.png';
	import MobileMenuButton from './MobileMenuButton.svelte';
	import MobileMenuPanel from './MobileMenuPanel.svelte';

	let mobileMenuOpen = $state(false);
	const midpoint = Math.ceil(NAV_LINKS.length / 2);
	const leftLinks = NAV_LINKS.slice(0, midpoint);
	const rightLinks = NAV_LINKS.slice(midpoint);
	let scrolled = $derived((scrollY.current ?? 0) > 24);

	const isActiveLink = (href: string, pathname: string) =>
		href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

	$effect(() => {
		if (!browser) return;
		document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		page.url.pathname;
		mobileMenuOpen = false;
	});
</script>

<header
	class="sticky top-0 z-50 border-b border-[#2D3A3A]/10 px-4 transition-all duration-500 sm:px-6 lg:px-8 {scrolled ? 'bg-[#F9F7F2]/90 shadow-[0_8px_30px_rgb(45_58_58_/_0.08)] backdrop-blur-md' : 'bg-[#F9F7F2]/75'}"
>
	<nav class="mx-auto flex h-20 w-full max-w-7xl items-center justify-between text-[#2D3A3A]">
		<div class="hidden min-w-0 flex-1 items-center gap-7 md:flex lg:gap-8">
			{#each leftLinks as link}
				<a
					href={link.href}
					class="text-[11px] uppercase tracking-[0.2em] transition-colors {isActiveLink(link.href, page.url.pathname) ? 'text-[#E07A5F]' : 'text-[#2D3A3A] hover:text-[#E07A5F]'}"
				>
					{link.label}
				</a>
			{/each}
		</div>

		<a
			href="/"
			class="flex items-center gap-3 text-center text-lg uppercase tracking-[0.34em] text-[#2D3A3A] transition-colors hover:text-[#E07A5F] sm:text-xl"
		>
			<img src={logoSymbol} alt="" class="h-10 w-10 object-contain" aria-hidden="true" />
			<span>{BUSINESS_INFO.name}</span>
		</a>

		<div class="hidden min-w-0 flex-1 items-center justify-end gap-7 md:flex lg:gap-8">
			{#each rightLinks as link}
				<a
					href={link.href}
					class="text-[11px] uppercase tracking-[0.2em] transition-colors {isActiveLink(link.href, page.url.pathname) ? 'text-[#E07A5F]' : 'text-[#2D3A3A] hover:text-[#E07A5F]'}"
				>
					{link.label}
				</a>
			{/each}
		</div>

		<div class="md:hidden">
			<MobileMenuButton open={mobileMenuOpen} onToggle={() => (mobileMenuOpen = !mobileMenuOpen)} />
		</div>
	</nav>

	<MobileMenuPanel open={mobileMenuOpen} links={NAV_LINKS} onClose={() => (mobileMenuOpen = false)} />
</header>

