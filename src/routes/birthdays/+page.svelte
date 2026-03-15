<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import WebsiteMediaImage from '$lib/components/media/WebsiteMediaImage.svelte';
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import { BUSINESS_INFO, GOOGLE_REVIEW_HIGHLIGHTS, SOCIAL_LINKS } from '$lib/constants';
	import { ArrowRight, ArrowUpRight, Check, Instagram, MapPin, Sparkles, Star } from 'lucide-svelte';

	const websiteMedia = getWebsiteMediaContext();
	const hasHeroImage = $derived(websiteMedia.has('home-birthday-image'));
	const hasCelebrationImage = $derived(websiteMedia.has('home-celebration-image'));

	const fallbackHeroImage =
		'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1400&auto=format&fit=crop';
	const fallbackCelebrationImage =
		'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?q=80&w=1400&auto=format&fit=crop';

	const atmosphereNotes = [
		'Private celebrations in a space that already feels special before the first balloon is tied.',
		'Plenty of room for movement, play, pool time, and slow family moments between the big ones.',
		'Warm cafe hospitality so the celebration feels held, not hectic.'
	];

	const packageColumns = [
		{
			label: 'Mon-Sat',
			price: '12,000 THB',
			extraKids: '+700 THB / child',
			indoorPlayground: 'Included'
		},
		{
			label: 'Sunday',
			price: '10,000 THB',
			extraKids: '+500 THB / child',
			indoorPlayground: 'Not included'
		}
	];

	const packageRows = [
		{ label: 'Price', key: 'price' },
		{ label: 'Up to', value: '15 kids' },
		{ label: 'Venue areas', value: 'Garden & Pool' },
		{ label: 'Duration', value: '3 hours' },
		{ label: 'Food & cake', value: 'Included' },
		{ label: 'Waiter', value: 'Included' },
		{ label: 'Decorations', value: 'Included' },
		{ label: 'Music', value: 'Included' },
		{ label: 'Extra kids', key: 'extraKids' },
		{ label: 'Indoor playground', key: 'indoorPlayground' }
	] as const;

	const miniOffer = [
		'Dedicated table provided',
		'Playground paid separately',
		'You handle decorations and cake',
		'10% off playground access'
	];

	const buffetSections = [
		{
			title: 'Starters',
			items: ['Fresh veggie sticks with dips', 'Chopped salad']
		},
		{
			title: 'Dessert',
			items: ['Birthday cake', 'Fruit platter']
		},
		{
			title: 'Main course (choose one)',
			items: ['Nuggets & fries', 'Hot dogs', 'Mixed sandwiches (avocado / cheese / veggies / ham)']
		},
		{
			title: 'Drinks',
			items: ['Water jar', 'Juice jar']
		}
	];

	const addOns = [
		'Buffet - 500 THB per kid',
		'Extra cake - 700 THB',
		'Decorations - 500 THB',
		'Face painting - 3,000 THB',
		'Movement activity (ages 5+) - 5,000 THB',
		'Planting & craft workshop - from 6,000 THB'
	];

	const celebrationElements = [
		{
			title: 'A beautiful setting',
			text: 'Soft interiors, natural light, garden energy, and a playful atmosphere that still feels composed.'
		},
		{
			title: 'Room to play',
			text: 'Children can move through play areas, explore, and settle into the celebration in their own rhythm.'
		},
		{
			title: 'Easy for grown-ups',
			text: 'Parents can gather, enjoy food and drinks, and actually be part of the day instead of managing every detail.'
		},
		{
			title: 'Flexible planning',
			text: 'We can shape the mood, timing, and flow around the kind of birthday you want to host.'
		}
	];

	const planningSteps = [
		{
			title: 'Choose the format',
			text: 'Pick the main package or the smaller setup for up to 8 kids.'
		},
		{
			title: 'Add the extras',
			text: 'Select buffet, cake, decorations, or one of the activity add-ons.'
		},
		{
			title: 'Confirm your space use',
			text: 'Choose whether to include the indoor playground when available, or keep it garden-focused.'
		}
	];

	const review =
		GOOGLE_REVIEW_HIGHLIGHTS.find((entry) => entry.id === 'review-katalina-matus') ||
		GOOGLE_REVIEW_HIGHLIGHTS[0];
</script>

