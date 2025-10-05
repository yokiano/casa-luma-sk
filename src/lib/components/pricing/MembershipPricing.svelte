<script lang="ts">
	import { MEMBERSHIPS, PAY_AS_YOU_GO } from '$lib/constants';

	interface Props {
		showHeader?: boolean;
	}

	let { showHeader = true }: Props = $props();
</script>

{#if showHeader}
	<section class="bg-muted py-16 px-4">
		<div class="max-w-4xl mx-auto text-center">
			<h1 class="text-4xl md:text-5xl font-serif mb-4 text-foreground">
				Memberships & Passes
			</h1>
			<p class="text-lg md:text-xl text-muted-foreground">
				Play, learn, and laugh together in our beautiful island home
			</p>
		</div>
	</section>
{/if}

<!-- Memberships Section -->
<section class="py-16 px-4 bg-background">
	<div class="max-w-7xl mx-auto">
		<div class="text-center mb-12">
			<h2 class="text-3xl md:text-4xl font-serif mb-3 text-foreground">Our Memberships</h2>
			<p class="text-muted-foreground max-w-2xl mx-auto">
				Perfect for families who want to make Casa Luma a regular part of their lives
			</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
			{#each MEMBERSHIPS as membership}
				<div
					class="relative bg-card rounded-2xl p-8 border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
					class:border-primary={membership.highlight}
					class:border-border={!membership.highlight}
					class:shadow-lg={membership.highlight}
				>
					{#if membership.highlight}
						<div
							class="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 rounded-full"
						>
							<span class="text-sm font-medium text-primary-foreground">Great for families</span>
						</div>
					{/if}

					<!-- Icon Circle -->
					<div
						class="w-16 h-16 mx-auto mb-6 bg-secondary/30 rounded-full flex items-center justify-center text-3xl"
					>
						{membership.icon}
					</div>

					<!-- Title & Price -->
					<div class="text-center mb-6">
						<h3 class="text-2xl font-semibold mb-2 text-foreground">{membership.name}</h3>
						<div class="mb-2">
							<span class="text-4xl font-bold text-primary">{membership.price}</span>
						</div>
						<p class="text-sm text-muted-foreground">{membership.duration}</p>
					</div>

					<!-- Quick Summary -->
					<div class="mb-6 space-y-2 text-center border-y border-border py-4">
						<div class="text-sm">
							<span class="font-medium text-foreground">{membership.access}</span>
						</div>
						<div class="text-sm text-muted-foreground">{membership.workshops}</div>
						<div class="text-sm">
							<span class="text-accent font-medium">{membership.foodDiscount} F&B</span>
						</div>
					</div>

					<!-- Perks List -->
					<ul class="space-y-3 mb-8">
						{#each membership.perks as perk}
							<li class="flex items-start gap-2 text-sm">
								<span class="text-secondary text-base shrink-0">✓</span>
								<span class="text-foreground/80">{perk}</span>
							</li>
						{/each}
					</ul>

					<!-- CTA -->
					<button
						class="w-full py-3 px-6 rounded-xl font-medium transition-colors {membership.highlight
							? 'bg-primary hover:bg-primary/90 text-primary-foreground'
							: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground'}"
					>
						Get This Pass
					</button>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Decorative Divider with Triangle -->
<div class="relative h-16 bg-gradient-to-b from-background to-muted">
	<svg
		class="absolute bottom-0 w-full h-12 text-muted"
		viewBox="0 0 1200 120"
		preserveAspectRatio="none"
	>
		<path
			d="M0,0 L600,60 L1200,0 L1200,120 L0,120 Z"
			fill="currentColor"
			class="opacity-50"
		></path>
	</svg>
</div>

<!-- Pay-As-You-Go Section - Chalkboard Style -->
<section class="py-16 px-4 bg-muted">
	<div class="max-w-5xl mx-auto">
		<div class="text-center mb-12">
			<h2 class="text-3xl md:text-4xl font-serif mb-3 text-foreground">Drop-In & Play</h2>
			<p class="text-muted-foreground">Perfect for a quick visit or trying us out</p>
		</div>

		<div class="space-y-6 max-w-3xl mx-auto">
			{#each PAY_AS_YOU_GO as option}
				<div class="bg-card rounded-xl p-6 md:p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
					<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						<!-- Left: Name & Duration -->
						<div class="flex-1">
							<h3 class="text-2xl font-semibold text-foreground mb-1">{option.name}</h3>
							<p class="text-sm text-muted-foreground mb-4">{option.duration}</p>

							<!-- Includes -->
							<ul class="space-y-2">
								{#each option.includes as include}
									<li class="flex items-center gap-2 text-sm">
										<span class="w-1.5 h-1.5 bg-secondary rounded-full"></span>
										<span class="text-foreground/80">{include}</span>
									</li>
								{/each}
							</ul>

							{#if option.extras}
								<p class="text-xs text-accent mt-3 font-medium">{option.extras}</p>
							{/if}
						</div>

						<!-- Right: Price & CTA -->
						<div class="flex flex-col items-center md:items-end gap-3 md:min-w-[160px]">
							<div class="text-center md:text-right">
								<div class="text-3xl md:text-4xl font-bold text-primary">{option.price}</div>
							</div>
							<button
								class="px-6 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full font-medium transition-colors text-sm"
							>
								Let's Play
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Notes & Info Section -->
<section class="py-12 px-4 bg-background">
	<div class="max-w-4xl mx-auto">
		<div class="bg-secondary/10 rounded-2xl p-8 border border-secondary/30">
			<h3 class="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
				<span class="text-2xl">📝</span>
				Good to Know
			</h3>
			<ul class="space-y-3 text-sm text-foreground/80">
				<li class="flex items-start gap-3">
					<span class="text-secondary shrink-0 mt-0.5">•</span>
					<span
						><strong>Workshops:</strong> Included workshops refer to selected kids sessions in our weekly
						schedule. Special events and premium workshops may be excluded.</span
					>
				</li>
				<li class="flex items-start gap-3">
					<span class="text-secondary shrink-0 mt-0.5">•</span>
					<span
						><strong>Socks required:</strong> All children and adults must wear socks in play areas.</span
					>
				</li>
				<li class="flex items-start gap-3">
					<span class="text-secondary shrink-0 mt-0.5">•</span>
					<span
						><strong>Re-entry:</strong> Same-day re-entry allowed with wristband or QR verification.</span
					>
				</li>
				<li class="flex items-start gap-3">
					<span class="text-secondary shrink-0 mt-0.5">•</span>
					<span
						><strong>Capacity limits:</strong> During busy times, we may need to limit new entries to
						ensure everyone's comfort and safety.</span
					>
				</li>
			</ul>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="py-16 px-4 bg-muted text-center">
	<div class="max-w-2xl mx-auto">
		<h2 class="text-3xl md:text-4xl font-serif mb-4 text-foreground">Ready to Join Us?</h2>
		<p class="text-muted-foreground mb-8">
			Come visit us or reach out with any questions. We can't wait to welcome your family!
		</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a
				href="/contact"
				class="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium transition-colors"
			>
				Contact Us
			</a>
			<a
				href="/open-play"
				class="px-8 py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full font-medium transition-colors"
			>
				Learn About Open Play
			</a>
		</div>
	</div>
</section>

