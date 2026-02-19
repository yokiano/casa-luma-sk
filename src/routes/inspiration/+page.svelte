<script lang="ts">
	import { scrollY } from 'svelte/reactivity/window';

	import HeroSection from './HeroSection.svelte';
	import InlineTextSection from './InlineTextSection.svelte';
	import CelebrationSection from './CelebrationSection.svelte';
	import WorkshopsSection from './WorkshopsSection.svelte';
	import ActivitiesSection from './ActivitiesSection.svelte';

	import { ArrowUpRight } from 'lucide-svelte';

	let scrolled = $derived((scrollY.current ?? 0) > 50);
</script>

<svelte:head>
	<title>Casa Luma — A space to play, eat & celebrate</title>
</svelte:head>

<div class="min-h-screen bg-[#F9F7F2] text-[#2D3A3A] selection:bg-[#E07A5F] selection:text-white">

	<!-- Nav -->
	<nav
		class="fixed top-0 w-full z-50 px-8 py-5 flex justify-between items-center text-[#2D3A3A] transition-all duration-500 {scrolled ? 'bg-[#F9F7F2]/90 shadow-sm backdrop-blur-md' : ''}"
	>
		<div class="hidden md:flex gap-8 text-xs tracking-[0.2em] uppercase font-sans">
			<a href="/about" class="hover:text-[#E07A5F] transition-colors">Story</a>
			<a href="/open-play" class="hover:text-[#E07A5F] transition-colors">Play</a>
		</div>

		<div class="absolute left-1/2 -translate-x-1/2 text-xl font-serif tracking-widest uppercase">
			Casa Luma
		</div>

		<div class="hidden md:flex gap-8 text-xs tracking-[0.2em] uppercase font-sans items-center">
			<a href="/workshops" class="hover:text-[#E07A5F] transition-colors">Experiences</a>
			<a href="/contact" class="hover:text-[#E07A5F] transition-colors">Contact</a>
			<span class="flex items-center gap-1 cursor-pointer hover:text-[#E07A5F]">
				En <ArrowUpRight size={12} />
			</span>
		</div>

		<button class="md:hidden text-xs tracking-widest uppercase">Menu</button>
	</nav>

	<!-- Page sections -->
	<HeroSection />
	<InlineTextSection />
	<CelebrationSection />
	<WorkshopsSection />
	<ActivitiesSection />

	<!-- Footer -->
	<footer class="bg-[#2D3A3A] text-[#F9F7F2] py-20 px-8 md:px-24">
		<div class="grid md:grid-cols-2 gap-16">
			<div>
				<h4 class="text-xs font-sans tracking-[0.3em] uppercase mb-8 opacity-50">
					Join our community
				</h4>
				<div class="flex flex-col gap-3 max-w-sm">
					<input
						type="email"
						placeholder="Your email address"
						class="bg-transparent border-b border-[#F9F7F2]/25 py-3 focus:outline-none focus:border-[#F9F7F2]/60 transition-colors placeholder:text-[#F9F7F2]/25 text-sm font-sans"
					/>
					<button
						class="self-start mt-3 text-xs uppercase tracking-[0.2em] hover:text-[#dfbc69] transition-colors font-sans"
					>
						Subscribe
					</button>
				</div>
			</div>

			<div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
				<div class="space-y-1 font-sans text-sm opacity-70 leading-relaxed">
					<p class="font-serif text-2xl opacity-100 mb-4">Casa Luma</p>
					<p>Shlomo HaMelech St, Tel Aviv</p>
					<p>hello@casaluma.co.il</p>
				</div>
				<div class="flex gap-3">
					<a
						href="https://instagram.com"
						class="w-10 h-10 border border-[#F9F7F2]/25 rounded-full flex items-center justify-center hover:bg-[#F9F7F2] hover:text-[#2D3A3A] transition-colors cursor-pointer text-[10px] tracking-widest font-sans"
					>
						IG
					</a>
					<a
						href="https://facebook.com"
						class="w-10 h-10 border border-[#F9F7F2]/25 rounded-full flex items-center justify-center hover:bg-[#F9F7F2] hover:text-[#2D3A3A] transition-colors cursor-pointer text-[10px] tracking-widest font-sans"
					>
						FB
					</a>
				</div>
			</div>
		</div>

		<div class="mt-16 pt-8 border-t border-[#F9F7F2]/10 text-[10px] font-sans tracking-widest uppercase opacity-40">
			&copy; 2026 Casa Luma. All rights reserved.
		</div>
	</footer>
</div>
