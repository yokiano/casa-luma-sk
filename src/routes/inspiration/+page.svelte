<script lang="ts">
	import HeroSection from './HeroSection.svelte';
	import InlineTextSection from './InlineTextSection.svelte';
	import PlaygroundSection from './PlaygroundSection.svelte';
	import CafeSection from './CafeSection.svelte';
	import WorkshopsSection from './WorkshopsSection.svelte';
	import ActivitiesSection from './ActivitiesSection.svelte';
</script>

<svelte:head>
	<title>Casa Luma — A space to play, eat & celebrate</title>
</svelte:head>

<div class="min-h-screen bg-[#F9F7F2] text-[#2D3A3A] selection:bg-[#E07A5F] selection:text-white">

	<!-- Page sections -->
	<HeroSection />
	<InlineTextSection />
	<PlaygroundSection />
	<CafeSection />
	<WorkshopsSection />
	<ActivitiesSection />
</div>
