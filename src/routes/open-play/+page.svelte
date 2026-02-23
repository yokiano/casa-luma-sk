<script lang="ts">
	import MembershipPricing from '$lib/components/pricing/MembershipPricing.svelte';

	const featuredMoments = [
		{
			title: 'Warm, open environment',
			src: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=1200&q=80',
			alt: 'Children playing together in a bright indoor playground'
		},
		{
			title: 'Movement + imagination',
			src: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=1200&q=80',
			alt: 'Child climbing and exploring a playful activity setup'
		},
		{
			title: 'Creative daily moments',
			src: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=1200&q=80',
			alt: 'Children making art and crafts at a table'
		},
		{
			title: 'Social play and confidence',
			src: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80',
			alt: 'Small group of children collaborating during play'
		}
	];

	const spaces = [
		{
			name: 'Main Hall',
			tag: 'Movement, books, and pretend play',
			description: 'A flexible all-ages zone where children can move, imagine, and settle into calm moments.',
			image: 'https://images.unsplash.com/photo-1542816417-09836799b704?w=1200&q=80',
			color: '#dfbc69'
		},
		{
			name: 'Game Room',
			tag: 'STEM + board games (ages 3+)',
			description:
				'For curious thinkers who love challenge, teamwork, and problem-solving through playful games.',
			image: 'https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?w=1200&q=80',
			color: '#A8C3A0'
		},
		{
			name: 'Art Room',
			tag: 'Open-ended making and expression',
			description: 'A ready-to-create studio for painting, crafting, sensory play, and big imagination.',
			image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200&q=80',
			color: '#E07A5F'
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

<div class="overflow-hidden bg-[#F9F7F2] text-[#2D3A3A] selection:bg-[#E07A5F] selection:text-white">
	<section class="relative px-4 pb-20 pt-24 md:pt-28">
		<div class="pointer-events-none absolute inset-0">
			<div
				class="absolute -left-16 -top-20 h-64 w-64 rounded-full blur-3xl"
				style="background: linear-gradient(145deg, #dfbc6948, #dfbc6910);"
			></div>
			<div
				class="absolute right-0 top-16 h-72 w-72 rounded-full blur-3xl"
				style="background: linear-gradient(145deg, #A8C3A040, #A8C3A010);"
			></div>
		</div>

		<div class="relative mx-auto max-w-6xl">
			<div class="grid items-center gap-12 lg:grid-cols-12">
				<div class="lg:col-span-7">
					<p class="mb-4 text-sm uppercase tracking-[0.22em] text-[#2D3A3A]/65">Casa Luma Open Play</p>
					<h1 class="mb-7 text-5xl font-light leading-[0.95] text-[#2D3A3A] md:text-7xl lg:text-8xl">
						A warm, safe place
						<span class="relative ml-2 inline-block text-[#dfbc69]">
							to grow through play
							<span class="absolute -bottom-2 left-0 h-1 w-full bg-[#dfbc69]/35"></span>
						</span>
					</h1>
					<p class="max-w-2xl text-xl font-light leading-relaxed text-[#2D3A3A]/80 md:text-2xl">
						Open Play is built around variety, development, and comfort - so kids stay engaged and families
						feel genuinely looked after.
					</p>
				</div>

				<div class="relative lg:col-span-5">
					<div class="relative mx-auto h-[22rem] w-full max-w-md">
						<div
							class="absolute left-0 top-0 h-48 w-48 rotate-6"
							style="background: linear-gradient(145deg, #E07A5F2a, #E07A5F66); clip-path: polygon(0 0, 100% 8%, 88% 100%, 0 92%);"
						></div>
						<div
							class="absolute bottom-2 right-2 h-52 w-52 rounded-full"
							style="background: linear-gradient(145deg, #A8C3A033, #A8C3A077);"
						></div>
						<div
							class="absolute left-1/2 top-1/2 h-64 w-56 -translate-x-1/2 -translate-y-1/2 border border-[#2D3A3A]/10 bg-[#F9F7F2]/80 p-8 shadow-[0_25px_55px_rgba(45,58,58,0.12)] backdrop-blur-sm"
						>
							<p class="text-sm uppercase tracking-[0.18em] text-[#2D3A3A]/60">What families love</p>
							<ul class="mt-6 space-y-3 text-lg text-[#2D3A3A]/85">
								<li>01 Supervised play</li>
								<li>02 Creative variety</li>
								<li>03 Clean + safe policy</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="px-4 pb-20">
		<div class="mx-auto max-w-6xl">
			<div class="mb-10 flex items-end justify-between gap-4">
				<h2 class="text-4xl font-light md:text-5xl">See the Open Play Experience</h2>
				<p class="hidden max-w-xl text-right text-[#2D3A3A]/70 md:block">
					A visual-first look at the atmosphere, activities, and moments families come back for.
				</p>
			</div>

			<div class="grid gap-6 md:grid-cols-2">
				{#each featuredMoments as moment}
					<article class="group relative overflow-hidden border border-[#2D3A3A]/10 bg-white/70">
						<img
							src={moment.src}
							alt={moment.alt}
							class="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
							loading="lazy"
						/>
						<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2D3A3A]/80 to-transparent px-5 pb-5 pt-12">
							<p class="text-sm uppercase tracking-[0.16em] text-[#F9F7F2]/70">Open Play</p>
							<h3 class="text-2xl font-light text-[#F9F7F2]">{moment.title}</h3>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-4 pb-20">
		<div class="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
			<div class="border border-[#2D3A3A]/10 bg-white/80 p-7">
				<p class="mb-3 text-xs uppercase tracking-[0.2em] text-[#2D3A3A]/55">Caring team</p>
				<h3 class="mb-3 text-2xl font-light">Active playground supervisors</h3>
				<p class="text-[#2D3A3A]/80">
					Our team is present throughout the session - supporting children, guiding play, and helping
					families settle in comfortably.
				</p>
			</div>
			<div class="border border-[#2D3A3A]/10 bg-white/80 p-7">
				<p class="mb-3 text-xs uppercase tracking-[0.2em] text-[#2D3A3A]/55">Safety first</p>
				<h3 class="mb-3 text-2xl font-light">Cleanliness + non-sick policy</h3>
				<p class="text-[#2D3A3A]/80">
					We clean and reset spaces daily and take illness prevention seriously. Children who are unwell
					should rest at home to protect everyone.
				</p>
			</div>
			<div class="border border-[#2D3A3A]/10 bg-white/80 p-7">
				<p class="mb-3 text-xs uppercase tracking-[0.2em] text-[#2D3A3A]/55">Built for development</p>
				<h3 class="mb-3 text-2xl font-light">Varied play that grows with kids</h3>
				<p class="text-[#2D3A3A]/80">
					From movement and social play to focus and creativity, children can choose experiences that match
					their age, mood, and confidence.
				</p>
			</div>
		</div>
	</section>

	<section class="px-4 pb-20">
		<div class="mx-auto max-w-6xl">
			<div class="mb-8 flex items-end justify-between gap-4">
				<h2 class="text-4xl font-light md:text-5xl">Three Distinct Spaces</h2>
				<p class="hidden max-w-xl text-right text-[#2D3A3A]/70 md:block">
					Different energy, different play style - all in one thoughtful environment.
				</p>
			</div>

			<div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
				{#each spaces as space}
					<article
						class="group relative overflow-hidden border border-[#2D3A3A]/10 bg-white/70 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(45,58,58,0.14)]"
					>
						<img
							src={space.image}
							alt={space.name}
							class="-mx-7 -mt-7 mb-6 h-48 w-[calc(100%+3.5rem)] object-cover"
							loading="lazy"
						/>
						<div
							class="absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full blur-2xl"
							style={`background: ${space.color}44;`}
						></div>
						<p class="mb-3 text-xs uppercase tracking-[0.2em] text-[#2D3A3A]/55">{space.tag}</p>
						<h3 class="mb-4 text-3xl font-light text-[#2D3A3A]">{space.name}</h3>
						<p class="mb-6 leading-relaxed text-[#2D3A3A]/80">{space.description}</p>
						<a href="#pricing" class="text-sm uppercase tracking-[0.16em] text-[#2D3A3A]/65">See passes</a>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-4 pb-20">
		<div
			class="mx-auto max-w-6xl overflow-hidden border border-[#2D3A3A]/10 bg-[#2D3A3A] px-8 py-10 text-[#F9F7F2] md:px-12 md:py-12"
		>
			<div class="grid gap-8 md:grid-cols-3">
				<div>
					<p class="mb-3 text-xs uppercase tracking-[0.2em] text-[#F9F7F2]/65">Designed for families</p>
					<h3 class="text-3xl font-light">Come for play, stay for the feeling.</h3>
				</div>
				<p class="text-[#F9F7F2]/80">
					Children get variety and room to grow. Parents get peace of mind, warm hospitality, and a place
					that feels intentionally prepared.
				</p>
				<p class="text-[#F9F7F2]/80">
					Every visit can look different - quick drop-ins, full days, or regular routines with plans that
					fit your schedule.
				</p>
			</div>
		</div>
	</section>

	<section class="pb-20" id="pricing">
		<MembershipPricing showHeader={false} />
	</section>
</div>
