<script lang="ts">
	import { PRICING_OPTIONS } from '$lib/constants';

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

<!-- Content (Grid Only) -->
<section class="py-16 px-4 bg-background">
	<div class="max-w-7xl mx-auto">
		<div class="text-center mb-12">
			<h2 class="text-3xl md:text-4xl font-serif mb-3 text-foreground">Open Play Pricing</h2>
			<p class="text-muted-foreground max-w-2xl mx-auto">
				Perfect for families who want to make Casa Luma a regular part of their lives
			</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
			{#each PRICING_OPTIONS as option}
				<div
					class="relative bg-card rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
					class:border-primary={option.highlight}
					class:border-border={!option.highlight}
					class:shadow-lg={option.highlight}
				>
					{#if option.highlight}
						<div
							class="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 rounded-full whitespace-nowrap"
						>
							<span class="text-xs font-medium text-primary-foreground">BEST VALUE</span>
						</div>
					{/if}

					<!-- Icon Circle -->
					<div
						class="w-14 h-14 mx-auto mb-4 bg-secondary/30 rounded-full flex items-center justify-center text-2xl"
					>
						{option.icon || '✨'}
					</div>

					<!-- Title & Price -->
					<div class="text-center mb-4">
						<h3 class="text-xl font-semibold mb-2 text-foreground">{option.name}</h3>
						<div class="mb-1">
							<span class="text-3xl font-bold text-primary">{option.price}</span>
						</div>
						<p class="text-xs text-muted-foreground">{option.duration}</p>
						{#if option.savings}
							<div
								class="mt-2 inline-block bg-accent/10 text-accent px-2 py-0.5 rounded-full text-[10px] font-medium"
							>
								{option.savings}
							</div>
						{/if}
					</div>

					<!-- Quick Summary -->
					<div class="mb-4 text-center text-sm text-muted-foreground italic px-2">
						{option.description}
					</div>

					<!-- Features List -->
					<ul class="space-y-2 mb-6 flex-1">
						{#each option.features as feature}
							<li class="flex items-start gap-2 text-sm">
								<span class="text-secondary text-sm shrink-0">✓</span>
								<span class="text-foreground/80">{feature}</span>
							</li>
						{/each}
					</ul>

					<!-- CTA -->
					<button
						class="w-full py-2.5 px-4 rounded-xl font-medium transition-colors text-sm {option.highlight
							? 'bg-primary hover:bg-primary/90 text-primary-foreground'
							: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground'}"
					>
						Choose Plan
					</button>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Notes & Info Section -->
<section class="py-12 px-4 bg-muted/30">
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
