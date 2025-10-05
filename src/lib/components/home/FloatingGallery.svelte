<script lang="ts">
	import { onMount } from 'svelte';
	import { Spring } from 'svelte/motion';
	import FloatingShapes3 from '$lib/components/workshops/FloatingShapes3.svelte';

	interface GalleryImage {
		src: string;
		title: string;
		description: string;
		shape?: 'circle' | 'rectangle' | 'triangle-up' | 'triangle-down';
	}

	interface Props {
		images?: GalleryImage[];
	}

	interface ImageData extends GalleryImage {
		isVertical: boolean;
		x: number;
		y: number;
		rotation: number;
		scale: number;
		width: number;
		height: number;
		parallaxSpeed: number;
		zIndex: number;
	}

	// Generate 15 images with real photos from Unsplash
	const defaultImages: GalleryImage[] = [
		{
			src: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80',
			title: 'Play Area',
			description: 'Children exploring freely',
			shape: 'circle'
		},
		{
			src: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
			title: 'Café Corner',
			description: 'Parents relaxing with coffee',
			shape: 'rectangle'
		},
		{
			src: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
			title: 'Workshop Fun',
			description: 'Hands-on learning activities',
			shape: 'triangle-up'
		},
		{
			src: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800&q=80',
			title: 'Garden Time',
			description: 'Natural outdoor play',
			shape: 'triangle-down'
		},
		{
			src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80',
			title: 'Birthday Joy',
			description: 'Memorable celebrations',
			shape: 'circle'
		},
		{
			src: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800&q=80',
			title: 'Learning Space',
			description: 'Montessori-inspired environment',
			shape: 'rectangle'
		},
		{
			src: 'https://images.unsplash.com/photo-1503919005314-30d93d07d823?w=800&q=80',
			title: 'Creative Play',
			description: 'Imagination at work',
			shape: 'triangle-up'
		},
		{
			src: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
			title: 'Parent Lounge',
			description: 'Peaceful parent space',
			shape: 'triangle-down'
		},
		{
			src: 'https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?w=800&q=80',
			title: 'Outdoor Fun',
			description: 'Garden adventures',
			shape: 'circle'
		},
		{
			src: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&q=80',
			title: 'Soft Play',
			description: 'Safe play elements',
			shape: 'rectangle'
		},
		{
			src: 'https://images.unsplash.com/photo-1560421683-6856ea585c78?w=800&q=80',
			title: 'Montessori Tools',
			description: 'Natural learning materials',
			shape: 'triangle-up'
		},
		{
			src: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
			title: 'Happy Kids',
			description: 'Joyful moments',
			shape: 'triangle-down'
		},
		{
			src: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
			title: 'Coffee Break',
			description: 'Quality refreshments',
			shape: 'circle'
		},
		{
			src: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
			title: 'Event Space',
			description: 'Community gatherings',
			shape: 'rectangle'
		},
		{
			src: 'https://images.unsplash.com/photo-1566004100631-35d015d6a491?w=800&q=80',
			title: 'Toy Shop',
			description: 'Curated toy selection',
			shape: 'triangle-up'
		}
	];

	let { images = defaultImages }: Props = $props();

	// Svelte 5 state management
	let innerWidth = $state(1200);
	let innerHeight = $state(800);
	let containerHeight = $state(3000);
	let processedImages = $state<ImageData[]>([]);

	// Responsive breakpoints
	const isMobile = $derived(innerWidth < 768);
	const isTablet = $derived(innerWidth >= 768 && innerWidth < 1024);

	// Smooth spring animation for parallax
	const scrollSpring = new Spring(0, {
		stiffness: 0.02,
		damping: 0.92,
		precision: 0.1
	});

	// Noise function for organic positioning
	function noise(x: number, y: number): number {
		const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
		return (n - Math.floor(n)) * 2 - 1;
	}

	// Get shape styles
	function getShapeStyles(shape?: string): string {
		switch (shape) {
			case 'circle':
				return 'border-radius: 50%;';
			case 'rectangle':
				return 'clip-path: polygon(0 5%, 100% 0, 100% 95%, 0 100%);';
			case 'triangle-up':
				return 'clip-path: polygon(50% 0%, 0% 100%, 100% 100%);';
			case 'triangle-down':
				return 'clip-path: polygon(0% 0%, 100% 0%, 50% 100%);';
			default:
				return 'clip-path: polygon(0 10%, 100% 0, 100% 90%, 0 100%);';
		}
	}

	// Generate responsive positioning
	function generatePositions() {
		const imageCount = images.length;
		const imageSizeFactor = 1;

		const getOptimalLayout = () => {
			const parallaxCompensationMultiplier = Math.min(0.9, 0.6 + imageCount * 0.015);

			let zonesX, avgImgHeight, verticalSpacing, padding;

			if (isMobile) {
				zonesX = 2;
				avgImgHeight = 240 * imageSizeFactor;
				verticalSpacing = 120;
				padding = 20;
			} else if (isTablet) {
				zonesX = 3;
				avgImgHeight = 280 * imageSizeFactor;
				verticalSpacing = 180;
				padding = 40;
			} else {
				zonesX = 4;
				avgImgHeight = 320 * imageSizeFactor;
				verticalSpacing = 220;
				padding = 60;
			}

			const zonesY = Math.ceil(imageCount / zonesX);
			const containerWidth = innerWidth;
			const baseHeight = zonesY * (avgImgHeight + verticalSpacing);
			const containerHeight = baseHeight - innerHeight * parallaxCompensationMultiplier;

			return { containerWidth, containerHeight, zonesX, zonesY, padding };
		};

		let { containerWidth, containerHeight, zonesX, zonesY, padding } = getOptimalLayout();
		const placedImages: ImageData[] = [];

		const zoneWidth = (containerWidth - 2 * padding) / zonesX;
		const zoneHeight = (containerHeight - 2 * padding) / zonesY;

		images.forEach((baseImage, index) => {
			const isVertical = index % 3 === 0; // Mix of vertical and horizontal

			// Responsive sizing
			const baseSize = isMobile
				? isVertical
					? 140 * imageSizeFactor
					: 180 * imageSizeFactor
				: isTablet
					? isVertical
						? 180 * imageSizeFactor
						: 220 * imageSizeFactor
					: isVertical
						? 220 * imageSizeFactor
						: 280 * imageSizeFactor;

			const sizeVariation = 0.6 + (noise(index * 0.5, index * 0.3) + 1) * 0.1;
			const width = Math.floor(baseSize * sizeVariation);
			const height = isVertical ? Math.floor(width * 1.4) : Math.floor(width * 0.75);

			// Position within zone (center incomplete last row)
			const rowIndex = Math.floor(index / zonesX);
			const colIndex = index % zonesX;
			let itemsInRow = zonesX;
			if (rowIndex === zonesY - 1) {
				const remaining = imageCount - rowIndex * zonesX;
				if (remaining > 0) itemsInRow = remaining;
			}
			const rowOffset = ((zonesX - itemsInRow) * zoneWidth) / 2;
			const zoneX = colIndex * zoneWidth + padding + rowOffset;
			const zoneY = rowIndex * zoneHeight + padding;

			const scatterRange = isMobile ? 0.4 : 0.7;
			const scatterX =
				(noise(index * 0.7, index * 0.2) + (Math.random() - 0.5)) * (zoneWidth * scatterRange);
			const scatterY = (noise(index * 0.3, index * 0.8) + (Math.random() - 0.5)) * (zoneHeight * 0.5);

			const x = Math.max(
				padding,
				Math.min(containerWidth - width - padding, zoneX + zoneWidth / 2 + scatterX)
			);

			const y = Math.max(
				padding,
				Math.min(containerHeight - height - padding, zoneY + zoneHeight / 2 + scatterY)
			);

			const maxRotation = isMobile ? 6 : 15;
			const rotation =
				noise(index * 0.4, index * 0.6) * maxRotation + (Math.random() - 0.5) * maxRotation;

			const scaleRange = isMobile ? 0.08 : 0.15;
			const scale = 1 - scaleRange / 2 + (noise(index * 0.2, index * 0.9) + 1) * scaleRange;

			const parallaxSpeed = 0.05 + Math.random() * 0.25;
			const zIndex = Math.floor(Math.random() * 10) + 5;

			placedImages.push({
				...baseImage,
				isVertical,
				x,
				y,
				rotation,
				scale,
				width,
				height,
				parallaxSpeed,
				zIndex
			});
		});

		processedImages = placedImages;
		return containerHeight;
	}

	// Transform calculation with parallax
	function getImageTransform(image: ImageData): string {
		const parallaxOffset = scrollSpring.current * image.parallaxSpeed;
		return `translate3d(${image.x}px, ${image.y - parallaxOffset}px, 0) rotate(${image.rotation}deg) scale(${image.scale})`;
	}

	// Event handlers
	function handleScroll() {
		scrollSpring.target = window.scrollY;
	}

	function handleResize() {
		innerWidth = window.innerWidth;
		innerHeight = window.innerHeight;
		containerHeight = generatePositions();
	}

	// Reactive effect to regenerate positions when images change
	$effect(() => {
		if (images.length > 0) {
			containerHeight = generatePositions();
		}
	});

	// Lifecycle
	onMount(() => {
		innerWidth = window.innerWidth;
		innerHeight = window.innerHeight;
		containerHeight = generatePositions();

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<section class="relative mx-auto w-full bg-white pt-24 overflow-hidden">
	<!-- Floating shapes background -->
	<FloatingShapes3 
		intensity={0.5} 
		quantityScale={0.6} 
		opacityScale={0.6}
		grainEnabled={true}
		grainIntensity={0.06}
		grainScale={48}
	/>
	
	<!-- Sticky title section -->
	<div class="sticky top-0 flex h-screen items-center justify-center pointer-events-none  z-20">
		<div class="px-4 text-center max-w-5xl mx-auto">
			<h2 class="mb-8 text-5xl md:text-6xl lg:text-7xl font-light leading-tight text-[#333333]">
				Discover Our <span class="text-[#dfbc69] italic">Space</span>
			</h2>
			<p class="mx-auto max-w-3xl text-xl md:text-2xl leading-relaxed text-[#333333] opacity-70 font-light">
				A warm, natural environment where children play, learn, and grow while parents connect and relax
			</p>
			<div class="mt-12 flex items-center justify-center gap-2">
				<svg class="w-6 h-6 text-[#333333] opacity-40 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
				</svg>
				<span class="text-sm text-[#333333] opacity-40 font-light tracking-wide uppercase">Scroll to explore</span>
			</div>
		</div>
	</div>

	<!-- Scrollable gallery container -->
	<div class="relative z-10" style="height: {containerHeight}px;">
		<div class="absolute inset-0">
			{#each processedImages as image}
				<div
					class="group absolute cursor-pointer overflow-hidden opacity-90 backdrop-blur-sm transition-all duration-300 hover:z-30 hover:opacity-100 hover:shadow-2xl"
					style="
						transform: {getImageTransform(image)};
						width: {image.width}px;
						height: {image.height}px;
						z-index: {image.zIndex};
						{getShapeStyles(image.shape)}
					"
					role="button"
					tabindex="0"
				>
				<img
					src={image.src}
					alt={image.title}
					class="h-full w-full object-cover transition-all duration-300 group-hover:scale-110"
					loading="lazy"
				/>
				<div
					class="absolute inset-0 bg-[#333333]/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-6"
				>
					<div>
						<h3 class="text-xl font-light text-white mb-1 sm:text-2xl">
							{image.title}
						</h3>
						<p class="text-sm text-white/80 font-light">
							{image.description}
						</p>
					</div>
				</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	section {
		will-change: scroll-position;
	}
</style>

