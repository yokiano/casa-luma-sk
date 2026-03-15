<script lang="ts">
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import type { WebsiteImageAsset, WebsiteImageSlug } from '$lib/types/website-media';

	interface Props {
		slug: WebsiteImageSlug;
		alt?: string;
		class?: string;
		imageClass?: string;
		showPagination?: boolean;
		autoRotateMs?: number;
	}

	let {
		slug,
		alt,
		class: className = '',
		imageClass = '',
		showPagination = true,
		autoRotateMs = 4500
	}: Props = $props();

	const websiteMedia = getWebsiteMediaContext();
	let activeIndex = $state(0);
	let images = $derived(websiteMedia.getAll(slug));
	let count = $derived(images.length);
	let currentImage = $derived(images[activeIndex] || images[0] || null);

	$effect(() => {
		if (activeIndex >= count) {
			activeIndex = 0;
		}
	});

	$effect(() => {
		if (count <= 1) {
			return;
		}

		const timer = setInterval(() => {
			activeIndex = (activeIndex + 1) % count;
		}, autoRotateMs);

		return () => clearInterval(timer);
	});

	function selectImage(index: number) {
		activeIndex = index;
	}

	function getResolvedAlt(image: WebsiteImageAsset | null) {
		return alt || image?.alt || '';
	}
</script>

<div class={`relative ${className}`}>
	{#if count > 1}
		{#each images as image, index (image.id)}
			<img
				src={image.src}
				alt={getResolvedAlt(image)}
				class={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${imageClass}`}
				style:opacity={index === activeIndex ? 1 : 0}
				aria-hidden={index === activeIndex ? undefined : true}
			/>
		{/each}
	{:else if currentImage}
		<img src={currentImage.src} alt={getResolvedAlt(currentImage)} class={`h-full w-full object-cover ${imageClass}`} />
	{/if}

	{#if showPagination && count > 1}
		<div class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm">
			{#each images as image, index (image.id)}
				<button
					type="button"
					class="h-2 rounded-full bg-white/80 transition-all duration-300"
					class:w-6={index === activeIndex}
					class:w-2={index !== activeIndex}
					onclick={() => selectImage(index)}
					aria-label={`Show image ${index + 1}`}
				></button>
			{/each}
		</div>
	{/if}
</div>
