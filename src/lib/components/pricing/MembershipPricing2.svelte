<script lang="ts">
	import { MEMBERSHIPS, PAY_AS_YOU_GO } from '$lib/constants';
	import FloatingShapes3 from '$lib/components/workshops/FloatingShapes3.svelte';
	import SectionHero from '$lib/components/layout/SectionHero.svelte';
	import Icon from '@iconify/svelte';

	interface Props {
		showHeader?: boolean;
	}

	let { showHeader = true }: Props = $props();

	// Assign colors to each membership
	const membershipColors = ['#dfbc69', '#A8C3A0', '#E07A5F'];
	
	// Assign shapes to each membership
	const shapes = ['circle', 'blob', 'diamond'] as const;
	
	// Assign images to each membership
	const membershipImages = [
		'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80', // Family playing together
		'https://images.unsplash.com/photo-1503919005314-30d93d07d823?w=800&q=80', // Children learning/playing
		'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80'  // Kids exploring/nature
	];
</script>

{#if showHeader}
	<SectionHero 
		titleBlack="Memberships"
		titleColor="&amp; Passes"
		tagline="Play, learn, and laugh together in our beautiful island home"
	/>
{/if}

<!-- Memberships Section -->
<section class="py-24 px-4 bg-[#F9EDE8] relative overflow-hidden">
	<FloatingShapes3 intensity={0.8} quantityScale={0.4} opacityScale={0.8} />
	<div class="max-w-7xl mx-auto relative">
		<div class="text-center mb-20">
			<h2 class="text-5xl md:text-6xl font-light mb-4 text-[#333333] tracking-tight">Our Memberships</h2>
			<p class="text-xl text-[#333333] opacity-70 font-light max-w-2xl mx-auto">
				Perfect for families who want to make Casa Luma a regular part of their lives
			</p>
		</div>

		<div class="space-y-32 max-w-6xl mx-auto">
			{#each MEMBERSHIPS as membership, index}
				{@const color = membershipColors[index]}
				{@const shape = shapes[index]}
				{@const image = membershipImages[index]}
				{@const isReversed = index % 2 === 1}
				
				<div class="flex flex-col lg:flex-row {isReversed ? 'lg:flex-row-reverse' : ''} gap-12 items-center">
					<!-- Visual/Shape Section -->
					<div class="w-full lg:w-2/5 relative">
						{#if shape === 'circle'}
							<!-- Circle shape with image -->
							<div class="aspect-square relative max-w-md mx-auto">
								<div 
									class="absolute inset-0 rounded-full"
									style="background: linear-gradient(135deg, {color}44 0%, {color}66 100%);"
								></div>
								<div 
									class="absolute inset-4 rounded-full overflow-hidden"
								>
									<img 
										src={image}
										alt={membership.name}
										class="w-full h-full object-cover"
									/>
									<div 
										class="absolute inset-0 rounded-full"
										style="background: linear-gradient(135deg, {color}22 0%, transparent 60%);"
									></div>
								</div>
							</div>
						{:else if shape === 'blob'}
							<!-- Organic blob shape with image -->
							<div class="aspect-square relative max-w-md mx-auto">
								<div 
									class="absolute inset-0"
									style="
										background: linear-gradient(135deg, {color}44 0%, {color}66 100%);
										border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
									"
								></div>
								<div 
									class="absolute inset-4 overflow-hidden"
									style="border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;"
								>
									<img 
										src={image}
										alt={membership.name}
										class="w-full h-full object-cover"
									/>
									<div 
										class="absolute inset-0"
										style="
											background: linear-gradient(135deg, {color}22 0%, transparent 60%);
											border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
										"
									></div>
								</div>
							</div>
						{:else}
							<!-- Diamond/square rotated with image -->
							<div class="aspect-square relative max-w-md mx-auto">
								<div 
									class="absolute inset-0 transform rotate-45"
									style="background: linear-gradient(135deg, {color}44 0%, {color}66 100%);"
								></div>
								<div 
									class="absolute inset-4 transform rotate-45 overflow-hidden"
								>
									<div class="transform -rotate-45 w-[141%] h-[141%] -translate-x-[20.5%] -translate-y-[20.5%]">
										<img 
											src={image}
											alt={membership.name}
											class="w-full h-full object-cover"
										/>
										<div 
											class="absolute inset-0"
											style="background: linear-gradient(135deg, {color}22 0%, transparent 60%);"
										></div>
									</div>
								</div>
							</div>
						{/if}
						
						<!-- Floating price tag -->
						<div 
							class="absolute -bottom-6 {isReversed ? 'left-8' : 'right-8'} bg-white px-8 py-4 transform {isReversed ? 'rotate-2' : '-rotate-2'} shadow-xl"
						>
							<span class="text-3xl font-light text-[#333333]">{membership.price}</span>
						</div>
					</div>

					<!-- Content Section -->
					<div class="w-full lg:w-3/5">
						{#if membership.highlight}
							<div 
								class="inline-block mb-6 px-6 py-2"
								style="background-color: {color}; color: white; clip-path: polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%);"
							>
								<span class="text-sm font-light tracking-widest uppercase">Great for families</span>
							</div>
						{/if}

						<h3 
							class="text-5xl lg:text-6xl font-light text-[#333333] mb-4 leading-tight"
						>
							{membership.name}
						</h3>
						
						<p class="text-xl opacity-70 text-[#333333] font-light mb-8">{membership.duration}</p>

						<!-- Quick Summary with geometric layout -->
						<div class="mb-10 space-y-4">
							<div class="flex items-center gap-4">
								<div 
									class="w-2 h-2 rounded-full"
									style="background-color: {color};"
								></div>
								<span class="text-xl text-[#333333] font-light">{membership.access}</span>
							</div>
							<div class="flex items-center gap-4">
								<div 
									class="w-2 h-2 rounded-full"
									style="background-color: {color};"
								></div>
								<span class="text-xl text-[#333333] font-light">{membership.workshops}</span>
							</div>
							<div class="flex items-center gap-4">
								<div 
									class="w-2 h-2 rounded-full"
									style="background-color: {color};"
								></div>
								<span class="text-xl font-medium" style="color: {color};">{membership.foodDiscount} F&B</span>
							</div>
						</div>

						<!-- Perks List -->
						<div class="mb-10 bg-white/50 p-8 backdrop-blur-sm" style="clip-path: polygon(0 0, 100% 0, 100% 95%, 0 100%);">
							<h4 class="text-lg font-light text-[#333333] mb-6 tracking-wide uppercase opacity-70">What's Included</h4>
							<ul class="space-y-4">
								{#each membership.perks as perk}
									<li class="flex items-start gap-4 text-base">
										<Icon 
											icon="streamline:interface-validation-check-circle-checkmark-addition-circle-check-validation-add"
											width="24"
											height="24"
											style="color: {color};"
											class="flex-shrink-0 mt-0.5"
										/>
										<span class="text-[#333333] font-light">{perk}</span>
									</li>
								{/each}
							</ul>
						</div>

						<!-- CTA -->
						<button
							class="group inline-flex items-center gap-4 px-10 py-5 bg-[#333333] text-white hover:bg-[#dfbc69] hover:text-[#333333] transition-all duration-300 transform hover:translate-x-2"
						>
							<span class="text-lg font-light tracking-wide">Get This Pass</span>
							<svg class="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
							</svg>
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Decorative Transition -->
<div class="h-24 bg-gradient-to-b from-[#F9EDE8] to-white relative overflow-hidden">
	<svg class="absolute bottom-0 w-full h-20 text-white" viewBox="0 0 1200 120" preserveAspectRatio="none">
		<path d="M0,0 L600,60 L1200,0 L1200,120 L0,120 Z" fill="currentColor" class="opacity-80"></path>
	</svg>
</div>

<!-- Pay-As-You-Go Section -->
<section class="py-24 px-4 bg-white relative">
	<div class="max-w-6xl mx-auto">
		<div class="text-center mb-20">
			<h2 class="text-5xl md:text-6xl font-light mb-4 text-[#333333] tracking-tight">Drop-In & Play</h2>
			<p class="text-xl text-[#333333] opacity-70 font-light">Perfect for a quick visit or trying us out</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
			{#each PAY_AS_YOU_GO as option, index}
				{@const colors = ['#dfbc69', '#A8C3A0', '#E07A5F']}
				{@const color = colors[index]}
				
				<div class="relative group">
					<!-- Geometric background -->
					<div 
						class="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
						style="
							background: linear-gradient(135deg, {color}11 0%, {color}22 100%);
							clip-path: polygon(0 10%, 100% 0, 100% 90%, 0 100%);
						"
					></div>
					
					<div class="relative p-8">
						<!-- Price circle -->
						<div 
							class="w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center"
							style="background-color: {color}22;"
						>
							<div 
								class="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center"
							>
								<span class="text-3xl font-light" style="color: {color};">{option.price}</span>
							</div>
						</div>

						<h3 class="text-3xl font-light text-[#333333] mb-2 text-center">{option.name}</h3>
						<p class="text-sm text-[#333333] opacity-60 mb-8 text-center font-light">{option.duration}</p>

						<!-- Includes -->
						<ul class="space-y-3 mb-8">
							{#each option.includes as include}
								<li class="flex items-start gap-3 text-sm">
									<div 
										class="w-1.5 h-1.5 rounded-full mt-2"
										style="background-color: {color};"
									></div>
									<span class="text-[#333333] font-light flex-1">{include}</span>
								</li>
							{/each}
						</ul>

						{#if option.extras}
							<p class="text-xs font-medium mb-6 text-center" style="color: {color};">{option.extras}</p>
						{/if}

						<!-- CTA -->
						<button
							class="w-full py-3 text-sm font-light tracking-wide transition-all duration-300"
							style="
								background-color: {color}; 
								color: white;
								clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
							"
						>
							Let's Play
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Notes Section -->
<section class="py-20 px-4 bg-[#F9EDE8] relative overflow-hidden">
	
	<div class="max-w-5xl mx-auto relative">
		<div class="bg-white/60 backdrop-blur-sm p-12" style="clip-path: polygon(0 5%, 100% 0, 100% 100%, 0 95%);">
			<div class="max-w-4xl mx-auto">
				<h3 class="text-3xl font-light mb-10 text-[#333333] flex items-center gap-4">
					<Icon 
						icon="streamline:interface-content-book-open-reading-book-open-reading-books"
						width="40"
						height="40"
						class="text-[#A8C3A0]"
					/>
					Good to Know
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-[#333333]">
					<div class="flex items-start gap-4">
						<Icon 
							icon="streamline:interface-validation-check-circle-checkmark-addition-circle-check-validation-add"
							width="24"
							height="24"
							class="text-[#dfbc69] flex-shrink-0 mt-1"
						/>
						<div class="font-light">
							<strong class="font-medium">Workshops:</strong> Included workshops refer to selected kids sessions in our weekly schedule. Special events may be excluded.
						</div>
					</div>
					<div class="flex items-start gap-4">
						<Icon 
							icon="streamline:interface-validation-check-circle-checkmark-addition-circle-check-validation-add"
							width="24"
							height="24"
							class="text-[#dfbc69] flex-shrink-0 mt-1"
						/>
						<div class="font-light">
							<strong class="font-medium">Socks required:</strong> All children and adults must wear socks in play areas.
						</div>
					</div>
					<div class="flex items-start gap-4">
						<Icon 
							icon="streamline:interface-validation-check-circle-checkmark-addition-circle-check-validation-add"
							width="24"
							height="24"
							class="text-[#dfbc69] flex-shrink-0 mt-1"
						/>
						<div class="font-light">
							<strong class="font-medium">Re-entry:</strong> Same-day re-entry allowed with wristband or QR verification.
						</div>
					</div>
					<div class="flex items-start gap-4">
						<Icon 
							icon="streamline:interface-validation-check-circle-checkmark-addition-circle-check-validation-add"
							width="24"
							height="24"
							class="text-[#dfbc69] flex-shrink-0 mt-1"
						/>
						<div class="font-light">
							<strong class="font-medium">Capacity limits:</strong> During busy times, we may limit new entries to ensure comfort and safety.
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="py-24 px-4 bg-white text-center relative overflow-hidden">
	<div class="max-w-3xl mx-auto relative">
		<h2 class="text-5xl md:text-6xl font-light mb-6 text-[#333333] tracking-tight">Ready to Join Us?</h2>
		<p class="text-xl text-[#333333] opacity-70 font-light mb-12 leading-relaxed">
			Come visit us or reach out with any questions. We can't wait to welcome your family!
		</p>
		<div class="flex flex-col sm:flex-row gap-6 justify-center">
			<a
				href="/contact"
				class="group inline-flex items-center justify-center gap-4 px-10 py-5 bg-[#333333] text-white hover:bg-[#dfbc69] hover:text-[#333333] transition-all duration-300"
			>
				<span class="text-lg font-light tracking-wide">Contact Us</span>
				<Icon 
					icon="streamline:interface-edit-mail-send-email-paper-airplane-send-email-paper-airplane-message"
					width="20"
					height="20"
					class="transition-transform duration-300 group-hover:translate-x-1"
				/>
			</a>
			<a
				href="/open-play"
				class="group inline-flex items-center justify-center gap-4 px-10 py-5 border-2 border-[#333333] text-[#333333] hover:bg-[#333333] hover:text-white transition-all duration-300"
			>
				<span class="text-lg font-light tracking-wide">Learn About Open Play</span>
				<Icon 
					icon="streamline:interface-arrows-right-arrow-right-keyboard"
					width="20"
					height="20"
					class="transition-transform duration-300 group-hover:translate-x-1"
				/>
			</a>
		</div>
	</div>
</section>

