<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import WebsiteMediaImage from '$lib/components/media/WebsiteMediaImage.svelte';
	import {
		BIRTHDAY_ACTIVITY_ADDONS,
		BIRTHDAY_BASE_PRICING,
		BIRTHDAY_BUFFET_SECTIONS,
		BIRTHDAY_PLAYGROUND_ADDON_COPY,
		BIRTHDAY_PLAYGROUND_PRICING,
		BIRTHDAY_SIMPLE_TABLE_NOTES,
		BIRTHDAY_SIMPLE_TABLE_UPGRADES
	} from '$lib/birthday-pricing';
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import { BUSINESS_INFO, GOOGLE_REVIEW_HIGHLIGHTS, SOCIAL_LINKS } from '$lib/constants';
	import { ArrowRight, ArrowUpRight, Check, Instagram, MapPin, Star } from 'lucide-svelte';

	const websiteMedia = getWebsiteMediaContext();
	const hasHeroImage = $derived(websiteMedia.has('home-birthday-image'));
	const hasCelebrationImage = $derived(websiteMedia.has('home-celebration-image'));

	const fallbackHeroImage =
		'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1400&auto=format&fit=crop';
	const fallbackCelebrationImage =
		'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?q=80&w=1400&auto=format&fit=crop';

	const highlights = [
		{
			title: 'A place children love',
			text: 'Garden, pool, and our indoor play area — room to move, explore, and enjoy the day together.'
		},
		{
			title: 'We handle the hosting',
			text: 'Food, cake, decorations, waiter, and music can all be taken care of so parents can be present.'
		},
		{
			title: 'You choose the shape',
			text: 'A full hosted party for up to 15 children, a smaller garden table for up to 8, and optional playground access.'
		}
	];

	const planningSteps = [
		{
			title: 'Date and guest count',
			text: 'Pick when you would like to celebrate and how many children are coming.'
		},
		{
			title: 'Playground add-on',
			text: 'Decide whether to include guaranteed indoor playground access — priced separately from the base.'
		},
		{
			title: 'Food and activities',
			text: 'Choose buffet options, simple-table upgrades, and any activity add-ons.'
		},
		{
			title: 'Send your request',
			text: 'Submit the booking form and we will confirm availability with you.'
		}
	];

	const review =
		GOOGLE_REVIEW_HIGHLIGHTS.find((entry) => entry.id === 'review-katalina-matus') ||
		GOOGLE_REVIEW_HIGHLIGHTS[0];

	const weekdayHostedWithPlayground =
		BIRTHDAY_BASE_PRICING.fullHosted.monSat + BIRTHDAY_PLAYGROUND_PRICING.fullHosted.flat;
</script>

<svelte:head>
	<title>Birthdays - Casa Luma</title>
	<meta
		name="description"
		content="Host a warm, playful birthday at Casa Luma with beautiful surroundings, flexible packages, and an easy booking form."
	/>
</svelte:head>

