<script lang="ts">
	// Brand colors
	const colors = {
		primary: '#dfbc69',
		secondary: '#A8C3A0', 
		accent: '#E07A5F'
	};

	// Intensity controls
	// - intensity: 0..1 master control scaling both quantity and opacity
	// - quantityScale: optional multiplier for how many shapes to render
	// - opacityScale: optional multiplier for how opaque shapes appear
	interface Props {
		intensity?: number;
		quantityScale?: number;
		opacityScale?: number;
		grainEnabled?: boolean;
		grainIntensity?: number; // 0..1 visual strength via overlay opacity
		grainScale?: number; // px tile size for the repeating noise
	}

	let {
		intensity = 0.8,
		quantityScale = 1,
		opacityScale = 1,
		grainEnabled = true,
		grainIntensity = 0.11,
		grainScale = 44
	}: Props = $props();

	const clampedIntensity = $derived(Math.max(0, Math.min(1, intensity)));
	const quantityMultiplier = $derived(Math.max(0, quantityScale) * clampedIntensity);
	const opacityMultiplier = $derived(Math.max(0, opacityScale) * clampedIntensity);

	// Procedural grain generation (canvas → data URL)
	let noiseDataUrl = $state<string>('');
	function createNoiseDataUrl(size = 128): string {
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) return '';
		const imageData = ctx.createImageData(size, size);
		const data = imageData.data;
		for (let i = 0; i < data.length; i += 4) {
			const v = Math.floor(Math.random() * 256);
			data[i] = v; // R
			data[i + 1] = v; // G
			data[i + 2] = v; // B
			data[i + 3] = 255; // A (full), visual strength controlled via overlay opacity
		}
		ctx.putImageData(imageData, 0, 0);
		return canvas.toDataURL('image/png');
	}

	$effect(() => {
		if (!grainEnabled) {
			noiseDataUrl = '';
			return;
		}
		// Generate once on mount and whenever grainEnabled toggles
		noiseDataUrl = createNoiseDataUrl(128);
	});

	const grainOpacity = $derived(Math.max(0, Math.min(1, grainIntensity * opacityMultiplier)));

	// Generate random position within bounds
	function randomPosition(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	// Generate blurry gradient backgrounds
	const gradients = Array.from({ length: 32 }, (_, i) => {
		const colorKeys = Object.keys(colors) as Array<keyof typeof colors>;
		const color = colors[colorKeys[i % 3]];
		const size = randomPosition(600, 1200);
		const top = randomPosition(-20, 100);
		const left = randomPosition(-20, 100);
		const opacity = i < 16 ? randomPosition(2, 4) : randomPosition(8, 12);
		const blur = i < 16 ? 'blur-3xl' : 'blur-2xl';
		
		return {
			color,
			size,
			top: `${top}%`,
			left: `${left}%`,
			opacity: opacity / 100,
			blur
		};
	});

	// Derived counts based on intensity
	const gradientCount = $derived(Math.max(0, Math.floor(32 * quantityMultiplier)));

	// Generate sharp geometric shapes
	type ShapeType = 'square' | 'circle' | 'triangle';
	const geometricShapes = Array.from({ length: 20 }, (_, i) => {
		const shapes: ShapeType[] = ['square', 'circle', 'triangle'];
		const shape = shapes[i % 3];
		const colorKeys = Object.keys(colors) as Array<keyof typeof colors>;
		const color = colors[colorKeys[i % 3]];
		const size = randomPosition(300, 800);
		const top = randomPosition(0, 100);
		const left = randomPosition(-10, 100);
		const rotation = randomPosition(0, 360);
		
		return {
			shape,
			color,
			size,
			top: `${top}%`,
			left: `${left}%`,
			rotation,
			opacity: 0.1
		};
	});
	const geometricCount = $derived(Math.max(0, Math.floor(20 * quantityMultiplier)));

	// Generate organic blob shapes
	const organicShapes = Array.from({ length: 16 }, (_, i) => {
		const colorKeys = Object.keys(colors) as Array<keyof typeof colors>;
		const color = colors[colorKeys[i % 3]];
		const size = randomPosition(400, 700);
		const top = randomPosition(0, 100);
		const left = randomPosition(-10, 100);
		const rotation = randomPosition(0, 90);
		
		// Different blob shapes
		const blobStyles = [
			'30% 70% 70% 30% / 30% 30% 70% 70%',
			'60% 40% 30% 70% / 60% 30% 70% 40%',
			'40% 60% 60% 40% / 50% 50% 50% 50%',
			'70% 30% 50% 50% / 30% 60% 40% 70%',
			'45% 55% 65% 35% / 60% 40% 60% 40%',
			'55% 45% 45% 55% / 45% 55% 45% 55%'
		];
		
		return {
			color,
			size,
			top: `${top}%`,
			left: `${left}%`,
			rotation,
			opacity: 0.1,
			borderRadius: blobStyles[i % 6]
		};
	});
	const organicCount = $derived(Math.max(0, Math.floor(16 * quantityMultiplier)));

	// Generate small accent shapes
	const accentShapes = Array.from({ length: 24 }, (_, i) => {
		const shapes: ('circle' | 'square')[] = ['circle', 'square'];
		const shape = shapes[i % 2];
		const colorKeys = Object.keys(colors) as Array<keyof typeof colors>;
		const color = colors[colorKeys[i % 3]];
		const size = randomPosition(30, 80);
		const top = randomPosition(0, 100);
		const left = randomPosition(0, 100);
		const rotation = randomPosition(0, 360);
		
		return {
			shape,
			color,
			size,
			top: `${top}%`,
			left: `${left}%`,
			rotation,
			opacity: 0.15
		};
	});
	const accentCount = $derived(Math.max(0, Math.floor(24 * quantityMultiplier)));
</script>

<div class="absolute inset-0 pointer-events-none overflow-hidden">
	<!-- Blurry gradient backgrounds -->
    {#each gradients.slice(0, gradientCount) as gradient}
		<div 
			class="absolute bg-gradient-radial from-[{gradient.color}] to-transparent {gradient.blur}"
			style="
				width: {gradient.size}px; 
				height: {gradient.size}px;
				top: {gradient.top};
				left: {gradient.left};
				opacity: {Math.min(1, gradient.opacity * opacityMultiplier)};
			"
		></div>
	{/each}
	
	<!-- Sharp geometric shapes -->
	{#each geometricShapes.slice(0, geometricCount) as shape}
		{#if shape.shape === 'circle'}
			<div 
				class="absolute rounded-full bg-[{shape.color}]"
				style="
					width: {shape.size}px;
					height: {shape.size}px;
					top: {shape.top};
					left: {shape.left};
					opacity: {Math.min(1, shape.opacity * opacityMultiplier)};
				"
			></div>
		{:else if shape.shape === 'square'}
			<div 
				class="absolute bg-[{shape.color}]"
				style="
					width: {shape.size}px;
					height: {shape.size}px;
					top: {shape.top};
					left: {shape.left};
					transform: rotate({shape.rotation}deg);
					opacity: {Math.min(1, shape.opacity * opacityMultiplier)};
				"
			></div>
		{:else}
			<!-- Triangle -->
			<div 
				class="absolute"
				style="
					top: {shape.top};
					left: {shape.left};
					width: 0;
					height: 0;
					border-left: {shape.size / 2}px solid transparent;
					border-right: {shape.size / 2}px solid transparent;
					border-bottom: {shape.size * 0.87}px solid {shape.color};
					opacity: {Math.min(1, shape.opacity * opacityMultiplier)};
				"
			></div>
		{/if}
	{/each}
	
	<!-- Organic blob shapes -->
	{#each organicShapes.slice(0, organicCount) as blob}
		<div 
			class="absolute bg-[{blob.color}]"
			style="
				width: {blob.size}px;
				height: {blob.size}px;
				top: {blob.top};
				left: {blob.left};
				border-radius: {blob.borderRadius};
				transform: rotate({blob.rotation}deg);
				opacity: {Math.min(1, blob.opacity * opacityMultiplier)};
			"
		></div>
	{/each}
	
	<!-- Small accent shapes -->
	{#each accentShapes.slice(0, accentCount) as accent}
		<div 
			class="absolute bg-[{accent.color}] {accent.shape === 'circle' ? 'rounded-full' : ''}"
			style="
				width: {accent.size}px;
				height: {accent.size}px;
				top: {accent.top};
				left: {accent.left};
				transform: rotate({accent.rotation}deg);
				opacity: {Math.min(1, accent.opacity * opacityMultiplier)};
			"
		></div>
	{/each}

	{#if grainEnabled && noiseDataUrl}
		<!-- Subtle grain overlay across floating area -->
		<div 
			class="absolute inset-0 pointer-events-none"
			style="
				background-image: url({noiseDataUrl});
				background-repeat: repeat;
				background-size: {grainScale}px {grainScale}px;
				opacity: {grainOpacity};
			"
		></div>
	{/if}
</div>

<style>
	.bg-gradient-radial {
		background-image: radial-gradient(circle, var(--tw-gradient-stops));
	}
</style>