<svelte:head>
	<title>Birthdays - Casa Luma</title>
	<meta
		name="description"
		content="Host a warm, playful birthday at Casa Luma with beautiful surroundings, room to explore, and a celebration that feels easy for the whole family."
	/>
</svelte:head>

<div class="bg-background text-foreground selection:bg-accent selection:text-white overflow-hidden">
	<section class="relative px-6 pb-16 pt-24 sm:px-10 sm:pb-20 sm:pt-28 lg:px-20 lg:pb-24 lg:pt-32">
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			<div class="absolute left-[8%] top-16 h-44 w-44 rounded-full bg-accent/14 blur-3xl"></div>
			<div class="absolute right-[8%] top-10 h-72 w-72 rounded-full bg-primary/18 blur-3xl"></div>
			<div
				class="absolute bottom-10 left-1/3 h-56 w-80 bg-secondary/14 blur-3xl"
				style:border-radius="42% 58% 50% 50% / 51% 42% 58% 49%"
			></div>
		</div>

		<div class="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
			<div>
				<Reveal direction="up" trigger="load" skewX={0}>
					<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/70">Birthdays at Casa Luma</p>
				</Reveal>

				<Reveal direction="up" delay={90} trigger="load" skewX={0}>
					<h1 class="mt-5 max-w-4xl text-5xl leading-[0.9] tracking-tight sm:text-6xl lg:text-[5.5rem]">
						Birthday details,
						<span class="italic text-accent">clearly</span>
						laid out.
					</h1>
				</Reveal>

				<Reveal direction="up" delay={180} trigger="load" skewX={0}>
					<p class="mt-7 max-w-2xl text-lg leading-relaxed text-foreground/72 sm:text-xl">
						For families who already know Casa Luma and just want the practicals: packages, buffet options,
						add-ons, and what is included.
					</p>
				</Reveal>

				<Reveal direction="up" delay={260} trigger="load" skewX={0}>
					<div class="mt-9 flex flex-col gap-3 sm:flex-row">
						<a
							href={SOCIAL_LINKS.instagram}
							target="_blank"
							rel="noreferrer"
							class="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm uppercase tracking-[0.18em] text-background transition-transform duration-300 hover:-translate-y-0.5 hover:bg-accent"
						>
							<Instagram size={16} />
							Ask about dates
						</a>
						<a
							href="#birthday-details"
							class="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/12 bg-white/70 px-6 py-3.5 text-sm uppercase tracking-[0.18em] text-foreground transition-transform duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:text-accent"
						>
							See packages
							<ArrowRight size={16} />
						</a>
					</div>
				</Reveal>

				<Reveal direction="up" delay={340} trigger="load" skewX={0}>
					<div class="mt-10 grid gap-4 sm:grid-cols-3">
						<div class="rounded-[1.6rem] border border-foreground/8 bg-white/80 p-5 shadow-[0_20px_50px_foreground/7] backdrop-blur-sm">
							<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/55">Atmosphere</p>
							<p class="mt-3 text-base leading-relaxed text-foreground">Up to 15 kids in the main package.</p>
						</div>
						<div class="rounded-[1.6rem] border border-foreground/8 bg-white/80 p-5 shadow-[0_20px_50px_foreground/7] backdrop-blur-sm">
							<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/55">For Families</p>
							<p class="mt-3 text-base leading-relaxed text-foreground">3 hours, food, cake, waiter, decorations, music.</p>
						</div>
						<div class="rounded-[1.6rem] border border-foreground/8 bg-white/80 p-5 shadow-[0_20px_50px_foreground/7] backdrop-blur-sm">
							<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/55">Planning</p>
							<p class="mt-3 text-base leading-relaxed text-foreground">Indoor playground included Mon-Sat, not included Sunday.</p>
						</div>
					</div>
				</Reveal>
			</div>

			<Reveal direction="up" delay={180} trigger="load" class="relative" skewX={0}>
				<div class="relative mx-auto max-w-[34rem]">
					<div class="absolute -left-6 top-10 h-32 w-32 rounded-full border border-accent/18 bg-white/70 blur-sm"></div>
					<div class="absolute -right-3 bottom-12 h-24 w-24 rounded-[35%_65%_58%_42%_/_45%_46%_54%_55%] bg-primary/28 blur-xl"></div>
					<div class="relative overflow-hidden rounded-[2.4rem] border border-foreground/8 bg-white p-3 shadow-[0_30px_100px_foreground/16]">
						<div class="overflow-hidden rounded-[2rem] bg-muted aspect-[4/5]">
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

					<div class="absolute -bottom-6 -left-2 max-w-xs rounded-[1.8rem] border border-foreground/8 bg-popover/95 p-5 shadow-[0_18px_50px_foreground/12] backdrop-blur-sm">
						<p class="text-[11px] uppercase tracking-[0.24em] text-accent">The feeling</p>
						<p class="mt-3 text-base leading-relaxed text-foreground/78">
							Booking is especially useful when you want guaranteed indoor playground access, since capacity there is limited.
						</p>
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
					<h2 class="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">The details most parents are looking for.</h2>
				</div>
			</Reveal>

			<div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
				<Reveal direction="up" class="rounded-[2.3rem] border border-foreground/8 bg-white p-6 shadow-[0_24px_80px_foreground/8] sm:p-8" skewX={0}>
					<div class="grid gap-4 md:grid-cols-2">
						{#each packageColumns as column}
							<div class="rounded-[1.8rem] border border-foreground/8 bg-background p-5">
								<p class="text-[11px] uppercase tracking-[0.26em] text-foreground/55">{column.label}</p>
								<p class="mt-3 text-3xl tracking-tight text-foreground">{column.price}</p>
							</div>
						{/each}
					</div>
					<p class="mt-5 text-sm leading-relaxed text-foreground/62">
						The indoor playground has limited capacity, so booking the package guarantees your spot when that access is included.
					</p>
					<div class="mt-6 overflow-hidden rounded-[1.8rem] border border-foreground/8">
						<div class="grid grid-cols-[1.05fr_0.95fr_0.95fr] bg-foreground px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-background/70">
							<div>Included</div>
							<div>Mon-Sat</div>
							<div>Sunday</div>
						</div>
						{#each packageRows as row}
							<div class="grid grid-cols-[1.05fr_0.95fr_0.95fr] border-t border-foreground/8 px-5 py-3.5 text-sm text-foreground/78">
								<div class="font-medium text-foreground">{row.label}</div>
								<div>{row.key ? packageColumns[0][row.key] : row.value}</div>
								<div>{row.key ? packageColumns[1][row.key] : row.value}</div>
							</div>
						{/each}
					</div>
				</Reveal>

				<Reveal direction="up" delay={80} class="rounded-[2.3rem] bg-foreground p-8 text-background shadow-[0_28px_80px_foreground/20] sm:p-10" skewX={0}>
					<p class="text-[11px] uppercase tracking-[0.26em] text-primary">Smaller setup</p>
					<h3 class="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">Offer for up to 8 kids</h3>
					<div class="mt-6 space-y-4">
						{#each miniOffer as note}
							<div class="flex gap-3 text-background/80">
								<div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary">
									<Check size={14} />
								</div>
								<p class="text-base leading-relaxed">{note}</p>
							</div>
						{/each}
					</div>
				</Reveal>
			</div>
		</div>
	</section>

	<section class="px-6 py-8 sm:px-10 lg:px-20 lg:py-10">
		<div class="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
			<Reveal direction="up" class="rounded-[2.3rem] bg-foreground p-8 text-background shadow-[0_28px_80px_foreground/20] sm:p-10" skewX={0}>
				<p class="text-[11px] uppercase tracking-[0.26em] text-primary">Why it feels special</p>
				<h2 class="mt-5 max-w-lg text-4xl leading-tight tracking-tight sm:text-5xl">
					A birthday rhythm that feels natural from start to finish.
				</h2>
				<div class="mt-8 space-y-5">
					{#each atmosphereNotes as note}
						<div class="flex gap-3 text-background/80">
							<div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary">
								<Check size={14} />
							</div>
							<p class="text-base leading-relaxed">{note}</p>
						</div>
					{/each}
				</div>
				<div class="mt-10 rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
					<p class="text-[11px] uppercase tracking-[0.24em] text-primary">Good to know</p>
					<p class="mt-3 text-sm leading-relaxed text-background/74">
						Depending on the celebration, you can include the indoor playground or keep things focused on the lush garden and pool for a more open-air setup.
					</p>
				</div>
			</Reveal>

			<div class="grid gap-5 sm:grid-cols-2">
				{#each celebrationElements as item, index (item.title)}
					<Reveal direction="up" delay={index * 90} class="h-full" skewX={0}>
						<div class="h-full rounded-[2rem] border border-foreground/8 bg-white p-7 shadow-[0_18px_50px_foreground/7] transition-transform duration-300 hover:-translate-y-1">
							<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-accent">
								<Sparkles size={18} />
							</div>
							<h3 class="mt-5 text-2xl tracking-tight text-foreground">{item.title}</h3>
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
				<p class="text-[11px] uppercase tracking-[0.28em] text-accent">Buffet menu</p>
				<div class="mt-6 grid gap-6 sm:grid-cols-2">
					{#each buffetSections as section}
						<div>
							<h3 class="text-xl tracking-tight text-foreground">{section.title}</h3>
							<ul class="mt-3 space-y-2 text-base leading-relaxed text-foreground/72">
								{#each section.items as item}
									<li>{item}</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</Reveal>

			<Reveal direction="up" delay={80} class="rounded-[2.3rem] border border-foreground/8 bg-muted p-7 shadow-[0_20px_70px_foreground/6] sm:p-8" skewX={0}>
				<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/60">Add-ons</p>
				<ul class="mt-5 space-y-3 text-base leading-relaxed text-foreground/78">
					{#each addOns as item}
						<li>{item}</li>
					{/each}
				</ul>
			</Reveal>
		</div>
	</section>

	<section class="relative px-6 py-16 sm:px-10 lg:px-20 lg:py-20">
		<div class="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
			<Reveal direction="up" class="relative" skewX={0}>
				<div class="absolute -left-6 top-8 h-28 w-28 rounded-full bg-secondary/20 blur-2xl"></div>
				<div class="relative overflow-hidden rounded-[2.5rem] border border-foreground/8 bg-white p-3 shadow-[0_24px_70px_foreground/11]">
					<div class="aspect-[2/4] overflow-hidden rounded-[2rem] bg-muted">
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
					<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/70">Planning flow</p>
					<h2 class="mt-5 max-w-xl text-4xl leading-tight tracking-tight sm:text-5xl">
						A simple way to lock it in.
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
			</div>
		</div>
	</section>

	<section class="px-6 py-16 sm:px-10 lg:px-20 lg:py-20">
		<div class="mx-auto max-w-6xl rounded-[2.5rem] border border-foreground/8 bg-white px-7 py-8 shadow-[0_24px_80px_foreground/8] sm:px-10 sm:py-10 lg:px-12">
			<div class="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
				<Reveal direction="up" skewX={0}>
					<p class="text-[11px] uppercase tracking-[0.28em] text-accent">Family words</p>
					<h2 class="mt-4 text-3xl leading-tight tracking-tight sm:text-4xl">Parents remember the feeling as much as the birthday itself.</h2>
				</Reveal>

				<Reveal direction="up" delay={90} skewX={0}>
					<div class="rounded-[2rem] bg-background p-6 sm:p-8">
						<div class="flex items-center justify-between gap-4">
							<div>
								<p class="text-lg font-medium text-foreground">{review.author}</p>
								<div class="mt-2 flex items-center gap-1 text-primary">
									{#each Array(review.rating) as _}
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
						<p class="text-[11px] uppercase tracking-[0.28em] text-primary">Ready to shape it</p>
						<h2 class="mt-4 max-w-2xl text-4xl leading-tight tracking-tight sm:text-5xl">
							Let us turn the next birthday into a beautiful family day.
						</h2>
						<p class="mt-5 max-w-2xl text-base leading-relaxed text-background/75 sm:text-lg">
							Message us with your preferred date, age, and guest rhythm, and we will help shape the best version of it at {BUSINESS_INFO.name}.
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
								href={SOCIAL_LINKS.instagram}
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-3 text-sm uppercase tracking-[0.18em] text-foreground transition-transform duration-300 hover:-translate-y-0.5 hover:bg-primary"
							>
								<Instagram size={16} />
								Message on Instagram
							</a>
							<a
								href={`mailto:${BUSINESS_INFO.email}`}
								class="inline-flex items-center justify-center rounded-full border border-white/14 px-5 py-3 text-sm uppercase tracking-[0.18em] text-background transition-colors duration-300 hover:border-primary hover:text-primary"
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
