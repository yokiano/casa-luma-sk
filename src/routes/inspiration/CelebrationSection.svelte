<script lang="ts">
	import { scrollY, innerHeight } from 'svelte/reactivity/window';
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import { ArrowRight } from 'lucide-svelte';
	import ScrollExpandImage from '$lib/components/animations/ScrollExpandImage.svelte';
</script>

<ScrollExpandImage
	src="https://images.unsplash.com/photo-1530103862676-de3c9a59af38?q=80&w=1600&auto=format&fit=crop"
	alt="Birthday celebration at Casa Luma"
	scrollLength={1.8}
>
	<Reveal direction="up" delay={0} skewX={0}>
		<h2 class="text-5xl md:text-9xl font-serif uppercase tracking-tighter text-white drop-shadow-lg">
			CELEBRATE
		</h2>
	</Reveal>
	<Reveal direction="up" delay={120} skewX={0}>
		<p class="mt-6 text-lg md:text-2xl font-sans font-light tracking-widest max-w-lg text-white/90">
			Magical birthday moments crafted for your little ones.
		</p>
	</Reveal>
	<Reveal direction="up" delay={240} skewX={0}>
		<a
			href="/birthdays"
			class="mt-10 inline-flex items-center gap-4 px-8 py-4 border border-white/80 rounded-full text-white hover:bg-white hover:text-[#2D3A3A] transition-colors duration-300 uppercase tracking-widest text-sm"
		>
			Plan a Party <ArrowRight size={16} />
		</a>
	</Reveal>
</ScrollExpandImage>
