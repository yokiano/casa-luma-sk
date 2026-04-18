<script lang="ts">
	import { PRICING_OPTIONS } from '$lib/constants';
	import { ArrowRight, Check, Sparkles } from 'lucide-svelte';

	interface Props {
		showHeader?: boolean;
	}

	let { showHeader = true }: Props = $props();

	const practicalNotes = [
		{
			title: 'Free adult entry',
			text: 'Included with all passes shown here.'
		},
		{
			title: 'Automatic 1-hour upgrade',
			text: 'If you stay longer, we move you to Day Pass pricing automatically.'
		},
		{
			title: 'Clean play environment',
			text: 'Spaces are cleaned and reset daily, with non-sick attendance rules in place.'
		},
		{
			title: 'Supportive staff',
			text: 'Playground supervisors are present to engage with and guide children.'
		}
	];
</script>

<div class="bg-background text-foreground">
	{#if showHeader}
		<section class="relative overflow-hidden px-6 pb-10 pt-16 sm:px-10 sm:pt-20 lg:px-20">
			<div class="pointer-events-none absolute inset-0 overflow-hidden">
				<div class="absolute left-[12%] top-10 h-40 w-40 rounded-full bg-primary/16 blur-3xl"></div>
				<div class="absolute right-[12%] top-14 h-52 w-52 rounded-full bg-secondary/18 blur-3xl"></div>
			</div>
			<div class="relative mx-auto max-w-5xl text-center">
				<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/62">Casa Luma Pricing</p>
				<h1 class="mt-5 text-5xl leading-[0.92] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
					Passes and plans for
					<span class="italic text-accent">easy family rhythm.</span>
				</h1>
				<p class="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-foreground/72 sm:text-xl">
					Flexible options for quick drop-ins, full play days, and regular routines that feel simple to return to.
				</p>
			</div>
		</section>
	{/if}

	<section class="px-6 pb-16 pt-8 sm:px-10 lg:px-20 lg:pb-20">
		<div class="mx-auto max-w-7xl">
			<div class="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div class="max-w-3xl">
					<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/62">Open Play Pricing</p>
					<h2 class="mt-4 text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
						Simple choices, warmly presented.
					</h2>
				</div>
				<p class="max-w-xl text-base leading-relaxed text-foreground/68 sm:text-lg">
					Choose the format that fits your family best now, then come back differently another day.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
				{#each PRICING_OPTIONS as option, index (option.id)}
					<div
						class={`relative flex h-full flex-col overflow-hidden rounded-[2.2rem] border p-7 shadow-[0_22px_60px_rgba(45,58,58,0.07)] transition-transform duration-300 hover:-translate-y-1 ${option.highlight ? 'border-primary/55 bg-[linear-gradient(180deg,rgba(223,188,105,0.16),rgba(255,255,255,0.94))]' : 'border-foreground/8 bg-white'}`}
					>
						<div class={`pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full blur-2xl ${option.highlight ? 'bg-primary/28' : index % 2 === 0 ? 'bg-secondary/18' : 'bg-accent/14'}`}></div>

						{#if option.highlight}
							<div class="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-background">
								<Sparkles size={13} class="text-primary" />
								Most loved
							</div>
						{/if}

						<div class="relative mb-5 flex items-start justify-between gap-4">
							<div>
								<p class="text-3xl leading-none">{option.icon || '✨'}</p>
								<h3 class="mt-4 text-3xl tracking-tight text-foreground">{option.name}</h3>
							</div>
						</div>

						<div class="relative mb-5 rounded-[1.6rem] border border-foreground/7 bg-white/72 p-5 backdrop-blur-sm">
							{#if option.id === 'flexi-play-pass'}
								<div class="space-y-2 text-foreground">
									<p class="text-xl font-semibold">Standard: ฿1,300</p>
									<p class="text-xl font-semibold">Resident: ฿1,100</p>
								</div>
								<p class="mt-3 text-[11px] uppercase tracking-[0.22em] text-foreground/58">11 hours of play | valid 60 days</p>
							{:else}
								<p class="text-5xl font-semibold leading-none text-accent">{option.price}</p>
								<p class="mt-3 text-[11px] uppercase tracking-[0.22em] text-foreground/58">{option.duration}</p>
							{/if}

							{#if option.savings}
								<div class="mt-4 inline-flex rounded-full bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
									{option.savings}
								</div>
							{/if}
						</div>

						<p class="mb-6 text-base leading-relaxed text-foreground/70">{option.description}</p>

						<ul class="mb-8 flex-1 space-y-3">
							{#each option.features as feature}
								<li class="flex items-start gap-3 text-sm leading-relaxed text-foreground/78">
									<div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/26 text-foreground">
										<Check size={12} />
									</div>
									<span>{feature}</span>
								</li>
							{/each}
						</ul>

						<a
							href="/contact"
							class={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm uppercase tracking-[0.18em] transition-all duration-300 ${option.highlight ? 'bg-foreground text-background hover:-translate-y-0.5 hover:bg-accent' : 'border border-foreground/12 bg-white text-foreground hover:-translate-y-0.5 hover:border-accent/30 hover:text-accent'}`}
						>
							Ask about this plan
							<ArrowRight size={15} />
						</a>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-6 pb-16 sm:px-10 lg:px-20 lg:pb-20">
		<div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.88fr_1.12fr]">
			<div class="rounded-[2.4rem] bg-foreground p-8 text-background shadow-[0_28px_80px_rgba(45,58,58,0.18)] sm:p-10">
				<p class="text-[11px] uppercase tracking-[0.28em] text-primary">Good to know</p>
				<h3 class="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">
					Small practical details that make visiting easier.
				</h3>
				<p class="mt-5 text-base leading-relaxed text-background/75 sm:text-lg">
					The pricing stays simple, but the experience is supported by a lot of thoughtful behind-the-scenes care.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				{#each practicalNotes as note}
					<div class="rounded-[1.8rem] border border-foreground/8 bg-white p-6 shadow-[0_18px_50px_rgba(45,58,58,0.06)]">
						<p class="text-[11px] uppercase tracking-[0.24em] text-foreground/55">{note.title}</p>
						<p class="mt-3 text-base leading-relaxed text-foreground/72">{note.text}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-6 pb-20 text-center sm:px-10 lg:px-20 lg:pb-24">
		<div class="mx-auto max-w-3xl rounded-[2.6rem] border border-foreground/8 bg-white/75 px-7 py-10 shadow-[0_20px_60px_rgba(45,58,58,0.06)] backdrop-blur-sm sm:px-10 sm:py-12">
			<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/62">Need help choosing?</p>
			<h2 class="mt-4 text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
				We can point you to the right fit.
			</h2>
			<p class="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-foreground/70 sm:text-lg">
				Tell us your child's age and the kind of visits you have in mind, and we will recommend the simplest option.
			</p>
			<div class="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
				<a
					href="/contact"
					class="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-8 py-3 text-sm uppercase tracking-[0.18em] text-background transition-transform duration-300 hover:-translate-y-0.5 hover:bg-accent"
				>
					Contact us
					<ArrowRight size={15} />
				</a>
				<a
					href="/open-play"
					class="inline-flex items-center justify-center rounded-full border border-foreground/12 bg-white px-8 py-3 text-sm uppercase tracking-[0.18em] text-foreground transition-transform duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:text-accent"
				>
					Back to Open Play
				</a>
			</div>
		</div>
	</section>
</div>
