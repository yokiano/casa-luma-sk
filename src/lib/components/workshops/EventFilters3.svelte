<script lang="ts">
	import type { EventType } from '$lib/types/workshops';

	type TimeFilter = 'All' | 'Today' | 'Tomorrow' | 'This Week' | 'This Weekend' | 'Next Week' | 'This Month';

	interface Props {
		selectedType?: EventType | 'All';
		selectedTimeFilter?: TimeFilter;
		onTypeChange: (type: EventType | 'All') => void;
		onTimeFilterChange: (filter: TimeFilter) => void;
	}

	let { 
		selectedType = $bindable('All'), 
		selectedTimeFilter = $bindable('All' as TimeFilter),
		onTypeChange,
		onTimeFilterChange 
	}: Props = $props();

	const eventTypes: Array<{ type: EventType | 'All'; icon: string; color: string }> = [
		{ type: 'All', icon: '✨', color: '#333333' },
		{ type: 'Workshop', icon: '🎨', color: '#dfbc69' },
		{ type: 'Retreat', icon: '🌿', color: '#A8C3A0' },
		{ type: 'Yoga Class', icon: '🧘', color: '#E07A5F' },
		{ type: 'Art Session', icon: '🎭', color: '#dfbc69' },
		{ type: 'Other', icon: '🌟', color: '#A8C3A0' }
	];

	const timeFilters: Array<{ filter: TimeFilter; label: string; accent: string }> = [
		{ filter: 'All', label: 'All Time', accent: '#333333' },
		{ filter: 'Today', label: 'Today', accent: '#E07A5F' },
		{ filter: 'Tomorrow', label: 'Tomorrow', accent: '#dfbc69' },
		{ filter: 'This Week', label: 'This Week', accent: '#A8C3A0' },
		{ filter: 'This Weekend', label: 'Weekend', accent: '#E07A5F' },
		{ filter: 'Next Week', label: 'Next Week', accent: '#dfbc69' },
		{ filter: 'This Month', label: 'This Month', accent: '#A8C3A0' }
	];

	function handleTypeClick(type: EventType | 'All') {
		selectedType = type;
		onTypeChange(type);
	}

	function handleTimeFilterClick(filter: TimeFilter) {
		selectedTimeFilter = filter;
		onTimeFilterChange(filter);
	}
</script>

<div class="relative space-y-12">
	<!-- Event Type Filters -->
	<div class="relative">
		<!-- Background shape -->
		<div 
			class="absolute inset-0 bg-white opacity-50 transform -skew-y-2"
			style="border-radius: 0 100px 0 100px;"
		></div>
		
		<div class="relative p-8">
			<h3 class="mb-8 text-center text-2xl font-light text-[#333333] tracking-wide">
				Discover Your Experience
			</h3>
			
			<!-- Creative filter layout -->
			<div class="flex flex-wrap justify-center gap-8 lg:gap-12">
				{#each eventTypes as { type, icon, color }}
					<button
						type="button"
						onclick={() => handleTypeClick(type)}
						class="group relative transition-all duration-300 transform hover:scale-110"
					>
						<!-- Hexagon shape container -->
						<div class="relative">
							{#if selectedType === type}
								<!-- Active state with rotating border -->
								<div 
									class="absolute inset-0 animate-spin-slow"
									style="
										width: 100px;
										height: 100px;
										background: linear-gradient(45deg, {color}22, transparent, {color}22);
										clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
									"
								></div>
							{/if}
							
							<!-- Main hexagon -->
							<div 
								class="relative flex items-center justify-center transition-all duration-300"
								style="
									width: 90px;
									height: 90px;
									background: {selectedType === type ? color : '#F9EDE8'};
									clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
								"
							>
								<span class="text-3xl {selectedType === type ? 'scale-110' : ''} transition-transform duration-300">
									{icon}
								</span>
							</div>
						</div>
						
						<!-- Label -->
						<span 
							class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-sm font-light transition-all duration-300"
							style="color: {selectedType === type ? color : '#333333'};"
						>
							{type}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Time Filters -->
	<div class="relative">
		<!-- Background decorative elements -->
		<div 
			class="absolute inset-0 bg-white opacity-40 transform skew-y-1"
			style="border-radius: 80px 0 80px 0;"
		></div>
		
		<div class="relative px-6 py-8">
			<h4 class="mb-6 text-center text-sm font-light text-[#333333] tracking-wider uppercase">
				When
			</h4>
			
			<!-- Time filter buttons with organic shapes -->
			<div class="flex flex-wrap justify-center gap-3">
				{#each timeFilters as { filter, label, accent }}
					<button
						type="button"
						onclick={() => handleTimeFilterClick(filter)}
						class="relative px-5 py-2.5 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5"
						style="
							background: {selectedTimeFilter === filter ? accent : 'white'};
							color: {selectedTimeFilter === filter ? 'white' : '#333333'};
							border-radius: {selectedTimeFilter === filter ? '30px 5px 30px 5px' : '20px 8px'};
							box-shadow: {selectedTimeFilter === filter 
								? `0 4px 12px ${accent}40` 
								: '0 2px 8px rgba(0,0,0,0.08)'};
						"
					>
						<!-- Active state underline accent -->
						{#if selectedTimeFilter === filter}
							<div 
								class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-0.5 w-3/4 opacity-80"
								style="background: {accent};"
							></div>
						{/if}
						
						<span class="text-sm font-light tracking-wide">
							{label}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes spin-slow {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	
	.animate-spin-slow {
		animation: spin-slow 20s linear infinite;
	}
</style>