<div class="bg-background text-foreground selection:bg-accent selection:text-white overflow-hidden">
	<section class="relative px-6 pb-16 pt-24 sm:px-10 sm:pb-20 sm:pt-28 lg:px-20 lg:pb-24 lg:pt-32">
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			<div class="absolute left-[8%] top-16 h-44 w-44 rounded-full bg-accent/14 blur-3xl"></div>
			<div class="absolute right-[8%] top-10 h-72 w-72 rounded-full bg-primary/18 blur-3xl"></div>
		</div>

		<div class="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
			<div>
				<Reveal direction="up" trigger="load" skewX={0}>
					<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/70">Birthdays at Casa Luma</p>
				</Reveal>

				<Reveal direction="up" delay={90} trigger="load" skewX={0}>
					<h1 class="mt-5 max-w-4xl text-5xl leading-[0.9] tracking-tight sm:text-6xl lg:text-[5.5rem]">
						A birthday your child will
						<span class="italic text-accent">remember</span>
					</h1>
				</Reveal>

				<Reveal direction="up" delay={180} trigger="load" skewX={0}>
					<p class="mt-7 max-w-2xl text-lg leading-relaxed text-foreground/72 sm:text-xl">
						Casa Luma is a warm, natural setting for family celebrations — garden, pool, good food, and space
						for children to play. Choose what fits your party and book online.
					</p>
				</Reveal>

				<Reveal direction="up" delay={260} trigger="load" skewX={0}>
					<div class="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
						<a
							href="/birthdays/book"
							class="inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-3.5 text-sm uppercase tracking-[0.18em] text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-accent/90"
						>
							Book now
						</a>
						<a
							href="#birthday-details"
							class="inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap rounded-full border border-foreground/12 bg-white/70 px-6 py-3.5 text-sm uppercase tracking-[0.18em] text-foreground transition-transform duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:text-accent"
						>
							See packages
							<ArrowRight size={16} />
						</a>
					</div>
				</Reveal>
			</div>

			<Reveal direction="up" delay={180} trigger="load" class="relative" skewX={0}>
				<div class="relative mx-auto max-w-[34rem]">
					<div class="relative overflow-hidden rounded-[2.4rem] border border-foreground/8 bg-white p-3 shadow-[0_30px_100px_foreground/16]">
						<div class="aspect-[4/5] overflow-hidden rounded-[2rem] bg-muted">
							{#if hasHeroImage}
								<WebsiteMediaImage
									slug="home-birthday-image"
									alt="Birthday celebration at Casa Luma"
									class="h-full w-full"
									imageClass="h-full w-full object-cover"
									showPagination={false}
								/>
							{:else}
								<img src={fallbackHeroImage} alt="Birthday celebration at Casa Luma" class="h-full w-full object-cover" />
							{/if}
						</div>
					</div>
				</div>
			</Reveal>
		</div>
	</section>

	<section id="birthday-details" class="px-6 py-16 sm:px-10 lg:px-20 lg:py-20">
		<div class="mx-auto max-w-7xl">
			<Reveal direction="up" skewX={0}>
				<div class="mb-8 max-w-3xl">
					<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/70">Packages</p>
					<h2 class="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">What is included in the base price</h2>
					<p class="mt-4 text-base leading-relaxed text-foreground/68">
						Full hosted birthdays cover garden and pool for three hours, with food, cake, decorations, waiter,
						and music. Weekdays and Saturdays start lower; Sundays start higher because they are usually busier.
					</p>
				</div>
			</Reveal>

			<div class="grid gap-6 lg:grid-cols-2">
				<Reveal direction="up" class="rounded-[2.3rem] border border-foreground/8 bg-white p-8 shadow-[0_24px_80px_foreground/8] sm:p-10" skewX={0}>
					<p class="text-[11px] uppercase tracking-[0.26em] text-accent">Full hosted birthday</p>
					<h3 class="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">Up to 15 children</h3>
					<p class="mt-4 text-sm leading-relaxed text-foreground/70">
						Best when you want Casa Luma to host the day: garden, pool, food, cake, decorations,
						waiter, and music for three hours.
					</p>

					<div class="mt-7 grid gap-3 sm:grid-cols-2">
						<div class="rounded-[1.6rem] border border-foreground/8 bg-background p-5">
							<p class="text-[11px] uppercase tracking-[0.22em] text-foreground/55">Mon–Sat base</p>
							<p class="mt-3 text-3xl tracking-tight text-foreground">
								{BIRTHDAY_BASE_PRICING.fullHosted.monSat.toLocaleString()} THB
							</p>
							<p class="mt-2 text-xs leading-relaxed text-foreground/58">
								Add playground and the 15-child weekday total becomes {weekdayHostedWithPlayground.toLocaleString()} THB.
							</p>
						</div>
						<div class="rounded-[1.6rem] border border-foreground/8 bg-background p-5">
							<p class="text-[11px] uppercase tracking-[0.22em] text-foreground/55">Sunday base</p>
							<p class="mt-3 text-3xl tracking-tight text-foreground">
								{BIRTHDAY_BASE_PRICING.fullHosted.sunday.toLocaleString()} THB
							</p>
							<p class="mt-2 text-xs leading-relaxed text-foreground/58">
								Sundays start higher because they are usually busier.
							</p>
						</div>
					</div>

					<div class="mt-8 space-y-4">
						<div class="space-y-2">
							<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/55">Included in every hosted party</p>
							<ul class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-foreground/76">
								<li class="flex items-center gap-2"><Check size={14} class="text-accent" /> Garden & Pool</li>
								<li class="flex items-center gap-2"><Check size={14} class="text-accent" /> 3 hours duration</li>
								<li class="flex items-center gap-2"><Check size={14} class="text-accent" /> Buffet food</li>
								<li class="flex items-center gap-2"><Check size={14} class="text-accent" /> Birthday cake</li>
								<li class="flex items-center gap-2"><Check size={14} class="text-accent" /> Decorations</li>
								<li class="flex items-center gap-2"><Check size={14} class="text-accent" /> Dedicated waiter</li>
								<li class="flex items-center gap-2"><Check size={14} class="text-accent" /> Background music</li>
							</ul>
						</div>

						<div class="grid gap-4 sm:grid-cols-2 pt-2">
							<div class="rounded-[1.4rem] border border-foreground/8 bg-muted/30 p-4">
								<p class="text-[10px] uppercase tracking-[0.2em] text-foreground/50">Extra children</p>
								<p class="mt-2 text-sm leading-relaxed text-foreground/80">
									Mon–Sat: +{BIRTHDAY_BASE_PRICING.fullHosted.extraChildMonSat} THB<br />
									Sunday: +{BIRTHDAY_BASE_PRICING.fullHosted.extraChildSunday} THB
								</p>
							</div>
							<div class="rounded-[1.4rem] border border-accent/15 bg-accent/5 p-4">
								<p class="text-[10px] uppercase tracking-[0.2em] text-accent/70">Indoor playground</p>
								<p class="mt-2 text-sm leading-relaxed text-foreground/80">
									{BIRTHDAY_PLAYGROUND_ADDON_COPY.fullHosted}
								</p>
							</div>
						</div>
					</div>
				</Reveal>

				<Reveal direction="up" delay={80} class="rounded-[2.3rem] bg-foreground p-8 text-background shadow-[0_28px_80px_foreground/20] sm:p-10" skewX={0}>
					<p class="text-[11px] uppercase tracking-[0.26em] text-primary">Smaller setup</p>
					<h3 class="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">Up to 8 children</h3>
					<p class="mt-4 text-sm leading-relaxed text-background/75">
						A dedicated table in the garden. You bring decorations and cake, or add ours as upgrades.
					</p>
					<div class="mt-6 space-y-4">
						{#each BIRTHDAY_SIMPLE_TABLE_NOTES as note (note)}
							<div class="flex gap-3 text-background/80">
								<div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary">
									<Check size={14} />
								</div>
								<p class="text-base leading-relaxed">{note}</p>
							</div>
						{/each}
					</div>
					<div class="mt-8 pt-6 border-t border-white/10">
						<p class="text-sm font-medium text-primary">
							Starts from {BIRTHDAY_PLAYGROUND_PRICING.simpleTable.perChild} THB per child
						</p>
						<p class="mt-1 text-xs text-background/50 italic">
							(Assuming indoor playground add-on)
						</p>
					</div>
				</Reveal>
			</div>
		</div>
	</section>

	<Reveal direction="up" delay={100} skewX={0} class="flex justify-center pb-16">
		<a
			href="/birthdays/book"
			class="inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-8 py-4 text-base uppercase tracking-[0.18em] text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-accent/90 shadow-lg shadow-accent/20"
		>
			Plan your birthday now
			<ArrowRight size={18} />
		</a>
	</Reveal>

	<section class="px-6 py-8 sm:px-10 lg:px-20 lg:py-12">
		<div class="mx-auto max-w-7xl">
			<Reveal direction="up" skewX={0}>
				<p class="text-[11px] uppercase tracking-[0.26em] text-primary">Why families choose us</p>
				<h2 class="mt-4 max-w-2xl text-4xl leading-tight tracking-tight sm:text-5xl">
					Calm for parents, joy for children
				</h2>
			</Reveal>
			<div class="mt-10 grid gap-6 md:grid-cols-3">
				{#each highlights as item, index (item.title)}
					<Reveal direction="up" delay={index * 80} skewX={0}>
						<div class="h-full rounded-[2rem] border border-foreground/8 bg-white p-7 shadow-[0_18px_50px_foreground/7]">
							<h3 class="text-xl tracking-tight text-foreground">{item.title}</h3>
							<p class="mt-3 text-base leading-relaxed text-foreground/70">{item.text}</p>
						</div>
					</Reveal>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-6 py-8 sm:px-10 lg:px-20 lg:py-10">
		<div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
			<Reveal direction="up" class="rounded-[2.3rem] border border-foreground/8 bg-white p-7 shadow-[0_20px_70px_foreground/8] sm:p-8" skewX={0}>
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
					<p class="text-[11px] uppercase tracking-[0.28em] text-accent">Buffet menu</p>
					<p class="text-[10px] uppercase tracking-[0.15em] text-foreground/40 bg-muted/50 px-3 py-1 rounded-full">
						Included in all Full Hosted birthdays
					</p>
				</div>
				<div class="grid gap-6 sm:grid-cols-2">
					{#each BIRTHDAY_BUFFET_SECTIONS as section (section.title)}
						<div>
							<h3 class="text-xl tracking-tight text-foreground">{section.title}</h3>
							<ul class="mt-3 space-y-2 text-base leading-relaxed text-foreground/72">
								{#each section.items as item (item)}
									<li>{item}</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</Reveal>

			<Reveal direction="up" delay={80} class="rounded-[2.3rem] border border-foreground/8 bg-muted p-7 shadow-[0_20px_70px_foreground/6] sm:p-8" skewX={0}>
				<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/60 mb-6">Add-ons & Upgrades</p>
				
				<div class="space-y-6">
					<div>
						<p class="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-3">For all celebrations</p>
						<ul class="space-y-3 text-base leading-relaxed text-foreground/78">
							{#each BIRTHDAY_ACTIVITY_ADDONS as addon (addon.id)}
								<li>
									{addon.label} — 
									<span class="font-medium text-foreground">
										{addon.priceLabel ?? `${addon.price.toLocaleString()} THB`}
									</span>
								</li>
							{/each}
						</ul>
					</div>

					<div class="pt-6 border-t border-foreground/10">
						<p class="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-3">For Smaller Setup</p>
						<ul class="space-y-3 text-base leading-relaxed text-foreground/78">
							{#each BIRTHDAY_SIMPLE_TABLE_UPGRADES as upgrade (upgrade.id)}
								<li>
									{upgrade.label} — 
									<span class="font-medium text-foreground">
										{upgrade.flat ? `${upgrade.price} THB` : `${upgrade.pricePerChild} THB per kid`}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</Reveal>
		</div>
	</section>

	<section class="relative px-6 py-16 sm:px-10 lg:px-20 lg:py-20">
		<div class="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
			<Reveal direction="up" class="relative" skewX={0}>
				<div class="relative overflow-hidden rounded-[2.5rem] border border-foreground/8 bg-white p-3 shadow-[0_24px_70px_foreground/11]">
					<div class="aspect-[4/5] overflow-hidden rounded-[2rem] bg-muted">
						{#if hasCelebrationImage}
							<WebsiteMediaImage
								slug="home-celebration-image"
								alt="Families celebrating a birthday at Casa Luma"
								class="h-full w-full"
								imageClass="h-full w-full object-cover"
								showPagination={false}
							/>
						{:else}
							<img src={fallbackCelebrationImage} alt="Families celebrating a birthday at Casa Luma" class="h-full w-full object-cover" />
						{/if}
					</div>
				</div>
			</Reveal>

			<div>
				<Reveal direction="up" skewX={0}>
					<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/70">How booking works</p>
					<h2 class="mt-5 max-w-xl text-4xl leading-tight tracking-tight sm:text-5xl">
						A few steps, then we confirm with you
					</h2>
				</Reveal>

				<div class="mt-8 space-y-4">
					{#each planningSteps as step, index (step.title)}
						<Reveal direction="up" delay={index * 100} skewX={0}>
							<div class="flex gap-4 rounded-[1.8rem] border border-foreground/8 bg-white/80 p-5 shadow-[0_16px_40px_foreground/6] backdrop-blur-sm">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm uppercase tracking-[0.18em] text-background">
									0{index + 1}
								</div>
								<div>
									<h3 class="text-xl tracking-tight text-foreground">{step.title}</h3>
									<p class="mt-2 text-base leading-relaxed text-foreground/70">{step.text}</p>
								</div>
							</div>
						</Reveal>
					{/each}
				</div>

				<Reveal direction="up" delay={420} skewX={0}>
					<a
						href="/birthdays/book"
						class="mt-8 inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-3.5 text-sm uppercase tracking-[0.18em] text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-accent/90"
					>
						Calculate price and book
						<ArrowRight size={16} />
					</a>
				</Reveal>
			</div>
		</div>
	</section>

	<section class="px-6 py-16 sm:px-10 lg:px-20 lg:py-20">
		<div class="mx-auto max-w-6xl rounded-[2.5rem] border border-foreground/8 bg-white px-7 py-8 shadow-[0_24px_80px_foreground/8] sm:px-10 sm:py-10 lg:px-12">
			<div class="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
				<Reveal direction="up" skewX={0}>
					<p class="text-[11px] uppercase tracking-[0.28em] text-accent">From other parents</p>
					<h2 class="mt-4 text-3xl leading-tight tracking-tight sm:text-4xl">A day that feels easy and special</h2>
				</Reveal>

				<Reveal direction="up" delay={90} skewX={0}>
					<div class="rounded-[2rem] bg-background p-6 sm:p-8">
						<div class="flex items-center justify-between gap-4">
							<div>
								<p class="text-lg font-medium text-foreground">{review.author}</p>
								<div class="mt-2 flex items-center gap-1 text-primary">
									{#each Array(review.rating) as _, index (index)}
										<Star size={15} fill="currentColor" class="stroke-primary" />
									{/each}
								</div>
							</div>
							{#if review.reviewUrl}
								<a
									href={review.reviewUrl}
									target="_blank"
									rel="noreferrer"
									class="inline-flex items-center gap-1 rounded-full border border-foreground/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-foreground/65 transition-colors duration-300 hover:border-accent/30 hover:text-accent"
								>
									Original review
									<ArrowUpRight size={13} />
								</a>
							{/if}
						</div>
						<blockquote class="mt-5 text-lg leading-relaxed text-foreground/80">
							"{review.quote}"
						</blockquote>
					</div>
				</Reveal>
			</div>
		</div>
	</section>

	<section class="px-6 pb-24 pt-6 sm:px-10 lg:px-20 lg:pb-28">
		<div class="mx-auto max-w-6xl rounded-[2.8rem] bg-foreground px-7 py-10 text-background shadow-[0_32px_90px_foreground/18] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
			<div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
				<div>
					<Reveal direction="up" skewX={0}>
						<p class="text-[11px] uppercase tracking-[0.28em] text-primary">Ready to book</p>
						<h2 class="mt-4 max-w-2xl text-4xl leading-tight tracking-tight sm:text-5xl">
							Tell us about your child’s birthday
						</h2>
						<p class="mt-5 max-w-2xl text-base leading-relaxed text-background/75 sm:text-lg">
							Use the booking form for your preferred date, guest count, and options. We will get back to you
							to confirm at {BUSINESS_INFO.name}.
						</p>
					</Reveal>
				</div>

				<Reveal direction="up" delay={100} skewX={0}>
					<div class="rounded-[2rem] border border-white/10 bg-white/6 p-6">
						<div class="space-y-3 text-sm uppercase tracking-[0.22em] text-background/60">
							<div class="flex items-center gap-3">
								<MapPin size={16} class="text-primary" />
								<span>{BUSINESS_INFO.location}</span>
							</div>
						</div>
						<div class="mt-6 flex flex-col gap-3">
							<a
								href="/birthdays/book"
								class="inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 py-3.5 text-sm uppercase tracking-[0.18em] text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 hover:opacity-90"
							>
								Book now
							</a>
							<a
								href={SOCIAL_LINKS.instagram}
								target="_blank"
								rel="noreferrer"
								class="inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap rounded-full bg-background px-5 py-3 text-sm uppercase tracking-[0.18em] text-foreground transition-transform duration-300 hover:-translate-y-0.5 hover:bg-primary"
							>
								<Instagram size={16} />
								Message on Instagram
							</a>
							<a
								href={`mailto:${BUSINESS_INFO.email}`}
								class="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/14 px-5 py-3 text-sm uppercase tracking-[0.18em] text-background transition-colors duration-300 hover:border-primary hover:text-primary"
							>
								{BUSINESS_INFO.email}
							</a>
						</div>
					</div>
				</Reveal>
			</div>
		</div>
	</section>
</div>
