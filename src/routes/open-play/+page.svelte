<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import WebsiteMediaImage from '$lib/components/media/WebsiteMediaImage.svelte';
	import MembershipPricing from '$lib/components/pricing/MembershipPricing.svelte';
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import { ArrowRight, Check, Sparkles } from 'lucide-svelte';

	const websiteMedia = getWebsiteMediaContext();
	const hasHeroImage = $derived(websiteMedia.has('open-play-hero-image'));

	const fallbackHeroImage =
		'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=1400&q=80&auto=format&fit=crop';

	const featuredMoments = [
		{
			title: 'Warm, open environment',
			copy: 'Bright, welcoming rooms that let children settle in quickly and explore at their own pace.',
			slug: 'open-play-gallery-warm-environment',
			src: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=1200&q=80',
			alt: 'Children playing together in a bright indoor playground'
		},
		{
			title: 'Movement + imagination',
			copy: 'Climbing, pretend play, and active moments all live comfortably in the same visit.',
			slug: 'open-play-gallery-movement-imagination',
			src: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=1200&q=80',
			alt: 'Child climbing and exploring a playful activity setup'
		},
		{
			title: 'Creative daily moments',
			copy: 'Art, making, and sensory exploration invite children into slower, focused play.',
			slug: 'open-play-gallery-creative-moments',
			src: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=1200&q=80',
			alt: 'Children making art and crafts at a table'
		},
		{
			title: 'Social play and confidence',
			copy: 'Shared play gives children room to build confidence, curiosity, and connection.',
			slug: 'open-play-gallery-social-confidence',
			src: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80',
			alt: 'Small group of children collaborating during play'
		}
	];

	const spaces = [
		{
			name: 'Main Hall',
			tag: 'Movement, books, and pretend play',
			description:
				'A flexible all-ages zone where children can move, imagine, and settle into calmer moments.',
			slug: 'open-play-space-main-hall',
			image: 'https://images.unsplash.com/photo-1542816417-09836799b704?w=1200&q=80',
			glow: 'rgba(223,188,105,0.24)'
		},
		{
			name: 'Game Room',
			tag: 'STEM + board games (ages 3+)',
			description:
				'For curious thinkers who love challenge, teamwork, and problem-solving through playful games.',
			slug: 'open-play-space-game-room',
			image: 'https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?w=1200&q=80',
			glow: 'rgba(168,195,160,0.32)'
		},
		{
			name: 'Art Room',
			tag: 'Open-ended making and expression',
			description:
				'A ready-to-create studio for painting, crafting, sensory play, and big imagination.',
			slug: 'open-play-space-art-room',
			image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200&q=80',
			glow: 'rgba(224,122,95,0.24)'
		}
	];

	const careNotes = [
		{
			label: 'Caring team',
			title: 'Supervisors who stay present',
			text: 'Our team is visible throughout the session, supporting children and helping families feel at ease.'
		},
		{
			label: 'Safety first',
			title: 'Cleanliness + non-sick policy',
			text: 'We clean and reset spaces daily and take illness prevention seriously so the environment stays comfortable for everyone.'
		},
		{
			label: 'Built for development',
			title: 'Play that grows with children',
			text: 'From movement and social play to focus and creativity, children can choose experiences that match their age, mood, and confidence.'
		}
	];
</script>

<svelte:head>
	<title>Open Play - Casa Luma</title>
	<meta
		name="description"
		content="Open Play at Casa Luma is a warm, safe, and varied play experience for children with caring supervisors, creative spaces, and family-friendly pricing."
	/>
</svelte:head>

