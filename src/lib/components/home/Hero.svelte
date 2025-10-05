<script lang="ts">
	import { BUSINESS_INFO } from '$lib/constants';
</script>

<section class="relative min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
	<div class="max-w-4xl mx-auto text-center">
		<h1 class="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 tracking-tight">
			Welcome to <span class="text-primary">{BUSINESS_INFO.name}</span>
		</h1>
		
		<p class="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
			{BUSINESS_INFO.tagline}
		</p>

		<p class="text-base sm:text-lg text-foreground/80 mb-10 max-w-2xl mx-auto">
			A natural play space where children explore and learn while parents relax in our garden café
		</p>

		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a
				href="/open-play"
				class="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
			>
				Book a Visit
			</a>
			<a
				href="/about"
				class="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-foreground bg-secondary hover:bg-secondary/90 rounded-lg transition-colors"
			>
				Learn More
			</a>
		</div>
	</div>
</section>

