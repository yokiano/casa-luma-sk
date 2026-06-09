<script lang="ts">
	import {
		CalendarClock,
		CheckCircle2,
		CircleHelp,
		DoorOpen,
		Megaphone,
		Music,
		Scale,
		UsersRound
	} from 'lucide-svelte';

	const contactEmail = 'info@casalumakpg.com';
	const mailtoHref = `mailto:${contactEmail}?subject=Workshop%20at%20Casa%20Luma`;

	const spaceHighlights = [
		{
			icon: DoorOpen,
			title: 'Ground-floor workshop room',
			description:
				'Our main workshop space is a new room on the ground floor, roughly the size of a bedroom and best suited for small, intimate sessions.'
		},
		{
			icon: UsersRound,
			title: 'Small group capacity',
			description:
				'For yoga or movement-based sessions that need floor space, we currently estimate a comfortable capacity of up to 8 participants.'
		},
		{
			icon: Music,
			title: 'Simple setup support',
			description:
				'We have cushions available and can arrange a music playback setup if you tell us in advance. Yoga mats and props are not currently provided.'
		}
	];

	const infoCards = [
		{
			icon: CalendarClock,
			title: 'Workshop time block',
			description:
				'Workshop bookings include time for preparation, participant arrival, the session itself, packing up, and resetting the room.'
		},
		{
			icon: Megaphone,
			title: 'Light promotion support',
			description:
				'Approved workshops can be added to our schedule, where families already look for activities, community events, and knowledge-sharing opportunities.'
		},
		{
			icon: Scale,
			title: 'Facilitator responsibility',
			description:
				'Casa Luma rents the space. The facilitator is responsible for work permissions, participant management, safety, and the activity itself.'
		}
	];

	const goodFitItems = [
		'Small-group workshops, classes, or guided experiences',
		'Yoga, wellness, creative, educational, family, or community-oriented sessions',
		'Facilitators who can bring any specialized equipment they need',
		'Hosts who are comfortable managing their own participants and legal requirements'
	];

	const questions = [
		'What kind of workshop do you want to host?',
		'How many participants do you expect?',
		'Do you need floor space, tables, chairs, music, or any special setup?',
		'Is your session best for adults, children, families, or a mixed group?',
		'Do you want a one-off session or something recurring?'
	];
</script>

<svelte:head>
	<title>Host a Workshop at Casa Luma</title>
	<meta
		name="description"
		content="Host a small-group workshop, class, or creative experience at Casa Luma. Learn about our workshop space, timing, setup, promotion support, and facilitator responsibilities."
	/>
</svelte:head>

