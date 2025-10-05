<script lang="ts">
	import ServicesNav from '$lib/components/home/ServicesNav.svelte';
	import FloatingGallery from '$lib/components/home/FloatingGallery.svelte';
	import FloatingShapes3 from '$lib/components/workshops/FloatingShapes3.svelte';
	import Icon from '@iconify/svelte';
	import { BUSINESS_INFO } from '$lib/constants';
	import LogoImage from '$lib/assets/logo/logo-no-sun-transparent.png';

</script>

<!-- Hero Section - Bold and Creative -->
<section class="relative min-h-screen bg-[#F9EDE8] overflow-hidden flex items-center">
	<!-- Ambient floating shapes -->
	<FloatingShapes3 
		intensity={0.6} 
		quantityScale={0.8} 
		opacityScale={0.7}
		grainEnabled={true}
		grainIntensity={0.08}
		grainScale={40}
	/>
	
	<div class="relative z-10 w-full px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto">
			<div class="grid lg:grid-cols-2 gap-12 items-center">
				<!-- Text Content -->
				<div class="order-2 lg:order-1">
					<h1 class="text-6xl md:text-7xl lg:text-8xl font-light leading-none mb-8">
						<span class="text-[#333333]">Welcome to</span><br/>
						<span class="text-[#dfbc69] relative inline-block">
							Casa Luma
							<svg class="absolute -bottom-2 left-0 w-full" height="20" viewBox="0 0 300 20" preserveAspectRatio="none">
								<path d="M0,15 Q150,0 300,15" stroke="#dfbc69" stroke-width="3" fill="none" opacity="0.5"/>
							</svg>
						</span>
					</h1>
					
					<p class="text-2xl md:text-3xl font-light text-[#333333] opacity-80 mb-4 leading-relaxed">
						{BUSINESS_INFO.tagline}
					</p>
					
					<p class="text-xl text-[#333333] opacity-70 font-light mb-12 leading-relaxed">
						A natural play space where children explore and learn while parents relax in our garden café
					</p>
					
					<!-- CTAs with geometric design -->
					<div class="flex flex-col sm:flex-row gap-6">
						<a
							href="/open-play"
							class="group inline-flex items-center gap-4 px-10 py-5 bg-[#333333] text-white hover:bg-[#dfbc69] hover:text-[#333333] transition-all duration-300 transform hover:translate-x-2"
						>
							<span class="text-lg font-light tracking-wide">Book a Visit</span>
							<Icon 
								icon="streamline:interface-arrows-right-arrow-right-keyboard"
								width="20"
								height="20"
								class="transition-transform duration-300 group-hover:translate-x-1"
							/>
						</a>
						<a
							href="/about"
							class="group inline-flex items-center gap-4 px-10 py-5 border-2 border-[#333333] text-[#333333] hover:bg-[#333333] hover:text-white transition-all duration-300"
						>
							<span class="text-lg font-light tracking-wide">Learn More</span>
							<Icon 
								icon="streamline:interface-arrows-right-circle-arrow-right-keyboard-circle"
								width="20"
								height="20"
								class="transition-transform duration-300 group-hover:rotate-90"
							/>
						</a>
					</div>
				</div>
				
				<!-- Visual Element -->
				<div class="order-1 lg:order-2 relative">
					<!-- Geometric composition -->
					<div class="relative w-full max-w-lg mx-auto">
						<!-- Main circle -->
						<div 
							class="aspect-square relative"
							style="filter: drop-shadow(20px 20px 40px rgba(0,0,0,0.1));"
						>
							<div 
								class="absolute inset-0 rounded-full"
								style="background: linear-gradient(135deg, #dfbc69 0%, #dfbc6966 100%);"
							></div>
							<img 
								src={LogoImage}
								alt="Children playing at Casa Luma"
								class="absolute inset-4 rounded-full object-cover w-[calc(100%-2rem)] h-[calc(100%-2rem)]"
							/>
						</div>
						
						<!-- Floating elements -->
						<div 
							class="absolute -top-8 -right-8 w-32 h-32 transform rotate-12"
							style="background: linear-gradient(135deg, #A8C3A0 0%, #A8C3A066 100%); clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);"
						></div>
						
						<div 
							class="absolute -bottom-12 -left-12 w-40 h-40"
							style="background: linear-gradient(135deg, #E07A5F 0%, #E07A5F66 100%); border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;"
						></div>
						
						<!-- Decorative dots -->
						<div class="absolute top-1/2 -right-16 transform -translate-y-1/2">
							<div class="flex flex-col gap-2">
								{#each [1, 2, 3] as i}
									<div 
										class="w-2 h-2 rounded-full bg-[#dfbc69]"
										style="opacity: {1 - i * 0.3};"
									></div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- About Section - Creative Design -->
<section class="relative py-24 px-4 bg-white overflow-hidden">
	<div class="max-w-7xl mx-auto">
		<div class="grid lg:grid-cols-12 gap-12 items-center">
			<!-- Large Typography -->
			<div class="lg:col-span-7">
				<h2 class="text-5xl md:text-6xl lg:text-7xl font-light text-[#333333] leading-tight mb-8">
					Where <span class="text-[#A8C3A0] italic">play</span> meets
					<span class="text-[#dfbc69] relative inline-block ml-2">
						peace
						<div class="absolute -bottom-2 left-0 w-full h-1 bg-[#dfbc69] opacity-30"></div>
					</span>
				</h2>
				<p class="text-2xl text-[#333333] opacity-70 font-light leading-relaxed">
					Located in beautiful <span class="font-medium text-[#E07A5F]">{BUSINESS_INFO.location}</span>, 
					Casa Luma offers a Montessori-inspired environment where children can play freely with natural materials 
					while parents enjoy specialty coffee in our peaceful garden setting.
				</p>
			</div>
			
			<!-- Geometric Visual -->
			<div class="lg:col-span-5 relative">
				<div class="relative h-96 lg:h-[500px]">
					<!-- Overlapping shapes -->
					<div 
						class="absolute top-0 right-0 w-64 h-64 transform rotate-45"
						style="background: linear-gradient(135deg, #dfbc6922 0%, #dfbc6944 100%);"
					></div>
					<div 
						class="absolute bottom-0 left-0 w-72 h-72 rounded-full"
						style="background: linear-gradient(135deg, #A8C3A022 0%, #A8C3A044 100%);"
					></div>
					<div 
						class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80"
						style="
							background: linear-gradient(135deg, #E07A5F22 0%, #E07A5F44 100%);
							clip-path: polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%);
						"
					></div>
					
					<!-- Central image -->
					<img 
						src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80"
						alt="Parent and child at Casa Luma"
						class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-72 object-cover shadow-2xl"
						style="clip-path: polygon(0 10%, 100% 0, 100% 90%, 0 100%);"
					/>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Services Navigation - Enhanced -->
<div class="relative bg-[#F9EDE8] py-20 overflow-hidden">
	<FloatingShapes3 
		intensity={0.4} 
		quantityScale={0.3} 
		opacityScale={0.5}
	/>
	<div class="relative z-10">
		<h2 class="text-5xl md:text-6xl font-light text-center mb-16 text-[#333333]">
			Explore <span class="text-[#dfbc69]">Casa Luma</span>
		</h2>
		<ServicesNav />
	</div>
</div>

<!-- Floating Gallery - With transition -->
<div class="relative">
	<!-- Decorative transition -->
	<svg class="absolute top-0 w-full h-24 text-[#F9EDE8]" viewBox="0 0 1200 120" preserveAspectRatio="none">
		<path d="M0,120 L0,0 L600,60 L1200,0 L1200,120 Z" fill="currentColor"></path>
	</svg>
	<FloatingGallery />
</div>
