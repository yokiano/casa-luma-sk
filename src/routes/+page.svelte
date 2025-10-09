<script lang="ts">
	import LogoImage from '$lib/assets/logo/logo-no-sun-transparent.png';
</script>

<!-- Hero Section -->
<section class="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#F9EDE8] via-[#FFF5F0] to-[#F9EDE8] px-6 py-20 relative overflow-hidden">
	<!-- Decorative background elements -->
	<div class="absolute inset-0 opacity-5">
		<div class="absolute top-20 left-20 w-64 h-64 bg-[#dfbc69] rounded-full blur-3xl"></div>
		<div class="absolute bottom-20 right-20 w-96 h-96 bg-[#dfbc69] rounded-full blur-3xl"></div>
	</div>
	
	<div class="max-w-5xl w-full relative z-10">
		<div class="text-center mb-16">
			<img 
				src={LogoImage} 
				alt="Casa Luma Logo" 
				class="mx-auto w-48 h-48 object-contain mb-8" 
				draggable="false" 
				style="filter: grayscale(0.1) brightness(0.95);" 
			/>
			
			<h1 class="text-6xl md:text-7xl font-extralight text-[#1a1a1a] mb-6 tracking-tight leading-tight">
				Redefining <span class="font-light text-[#dfbc69]">Educational</span> Spaces
			</h1>
			
			<p class="text-2xl md:text-3xl text-[#333333] font-light mb-12 leading-relaxed max-w-3xl mx-auto">
				Where family connections, emerging technologies, and conscious living converge to create the future of learning
			</p>
			
			<div class="flex justify-center gap-3 mb-16">
				<div class="h-1 w-16 bg-[#dfbc69]"></div>
				<div class="h-1 w-16 bg-[#dfbc69] opacity-60"></div>
				<div class="h-1 w-16 bg-[#dfbc69] opacity-30"></div>
			</div>
		</div>

		<!-- Three Pillars -->
		<div class="grid md:grid-cols-3 gap-8 mb-20">
			<div class="group">
				<div class="bg-white/60 backdrop-blur-sm p-8 h-full transition-all duration-300 hover:bg-white/80 hover:shadow-lg border-l-4 border-[#dfbc69]/0 hover:border-[#dfbc69]">
					<div class="text-5xl mb-4 text-[#dfbc69] font-light">01</div>
					<h3 class="text-2xl font-light text-[#1a1a1a] mb-4">Family-Centered</h3>
					<p class="text-[#333333] leading-relaxed font-light">
						Strengthening bonds through shared experiences, intergenerational learning, and community-building that honors the family unit as the foundation of growth.
					</p>
				</div>
			</div>

			<div class="group">
				<div class="bg-white/60 backdrop-blur-sm p-8 h-full transition-all duration-300 hover:bg-white/80 hover:shadow-lg border-l-4 border-[#dfbc69]/0 hover:border-[#dfbc69]">
					<div class="text-5xl mb-4 text-[#dfbc69] font-light">02</div>
					<h3 class="text-2xl font-light text-[#1a1a1a] mb-4">Tech-Enhanced</h3>
					<p class="text-[#333333] leading-relaxed font-light">
						Thoughtfully integrating emerging technologies to amplify human connection, creativity, and learning—without losing touch with what makes us human.
					</p>
				</div>
			</div>

			<div class="group">
				<div class="bg-white/60 backdrop-blur-sm p-8 h-full transition-all duration-300 hover:bg-white/80 hover:shadow-lg border-l-4 border-[#dfbc69]/0 hover:border-[#dfbc69]">
					<div class="text-5xl mb-4 text-[#dfbc69] font-light">03</div>
					<h3 class="text-2xl font-light text-[#1a1a1a] mb-4">Conscious Living</h3>
					<p class="text-[#333333] leading-relaxed font-light">
						Cultivating mindful practices, sustainable choices, and holistic development that prepare children and families for a meaningful, intentional life.
					</p>
				</div>
			</div>
		</div>

		<!-- Mission Statement -->
		<div class="max-w-3xl mx-auto text-center">
			<blockquote class="text-xl md:text-2xl text-[#1a1a1a] font-light leading-relaxed italic mb-16 border-l-4 border-[#dfbc69] pl-6">
				"We're building more than an educational facility—we're creating a living laboratory where families explore new ways of learning, connecting, and thriving in an evolving world."
			</blockquote>
		</div>

		<!-- Vision Highlight -->
		<div class="bg-gradient-to-r from-[#dfbc69]/10 via-[#dfbc69]/5 to-[#dfbc69]/10 p-12 text-center">
			<h2 class="text-3xl font-light text-[#1a1a1a] mb-6">Our Vision</h2>
			<p class="text-lg text-[#333333] font-light leading-relaxed max-w-3xl mx-auto mb-8">
				Casa Luma pioneers a new paradigm in education—one that embraces innovation while staying rooted in timeless values. We're creating spaces where technology serves humanity, where learning is experiential and joyful, and where families grow together in conscious community.
			</p>
			<div class="flex flex-wrap justify-center gap-4 text-sm font-light text-[#333333]">
				<span class="px-4 py-2 bg-white/70 backdrop-blur-sm">Montessori-Inspired</span>
				<span class="px-4 py-2 bg-white/70 backdrop-blur-sm">Innovation Lab</span>
				<span class="px-4 py-2 bg-white/70 backdrop-blur-sm">Community Hub</span>
				<span class="px-4 py-2 bg-white/70 backdrop-blur-sm">Sustainable Design</span>
				<span class="px-4 py-2 bg-white/70 backdrop-blur-sm">Holistic Learning</span>
			</div>
		</div>
	</div>
</section>