<div class="min-h-screen overflow-hidden bg-[#F9EDE8] text-[#2D3A3A]">
	<section class="relative isolate px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
		<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
			<div class="absolute -left-28 top-12 h-72 w-72 rounded-full bg-[#E07A5F]/20 blur-3xl"></div>
			<div class="absolute right-[-8rem] top-36 h-80 w-80 rounded-full bg-[#dfbc69]/25 blur-3xl"></div>
			<div class="absolute bottom-0 left-1/3 h-72 w-96 rounded-full bg-[#A8C3A0]/20 blur-3xl"></div>
		</div>

		<div class="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
			<div>
				<h1 class="font-heading text-5xl font-semibold leading-[0.95] tracking-tight text-[#2D3A3A] sm:text-6xl lg:text-7xl">
					Host a workshop at Casa Luma
				</h1>
				<p class="mt-7 max-w-2xl text-lg leading-8 text-[#2D3A3A]/75 sm:text-xl">
					A space for facilitators to host small-group classes, creative sessions, family
					activities, and community experiences. We are still shaping the process, so this page
					shares the current basics and how to start a conversation with us.
				</p>
				<div class="mt-9 flex flex-wrap gap-3">
					<a
						href={mailtoHref}
						class="inline-flex items-center justify-center rounded-full bg-[#E07A5F] px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-[0_18px_40px_rgba(224,122,95,0.28)] transition hover:-translate-y-0.5 hover:bg-[#c96850]"
					>
						Contact us
					</a>
					<span class="inline-flex items-center justify-center rounded-full border border-[#2D3A3A]/15 bg-white/55 px-6 py-3 text-sm font-semibold text-[#2D3A3A]/70">
						Intake form coming soon
					</span>
				</div>
			</div>

			<aside class="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(45,58,58,0.12)] backdrop-blur-sm sm:p-8">
				<h2 class="font-heading text-3xl font-semibold">What Casa Luma can offer</h2>
				<p class="mt-4 leading-7 text-[#2D3A3A]/70">
					A calm workshop room, a steady flow of families looking for activities and learning
					opportunities, and a simple way to include approved workshops in the Casa Luma schedule.
				</p>
				<div class="mt-7 grid gap-4">
					<div class="rounded-3xl bg-[#A8C3A0]/25 p-5">
						<p class="font-heading text-2xl font-semibold">Small, focused sessions</p>
						<p class="mt-2 text-sm leading-6 text-[#2D3A3A]/65">
							Best suited for intimate classes and experiences rather than large events.
						</p>
					</div>
					<div class="rounded-3xl bg-[#dfbc69]/25 p-5">
						<p class="font-heading text-2xl font-semibold">Schedule visibility</p>
						<p class="mt-2 text-sm leading-6 text-[#2D3A3A]/65">
							We can list suitable workshops where our community already looks for upcoming activities.
						</p>
					</div>
				</div>
			</aside>
		</div>
	</section>

	<section class="px-5 pb-16 sm:px-8 lg:px-12">
		<div class="mx-auto max-w-6xl">
			<div class="grid gap-5 md:grid-cols-3">
				{#each spaceHighlights as item}
					{@const Icon = item.icon}
					<article class="rounded-[1.75rem] border border-[#2D3A3A]/10 bg-white/65 p-6 shadow-[0_18px_50px_rgba(45,58,58,0.07)]">
						<span class="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#F9EDE8] text-[#E07A5F]">
							<Icon size={23} strokeWidth={1.8} />
						</span>
						<h2 class="font-heading text-xl font-semibold">{item.title}</h2>
						<p class="mt-3 leading-7 text-[#2D3A3A]/68">{item.description}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="bg-white/55 px-5 py-16 sm:px-8 lg:px-12">
		<div class="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
			<div>
				<h2 class="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Clear, small, and flexible</h2>
				<p class="mt-5 text-lg leading-8 text-[#2D3A3A]/70">
					We are starting with a simple model so facilitators can understand the basics quickly.
					As we learn more, we may add a more detailed application flow, recurring schedules,
					and direct booking tools.
				</p>
			</div>

			<div class="grid gap-5">
				{#each infoCards as item}
					{@const Icon = item.icon}
					<article class="flex gap-5 rounded-[1.75rem] border border-[#2D3A3A]/10 bg-[#F9EDE8]/80 p-6">
						<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#E07A5F]">
							<Icon size={23} strokeWidth={1.8} />
						</span>
						<div>
							<h3 class="font-heading text-xl font-semibold">{item.title}</h3>
							<p class="mt-2 leading-7 text-[#2D3A3A]/68">{item.description}</p>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-5 py-16 sm:px-8 lg:px-12">
		<div class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
			<article class="rounded-[2rem] bg-[#2D3A3A] p-7 text-white sm:p-9">
				<h2 class="font-heading text-3xl font-semibold">What is a good fit?</h2>
				<ul class="mt-7 space-y-4">
					{#each goodFitItems as item}
						<li class="flex gap-3 leading-7 text-white/78">
							<CheckCircle2 class="mt-1 shrink-0 text-[#dfbc69]" size={20} strokeWidth={1.9} />
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			</article>

			<article class="rounded-[2rem] border border-[#2D3A3A]/10 bg-white/70 p-7 shadow-[0_18px_50px_rgba(45,58,58,0.07)] sm:p-9">
				<div class="flex items-center gap-3">
					<span class="flex h-11 w-11 items-center justify-center rounded-full bg-[#F9EDE8] text-[#E07A5F]">
						<CircleHelp size={22} strokeWidth={1.8} />
					</span>
					<h2 class="font-heading text-3xl font-semibold">What we will ask you</h2>
				</div>
				<p class="mt-5 leading-7 text-[#2D3A3A]/68">
					The full intake form is coming later. For now, these are the main questions that help
					us understand whether the space is right for your workshop.
				</p>
				<ol class="mt-6 space-y-3">
					{#each questions as question, index}
						<li class="flex gap-3 rounded-2xl bg-[#F9EDE8]/80 p-4 text-[#2D3A3A]/75">
							<span class="font-heading font-semibold text-[#E07A5F]">{index + 1}</span>
							<span>{question}</span>
						</li>
					{/each}
				</ol>
			</article>
		</div>
	</section>

	<section class="px-5 pb-20 sm:px-8 lg:px-12">
		<div class="mx-auto max-w-6xl rounded-[2rem] bg-[#E07A5F] p-8 text-white shadow-[0_24px_80px_rgba(224,122,95,0.28)] sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
			<div>
				<h2 class="font-heading text-3xl font-semibold sm:text-4xl">Tell us about your workshop idea</h2>
				<p class="mt-4 max-w-2xl leading-7 text-white/78">
					We are happy to answer questions, show you the space, and learn what facilitators need
					while this program is still taking shape.
				</p>
			</div>
			<a
				href={mailtoHref}
				class="mt-7 inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#E07A5F] transition hover:-translate-y-0.5 hover:bg-[#F9EDE8] lg:mt-0"
			>
				Email Casa Luma
			</a>
		</div>
	</section>
</div>