<div class="overflow-hidden bg-background text-foreground selection:bg-accent selection:text-white">
	<section class="relative px-6 pb-20 pt-24 sm:px-10 sm:pb-24 sm:pt-28 lg:px-20 lg:pb-28 lg:pt-32">
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			<div class="absolute left-[6%] top-12 h-48 w-48 rounded-full bg-primary/18 blur-3xl"></div>
			<div class="absolute right-[8%] top-10 h-72 w-72 rounded-full bg-secondary/20 blur-3xl"></div>
			<div
				class="absolute bottom-8 left-1/3 h-56 w-80 bg-accent/12 blur-3xl"
				style:border-radius="40% 60% 45% 55% / 52% 41% 59% 48%"
			></div>
		</div>

		<div class="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
			<div>
				<Reveal direction="up" trigger="load" skewX={0}>
					<p class="text-lg uppercase tracking-[0.28em] text-foreground/68">A.K.A - The Playground</p>
				</Reveal>

				<Reveal direction="up" delay={90} trigger="load" skewX={0}>
					<h1 class="mt-5 max-w-4xl text-5xl leading-[0.9] tracking-tight sm:text-6xl lg:text-[5.5rem]">
						A calm place for
						<span class="italic text-accent">movement, wonder,</span>
						and everyday family ease.
					</h1>
				</Reveal>

				<Reveal direction="up" delay={180} trigger="load" skewX={0}>
					<p class="mt-7 max-w-2xl text-lg leading-relaxed text-foreground/72 sm:text-xl">
						Our Open Play area (the indoor playground) is designed for children who want variety and for parents who want the visit to feel
						beautifully held from the moment they arrive.
					</p>
				</Reveal>

				<Reveal direction="up" delay={260} trigger="load" skewX={0}>
					<div class="mt-9 flex flex-col gap-3 sm:flex-row">
						<a
							href="#pricing"
							class="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm uppercase tracking-[0.18em] text-background transition-transform duration-300 hover:-translate-y-0.5 hover:bg-accent"
						>
							See passes
							<ArrowRight size={16} />
						</a>
						<a
							href="#spaces"
							class="inline-flex items-center justify-center rounded-full border border-foreground/12 bg-white/70 px-6 py-3.5 text-sm uppercase tracking-[0.18em] text-foreground transition-transform duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:text-accent"
						>
							Explore the spaces
						</a>
					</div>
				</Reveal>

				<Reveal direction="up" delay={340} trigger="load" skewX={0}>
					<div class="mt-10 grid gap-4 sm:grid-cols-3">
						<div class="rounded-[1.6rem] border border-foreground/8 bg-white/80 p-5 shadow-[0_20px_50px_rgba(45,58,58,0.07)] backdrop-blur-sm">
							<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/55">Supervised</p>
							<p class="mt-3 text-base leading-relaxed text-foreground">Supportive staff present throughout play.</p>
						</div>
						<div class="rounded-[1.6rem] border border-foreground/8 bg-white/80 p-5 shadow-[0_20px_50px_rgba(45,58,58,0.07)] backdrop-blur-sm">
							<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/55">Varied</p>
							<p class="mt-3 text-base leading-relaxed text-foreground">Movement, games, art, and calmer corners in one visit.</p>
						</div>
						<div class="rounded-[1.6rem] border border-foreground/8 bg-white/80 p-5 shadow-[0_20px_50px_rgba(45,58,58,0.07)] backdrop-blur-sm">
							<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/55">Family-friendly</p>
							<p class="mt-3 text-base leading-relaxed text-foreground">Flexible pricing for short visits, full days, or routines.</p>
						</div>
					</div>
				</Reveal>
			</div>

			<Reveal direction="up" delay={180} trigger="load" class="relative" skewX={0}>
				<div class="relative mx-auto max-w-[35rem]">
					<div class="absolute -left-8 top-10 h-32 w-32 rounded-full border border-accent/18 bg-white/60 blur-sm"></div>
					<div class="absolute -right-2 bottom-14 h-28 w-28 rounded-[38%_62%_55%_45%_/_43%_47%_53%_57%] bg-primary/24 blur-xl"></div>
					<div class="relative overflow-hidden rounded-[2.5rem] border border-foreground/8 bg-white p-3 shadow-[0_30px_100px_rgba(45,58,58,0.14)]">
						<div class="aspect-[4/5] overflow-hidden rounded-[2rem] bg-muted">
							{#if hasHeroImage}
								<WebsiteMediaImage
									slug="open-play-hero-image"
									alt="Children enjoying open play at Casa Luma"
									class="h-full w-full"
									imageClass="h-full w-full object-cover"
									showPagination={false}
								/>
							{:else}
								<img src={fallbackHeroImage} alt="Children enjoying open play at Casa Luma" class="h-full w-full object-cover" />
							{/if}
						</div>
					</div>

					<div class="absolute -bottom-7 -left-2 max-w-xs rounded-[1.8rem] border border-foreground/8 bg-popover/95 p-5 shadow-[0_18px_50px_rgba(45,58,58,0.12)] backdrop-blur-sm">
						<p class="text-[11px] uppercase tracking-[0.24em] text-accent">What families notice</p>
						<p class="mt-3 text-base leading-relaxed text-foreground/78">
							A visit can be quick and playful or stretch into a slower day with room for different moods.
						</p>
					</div>
				</div>
			</Reveal>
		</div>
	</section>

	<section class="bg-white/65 px-6 py-16 sm:px-10 lg:px-20 lg:py-20">
		<div class="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
			<Reveal direction="up" class="rounded-[2.4rem] bg-foreground p-8 text-background shadow-[0_28px_80px_rgba(45,58,58,0.18)] sm:p-10" skewX={0}>
				<p class="text-[11px] uppercase tracking-[0.28em] text-primary">The feeling</p>
				<h2 class="mt-5 max-w-lg text-4xl leading-tight tracking-tight sm:text-5xl">
					Made for movement, wonder, and confidence.
				</h2>
				<p class="mt-6 max-w-xl text-base leading-relaxed text-background/76 sm:text-lg">
					Casa Luma is not a single-purpose playground. It is a thoughtful environment where children can shift
					between active play, social play, and quieter creative moments without the visit feeling chaotic.
				</p>
				<div class="mt-8 space-y-4">
					{#each careNotes.slice(0, 2) as note}
						<div class="flex gap-3 text-background/80">
							<div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary">
								<Check size={14} />
							</div>
							<div>
								<p class="text-[11px] uppercase tracking-[0.24em] text-primary/80">{note.label}</p>
								<p class="mt-2 text-base leading-relaxed">{note.text}</p>
							</div>
						</div>
					{/each}
				</div>
			</Reveal>

			<div class="grid gap-5 sm:grid-cols-2">
				{#each featuredMoments as moment, index (moment.title)}
					<Reveal direction="up" delay={index * 90} class={index === 0 ? 'sm:col-span-2' : ''} skewX={0}>
						<article class="group relative overflow-hidden rounded-[2.1rem] border border-foreground/8 bg-white p-3 shadow-[0_20px_60px_rgba(45,58,58,0.08)]">
							<div class={`overflow-hidden ${index === 0 ? 'aspect-[16/9] rounded-[1.7rem]' : 'aspect-[4/5] rounded-[1.7rem]'}`}>
								{#if websiteMedia.has(moment.slug)}
									<WebsiteMediaImage
										slug={moment.slug}
										alt={moment.alt}
										class="h-full w-full"
										imageClass="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
										showPagination={false}
									/>
								{:else}
									<img
										src={moment.src}
										alt={moment.alt}
										class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
										loading="lazy"
									/>
								{/if}
							</div>
							<div class="px-3 pb-3 pt-5 sm:px-4">
								<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/52">Open Play</p>
								<h3 class="mt-2 text-2xl tracking-tight text-foreground">{moment.title}</h3>
								<p class="mt-3 max-w-md text-base leading-relaxed text-foreground/68">{moment.copy}</p>
							</div>
						</article>
					</Reveal>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-6 py-16 sm:px-10 lg:px-20 lg:py-20">
		<div class="mx-auto max-w-7xl">
			<Reveal direction="up" skewX={0}>
				<div class="max-w-3xl">
					<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/70">Why families return</p>
					<h2 class="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
						Thoughtful details that make the day feel easy.
					</h2>
				</div>
			</Reveal>

			<div class="mt-10 grid gap-5 md:grid-cols-3">
				{#each careNotes as note, index (note.title)}
					<Reveal direction="up" delay={index * 90} class="h-full" skewX={0}>
						<div class="h-full rounded-[2rem] border border-foreground/8 bg-white p-7 shadow-[0_18px_50px_rgba(45,58,58,0.07)] transition-transform duration-300 hover:-translate-y-1">
							<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-accent">
								<Sparkles size={18} />
							</div>
							<p class="mt-5 text-[11px] uppercase tracking-[0.26em] text-foreground/55">{note.label}</p>
							<h3 class="mt-3 text-2xl tracking-tight text-foreground">{note.title}</h3>
							<p class="mt-3 text-base leading-relaxed text-foreground/70">{note.text}</p>
						</div>
					</Reveal>
				{/each}
			</div>
		</div>
	</section>

	<section id="spaces" class="bg-white/65 px-6 py-16 sm:px-10 lg:px-20 lg:py-20">
		<div class="mx-auto max-w-7xl">
			<Reveal direction="up" skewX={0}>
				<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div class="max-w-3xl">
						<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/70">Three distinct spaces</p>
						<h2 class="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
							Different energies, one beautifully connected environment.
						</h2>
					</div>
					<p class="max-w-xl text-base leading-relaxed text-foreground/68 sm:text-lg">
						Each room brings its own play rhythm, so children can follow what fits them best in the moment.
					</p>
				</div>
			</Reveal>

			<div class="mt-10 grid gap-6 xl:grid-cols-3">
				{#each spaces as space, index (space.name)}
					<Reveal direction="up" delay={index * 100} skewX={0}>
						<article class="group relative overflow-hidden rounded-[2.2rem] border border-foreground/8 bg-white p-3 shadow-[0_24px_70px_rgba(45,58,58,0.08)] transition-transform duration-300 hover:-translate-y-1">
							<div class="absolute right-5 top-5 h-24 w-24 rounded-full blur-2xl" style={`background:${space.glow};`}></div>
							<div class="relative overflow-hidden rounded-[1.8rem] bg-muted aspect-[4/3]">
								{#if websiteMedia.has(space.slug)}
									<WebsiteMediaImage
										slug={space.slug}
										alt={space.name}
										class="h-full w-full"
										imageClass="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
										showPagination={false}
									/>
								{:else}
									<img
										src={space.image}
										alt={space.name}
										class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
										loading="lazy"
									/>
								{/if}
							</div>
							<div class="relative px-3 pb-3 pt-5 sm:px-4">
								<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/55">{space.tag}</p>
								<h3 class="mt-3 text-3xl tracking-tight text-foreground">{space.name}</h3>
								<p class="mt-3 text-base leading-relaxed text-foreground/70">{space.description}</p>
								<a href="#pricing" class="mt-5 inline-flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-foreground/68 transition-colors hover:text-accent">
									See passes
									<ArrowRight size={15} />
								</a>
							</div>
						</article>
					</Reveal>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-6 py-16 sm:px-10 lg:px-20 lg:py-20">
		<div class="mx-auto max-w-6xl rounded-[2.8rem] bg-foreground px-7 py-10 text-background shadow-[0_32px_90px_rgba(45,58,58,0.18)] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
			<div class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
				<Reveal direction="up" skewX={0}>
					<p class="text-[11px] uppercase tracking-[0.28em] text-primary">Designed for families</p>
					<h2 class="mt-4 max-w-2xl text-4xl leading-tight tracking-tight sm:text-5xl">
						Come for play, stay for the feeling.
					</h2>
					<p class="mt-5 max-w-2xl text-base leading-relaxed text-background/75 sm:text-lg">
						Children get variety and room to grow. Parents get peace of mind, warm hospitality, and a place that feels intentionally prepared.
					</p>
				</Reveal>

				<Reveal direction="up" delay={90} skewX={0}>
					<div class="rounded-[2rem] border border-white/10 bg-white/6 p-6">
						<p class="text-[11px] uppercase tracking-[0.24em] text-background/58">Good for</p>
						<div class="mt-4 space-y-3 text-base leading-relaxed text-background/78">
							<p>Quick drop-ins when you need an easy hour out.</p>
							<p>Slower full days when children want room to settle, play, and shift pace.</p>
							<p>Regular routines with passes that make repeat visits feel simple.</p>
						</div>
					</div>
				</Reveal>
			</div>
		</div>
	</section>

	<section id="pricing" class="pb-20 pt-2 sm:pb-24">
		<MembershipPricing showHeader={false} />
	</section>
</div>
