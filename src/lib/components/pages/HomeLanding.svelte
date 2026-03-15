<script lang="ts">
	import HeroSection from '../../../routes/inspiration/HeroSection.svelte';
	import InlineTextSection from '../../../routes/inspiration/InlineTextSection.svelte';
	import PlaygroundSection from '../../../routes/inspiration/PlaygroundSection.svelte';
	import CafeSection from '../../../routes/inspiration/CafeSection.svelte';
	import GoogleReviewsSection from '$lib/components/home/GoogleReviewsSection.svelte';
	import WorkshopsSection from '../../../routes/inspiration/WorkshopsSection.svelte';
</script>

<svelte:head>
	<title>Casa Luma — A space to play, eat & celebrate</title>
</svelte:head>

<div class="min-h-screen bg-[#F9F7F2] text-[#2D3A3A] selection:bg-[#E07A5F] selection:text-white">
	<HeroSection />
	<InlineTextSection />
	<PlaygroundSection />
	<CafeSection />
	<GoogleReviewsSection />
	<WorkshopsSection />
</div>
