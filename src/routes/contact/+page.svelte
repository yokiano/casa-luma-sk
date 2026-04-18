<script lang="ts">
	import { ArrowUpRight, Facebook, Instagram, Mail, MapPinned } from 'lucide-svelte';
	import { BUSINESS_INFO, SOCIAL_LINKS } from '$lib/constants';

	const mapEmbedUrl =
		'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3932.4477161020286!2d100.00357369999999!3d9.728089599999999!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3054fd4f4c0e39f3%3A0x374aa78988f86cd3!2sCasa%20Luma!5e0!3m2!1sen!2sth!4v1773582524371!5m2!1sen!2sth';

	const contactCards = [
		{
			label: 'Email us',
			value: BUSINESS_INFO.email,
			href: `mailto:${BUSINESS_INFO.email}`,
			icon: Mail
		},
		{
			label: 'Find us',
			value: BUSINESS_INFO.location,
			href: SOCIAL_LINKS.googleMaps,
			icon: MapPinned
		}
	] as const;

	const socialCards = [
		{ label: 'Instagram', href: SOCIAL_LINKS.instagram, icon: Instagram },
		{ label: 'Facebook', href: SOCIAL_LINKS.facebook, icon: Facebook },
		{ label: 'Google Maps', href: SOCIAL_LINKS.googleMaps, icon: MapPinned }
	] as const;
</script>

<svelte:head>
	<title>Contact - Casa Luma</title>
	<meta
		name="description"
		content="Get in touch with Casa Luma, find our Koh Phangan location, and plan your visit."
	/>
</svelte:head>

<div class="bg-background text-foreground selection:bg-accent selection:text-white">
	<section class="relative overflow-hidden px-6 pb-12 pt-20 sm:px-10 lg:px-20 lg:pb-16 lg:pt-24">
		<div class="absolute inset-0 pointer-events-none">
			<div class="absolute left-[8%] top-16 h-40 w-40 rounded-full bg-accent/12 blur-3xl"></div>
			<div class="absolute right-[10%] top-24 h-52 w-52 rounded-full bg-primary/18 blur-3xl"></div>
			<div
				class="absolute bottom-0 left-1/2 h-48 w-72 -translate-x-1/2 bg-secondary/14 blur-3xl"
				style:border-radius="40% 60% 60% 40% / 40% 40% 60% 60%"
			></div>
		</div>

		<div class="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
			<div class="max-w-3xl">
				<p class="mb-5 text-[11px] uppercase tracking-[0.28em] text-foreground/72">Contact</p>
				<h1 class="text-5xl leading-[0.88] tracking-tight sm:text-6xl lg:text-7xl">
					<span class="block">Come find</span>
					<span class="block italic text-accent">your easy family day</span>
					<span class="block">at Casa Luma.</span>
				</h1>
			</div>

			<div class="rounded-[2rem] border border-foreground/10 bg-white/75 p-6 shadow-[0_24px_80px_foreground/10] backdrop-blur sm:p-8">
				<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/72">Visit details</p>
				<div class="mt-6 space-y-5">
					{#each contactCards as card}
						<a
							href={card.href}
							target={card.href.startsWith('http') ? '_blank' : undefined}
							rel={card.href.startsWith('http') ? 'noopener noreferrer' : undefined}
							class="group flex items-start gap-4 rounded-[1.5rem] border border-foreground/8 bg-background/80 px-5 py-4 transition-transform duration-300 hover:-translate-y-0.5"
						>
							<div class="mt-0.5 rounded-full bg-foreground p-2.5 text-white">
								<card.icon size={18} />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-[11px] uppercase tracking-[0.2em] text-foreground/72">{card.label}</p>
								<p class="mt-2 text-sm leading-relaxed text-foreground sm:text-base">{card.value}</p>
							</div>
							<ArrowUpRight
								size={18}
								class="mt-1 shrink-0 text-foreground/35 transition-colors group-hover:text-accent"
							/>
						</a>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section class="px-6 pb-24 sm:px-10 lg:px-20 lg:pb-28">
		<div class="mx-auto grid max-w-6xl items-stretch gap-8 lg:grid-cols-[minmax(0,1.3fr)_22rem]">
			<div class="overflow-hidden rounded-[2rem] border border-foreground/10 bg-white shadow-[0_24px_70px_foreground/10]">
				<iframe
					title="Casa Luma location map"
					src={mapEmbedUrl}
					allowfullscreen
					loading="lazy"
					referrerpolicy="no-referrer-when-downgrade"
					class="h-[420px] w-full border-0 lg:h-full lg:min-h-[460px]"
				></iframe>
			</div>

			<div class="rounded-[2rem] border border-foreground/10 bg-[#EFE8DA] p-7 shadow-[0_24px_70px_foreground/8] sm:p-8">
				<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/72">Follow us on socials</p>
				<p class="mt-5 text-3xl leading-tight text-foreground">See the space, the food, and the family moments.</p>
				<div class="mt-8 grid gap-3">
					{#each socialCards as card}
						<a
							href={card.href}
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-center justify-between rounded-[1.35rem] border border-foreground/10 bg-white/85 px-5 py-4 text-sm text-foreground transition-all duration-300 hover:border-accent/35 hover:bg-white"
						>
							<div class="flex items-center gap-3">
								<div class="rounded-full bg-foreground/8 p-2.5 text-foreground">
									<card.icon size={18} />
								</div>
								<span>{card.label}</span>
							</div>
							<ArrowUpRight size={16} class="text-foreground/40 transition-colors group-hover:text-accent" />
						</a>
					{/each}
				</div>
				<a
					href={`mailto:${BUSINESS_INFO.email}`}
					class="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
				>
					Email us
					<ArrowUpRight size={16} />
				</a>
			</div>
		</div>
	</section>
</div>
