<script lang="ts">
	import { SERVICES, type ServiceCategory } from '$lib/constants';

	interface Props {
		services?: ServiceCategory[];
	}

	let { services = SERVICES }: Props = $props();
</script>

<section class="w-full">

	<!-- 2 columns on mobile, 3 on desktop, zero gap -->
	<div class="grid grid-cols-2 lg:grid-cols-3 gap-0">
		{#each services as service}
			<a
				href={service.href}
				class="group block relative overflow-hidden w-full h-[40vh] sm:h-[50vh] lg:h-[60vh] bg-muted transition-all duration-500"
			>
				<!-- Background Image -->
				<img 
					src={service.imageUrl}
					alt={service.title}
					class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
				/>
				
				<!-- Colored overlay -->
				<div 
					class="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0"
					style="background: linear-gradient(135deg, 
						{service.title === 'Open Play' ? '#dfbc69' : 
						 service.title === 'Café & Restaurant' ? '#A8C3A0' :
						 service.title === 'Shop' ? '#E07A5F' :
						 service.title === 'Workshops' ? '#dfbc69' :
						 service.title === 'Events' ? '#A8C3A0' : '#E07A5F'}33 0%, 
						{service.title === 'Open Play' ? '#dfbc69' : 
						 service.title === 'Café & Restaurant' ? '#A8C3A0' :
						 service.title === 'Shop' ? '#E07A5F' :
						 service.title === 'Workshops' ? '#dfbc69' :
						 service.title === 'Events' ? '#A8C3A0' : '#E07A5F'}11 100%);"
				></div>

				<!-- Gradient overlay for text readability -->
				<div class="absolute inset-0 bg-gradient-to-t from-[#333333]/95 via-[#333333]/50 to-transparent"></div>

				<!-- Content -->
				<div class="absolute inset-0 px-4 sm:px-8 md:px-10 lg:px-16 flex flex-col justify-end pb-8 sm:pb-10 md:pb-16">
					<div class="transform transition-all duration-500 group-hover:-translate-y-3">
						<!-- Service number/accent -->
						<div class="mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
							<div class="w-12 h-0.5" 
								style="background-color: {service.title === 'Open Play' ? '#dfbc69' : 
									service.title === 'Café & Restaurant' ? '#A8C3A0' :
									service.title === 'Shop' ? '#E07A5F' :
									service.title === 'Workshops' ? '#dfbc69' :
									service.title === 'Events' ? '#A8C3A0' : '#E07A5F'};"
							></div>
						</div>
						
						<h3 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-white mb-2 sm:mb-3 leading-tight">
							{service.title}
						</h3>
						<p class="text-sm sm:text-base md:text-lg text-white/80 max-w-2xl line-clamp-2 sm:line-clamp-none font-light">
							{service.description}
						</p>
						
						<!-- Arrow indicator -->
						<div class="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-0 group-hover:translate-x-2">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
							</svg>
						</div>
					</div>
				</div>
			</a>
		{/each}
	</div>
</section>

