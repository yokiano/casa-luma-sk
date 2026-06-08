<script lang="ts">
	import { ArrowUpRight, CalendarDays, PartyPopper, UtensilsCrossed } from 'lucide-svelte';
	import logoSymbol from '$lib/assets/logo/logo-black-on-transparent-only-symbol.png';

	const links = [
		{ title: 'Our Menu', href: '/menu', status: 'Open', icon: UtensilsCrossed, comingSoon: false },
		{ title: 'Birthday', href: '/birthdays', status: 'Open', icon: PartyPopper, comingSoon: false },
		{ title: 'Workshops', href: '#', status: 'Coming soon', icon: CalendarDays, comingSoon: true }
	];
</script>

<svelte:head>
	<title>Casa Luma Links</title>
	<meta
		name="description"
		content="Casa Luma quick links for menu, birthdays, workshops, memberships, play, cafe, and visiting information."
	/>
</svelte:head>

<div class="relative min-h-screen overflow-hidden bg-[#F9F7F2] px-5 py-8 text-[#2D3A3A] selection:bg-[#E07A5F] selection:text-white sm:px-8">
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<div class="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#E07A5F]/15 blur-3xl"></div>
		<div class="absolute -right-20 top-36 h-64 w-64 rounded-full bg-[#dfbc69]/25 blur-3xl"></div>
		<div
			class="absolute bottom-0 left-1/2 h-80 w-[26rem] -translate-x-1/2 bg-[#A8C3A0]/20 blur-3xl"
			style="border-radius: 45% 55% 60% 40% / 45% 40% 60% 55%;"
		></div>
	</div>

	<main class="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center py-8">
		<a href="/" class="mx-auto mb-8 block w-fit text-center" aria-label="Casa Luma home">
			<img src={logoSymbol} alt="" class="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24" aria-hidden="true" />
			<span class="mt-3 block text-lg uppercase tracking-[0.34em] text-[#2D3A3A] sm:text-xl">Casa Luma</span>
		</a>

		<nav aria-label="Casa Luma quick links" class="space-y-3">
			{#each links as link}
				{@const Icon = link.icon}
				<a
					href={link.href}
					aria-disabled={link.comingSoon}
					class="group flex items-center gap-4 rounded-[1.65rem] border border-[#2D3A3A]/10 bg-white/72 p-3.5 text-left shadow-[0_18px_45px_rgba(45,58,58,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#E07A5F]/35 hover:bg-white hover:shadow-[0_22px_55px_rgba(45,58,58,0.12)] sm:p-4"
					onclick={(event) => link.comingSoon && event.preventDefault()}
				>
					<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F9EDE8] text-[#E07A5F] transition-colors group-hover:bg-[#E07A5F] group-hover:text-white">
						<Icon size={21} strokeWidth={1.8} />
					</span>
					<span class="min-w-0 flex-1">
						<span class="block font-heading text-lg font-medium tracking-tight text-[#2D3A3A] sm:text-xl">
							{link.title}
						</span>
						<span class="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2D3A3A]/45">
							{link.status}
						</span>
					</span>
					<ArrowUpRight
						size={18}
						strokeWidth={1.8}
						class={link.comingSoon
							? 'shrink-0 text-[#2D3A3A]/25'
							: 'shrink-0 text-[#E07A5F] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5'}
					/>
				</a>
			{/each}
		</nav>
	</main>
</div>
