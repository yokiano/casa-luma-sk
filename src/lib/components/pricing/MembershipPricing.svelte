<script lang="ts">
	import { PRICING_OPTIONS } from '$lib/constants';

	interface Props {
		showHeader?: boolean;
	}

	let { showHeader = true }: Props = $props();
</script>

{#if showHeader}
	<section class="px-4 pb-8 pt-14 md:pt-20">
		<div class="mx-auto max-w-5xl text-center">
			<p class="mb-3 text-xs uppercase tracking-[0.22em] text-[#2D3A3A]/60">Casa Luma Pricing</p>
			<h1 class="text-5xl font-light leading-[0.95] text-[#2D3A3A] md:text-7xl">Passes & Plans</h1>
			<p class="mx-auto mt-5 max-w-3xl text-lg text-[#2D3A3A]/75 md:text-xl">
				Flexible options for quick drop-ins, full play days, and regular family routines.
			</p>
		</div>
	</section>
{/if}

<section class="px-4 pb-16 pt-8 md:pb-20">
	<div class="mx-auto max-w-7xl">
		<div class="mb-12 text-center">
			<h2 class="text-4xl font-light text-[#2D3A3A] md:text-5xl">Open Play Pricing</h2>
			<p class="mx-auto mt-3 max-w-2xl text-[#2D3A3A]/75">
				Simple plans, warm support, and room to choose what fits your family best.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
			{#each PRICING_OPTIONS as option}
				<div
					class={`relative flex flex-col overflow-hidden border bg-white/80 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(45,58,58,0.14)] ${option.highlight ? 'border-[#dfbc69]' : 'border-[#2D3A3A]/10'}`}
				>
					{#if option.highlight}
						<div
							class="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#dfbc69] px-4 py-1 whitespace-nowrap"
						>
							<span class="text-xs font-semibold tracking-wide text-[#2D3A3A]">POPULAR</span>
						</div>
					{/if}

					<div class="mb-5 text-3xl leading-none">
						{option.icon || '✨'}
					</div>

					<div class="mb-4">
						<h3 class="mb-3 text-3xl font-light text-[#2D3A3A]">{option.name}</h3>
						{#if option.id === 'flexi-play-pass'}
							<div class="space-y-1 text-[#2D3A3A]/88">
								<p class="text-xl font-semibold">Standard: ฿1,300</p>
								<p class="text-xl font-semibold">Resident: ฿1,100</p>
							</div>
							<p class="mt-3 text-sm uppercase tracking-[0.14em] text-[#2D3A3A]/65">11 hours | valid 60 days</p>
						{:else}
							<p class="text-5xl font-semibold leading-none text-[#E07A5F]">{option.price}</p>
							<p class="mt-3 text-sm uppercase tracking-[0.14em] text-[#2D3A3A]/65">{option.duration}</p>
						{/if}
						{#if option.savings}
							<div
								class="mt-4 inline-block rounded-full bg-[#E07A5F]/12 px-3 py-1 text-xs font-semibold text-[#C96A52]"
							>
								{option.savings}
							</div>
						{/if}
					</div>

					<div class="mb-5 text-[#2D3A3A]/72">
						{option.description}
					</div>

					<ul class="mb-7 flex-1 space-y-3">
						{#each option.features as feature}
							<li class="flex items-start gap-2 text-sm text-[#2D3A3A]/80">
								<span class="mt-0.5 shrink-0 text-[#A8C3A0]">✓</span>
								<span>{feature}</span>
							</li>
						{/each}
					</ul>

					<a
						href="/contact"
						class="inline-flex w-full items-center justify-center rounded-xl bg-[#2D3A3A] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#dfbc69] hover:text-[#2D3A3A]"
					>
						Ask about this plan
					</a>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="px-4 pb-16">
	<div class="mx-auto max-w-5xl border border-[#2D3A3A]/10 bg-white/70 p-8 md:p-10">
		<h3 class="mb-5 text-3xl font-light text-[#2D3A3A]">Good to know</h3>
		<ul class="space-y-3 text-[#2D3A3A]/82">
			<li class="flex items-start gap-3">
				<span class="mt-1 text-[#A8C3A0]">•</span>
				<span><strong>Free adult entry:</strong> Included with all passes shown above.</span>
			</li>
			<li class="flex items-start gap-3">
				<span class="mt-1 text-[#A8C3A0]">•</span>
				<span><strong>1-hour upgrade:</strong> We automatically move you to Day Pass pricing if you stay longer.</span>
			</li>
			<li class="flex items-start gap-3">
				<span class="mt-1 text-[#A8C3A0]">•</span>
				<span><strong>Clean play environment:</strong> We clean and reset daily and follow non-sick attendance rules.</span>
			</li>
			<li class="flex items-start gap-3">
				<span class="mt-1 text-[#A8C3A0]">•</span>
				<span><strong>Supportive staff:</strong> Playground supervisors are present to engage with and guide children.</span>
			</li>
		</ul>
	</div>
</section>

<section class="px-4 pb-20 text-center">
	<div class="mx-auto max-w-2xl">
		<h2 class="text-4xl font-light text-[#2D3A3A] md:text-5xl">Need help choosing?</h2>
		<p class="mt-3 text-[#2D3A3A]/75">
			Tell us your child's age and visit style, and we will recommend the best option.
		</p>
		<div class="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
			<a
				href="/contact"
				class="rounded-full bg-[#2D3A3A] px-8 py-3 font-medium text-white transition-colors hover:bg-[#dfbc69] hover:text-[#2D3A3A]"
			>
				Contact us
			</a>
			<a
				href="/open-play"
				class="rounded-full border border-[#2D3A3A]/20 px-8 py-3 font-medium text-[#2D3A3A] transition-colors hover:bg-white"
			>
				Back to Open Play
			</a>
		</div>
	</div>
</section>
