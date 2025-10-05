<script lang="ts">
	import MembershipPricing from '$lib/components/pricing/MembershipPricing.svelte';
</script>

<svelte:head>
	<title>Open Play - Casa Luma</title>
	<meta
		name="description"
		content="Drop-in play sessions for children at Casa Luma. Explore our safe, Montessori-inspired play spaces in Koh Phangan."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="bg-muted py-16 px-4">
	<div class="max-w-4xl mx-auto text-center">
		<h1 class="text-4xl md:text-5xl font-serif mb-4 text-foreground">Open Play</h1>
		<p class="text-lg md:text-xl text-muted-foreground">
			A safe, natural space for children to play, explore, and grow
		</p>
	</div>
</section>

<!-- About Open Play -->
<section class="py-16 px-4 bg-background">
	<div class="max-w-4xl mx-auto">
		<div class="prose prose-lg mx-auto">
			<h2 class="text-3xl font-serif mb-6 text-foreground">Welcome to Our Play Space</h2>
			<p class="text-foreground/80 mb-4">
				Our open play sessions offer children a chance to explore multiple play areas designed with
				Montessori principles in mind. From gross motor activities to quiet creative corners, every
				space is thoughtfully prepared to support natural development and joyful discovery.
			</p>
			<p class="text-foreground/80">
				Parents can relax in our comfortable lounge area or enjoy our garden café while children
				play safely under supervision. We welcome families visiting the island and our local
				community members alike.
			</p>
		</div>
	</div>
</section>

<!-- Embedded Pricing Component (without header) -->
<MembershipPricing showHeader={false} />


