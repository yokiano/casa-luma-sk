<script lang="ts">
	import FloatingShapes3 from '$lib/components/workshops/FloatingShapes3.svelte';

	interface Props {
		titleBlack: string;
		titleColor: string;
		tagline: string;
		cta?: {
			text: string;
			href: string;
		};
		maxWidth?: 'narrow' | 'medium' | 'wide';
	}

	let { 
		titleBlack, 
		titleColor, 
		tagline, 
		cta,
		maxWidth = 'medium'
	}: Props = $props();

	const maxWidthClasses = {
		narrow: 'max-w-3xl',
		medium: 'max-w-5xl',
		wide: 'max-w-6xl'
	};
</script>

<section class="bg-background py-20 px-4 relative overflow-hidden">
	<FloatingShapes3 intensity={0.8} quantityScale={0.8} opacityScale={0.8} />
	<div class="{maxWidthClasses[maxWidth]} mx-auto text-center relative">
		<h1 class="text-6xl md:text-7xl font-light mb-6 text-[#333333] tracking-tight">
			<span class="block">{titleBlack}</span>
			<span class="block text-accent italic font-serif">{@html titleColor}</span>
		</h1>
		<p class="text-xl md:text-2xl text-[#333333] font-light leading-relaxed opacity-80">
			{tagline}
		</p>
		
		{#if cta}
			<div class="mt-10">
				<a 
					href={cta.href}
					class="inline-block px-8 py-4 bg-accent text-white font-light text-lg tracking-wide transition-all hover:bg-opacity-90 hover:scale-105"
				>
					{cta.text}
				</a>
			</div>
		{/if}
	</div>
</section>

