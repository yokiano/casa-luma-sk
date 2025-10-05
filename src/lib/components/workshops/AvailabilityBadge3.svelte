<script lang="ts">
	import type { RegistrationStatus } from '$lib/types/workshops';
	import Icon from '@iconify/svelte';

	interface Props {
		availableSpots: number | null;
		capacity: number | null;
		registrationStatus: RegistrationStatus;
	}

	let { availableSpots, capacity, registrationStatus }: Props = $props();

	const spotsText = $derived(() => {
		if (registrationStatus === 'Closed') return 'Registration Closed';
		if (registrationStatus === 'Waitlist') return 'Join Waitlist';
		if (availableSpots === null || capacity === null) return 'Open Registration';
		if (availableSpots === 0) return 'Fully Booked';
		if (availableSpots <= 3) return `Only ${availableSpots} spots left`;
		return `${availableSpots} spots available`;
	});

	const isLimited = $derived(availableSpots !== null && availableSpots > 0 && availableSpots <= 3);
	const isFull = $derived(availableSpots === 0 || registrationStatus === 'Closed');
</script>

<div class="relative inline-block">
	{#if isFull}
		<!-- Fully Booked - Crossed out style -->
		<div class="relative">
			<span class="text-lg font-light text-[#333333] opacity-50">
				{spotsText()}
			</span>
			<div class="absolute inset-0 flex items-center">
				<div class="w-full h-0.5 bg-[#333333] opacity-30 transform rotate-12"></div>
			</div>
		</div>
	{:else if isLimited}
		<!-- Limited Spots - Pulsing dot -->
		<div class="flex items-center gap-3">
			<div class="relative">
				<div class="absolute inset-0 bg-[#E07A5F] rounded-full animate-ping opacity-75"></div>
				<div class="relative w-3 h-3 bg-[#E07A5F] rounded-full"></div>
			</div>
			<span class="text-lg font-medium text-[#E07A5F]">
				{spotsText()}
			</span>
		</div>
	{:else if registrationStatus === 'Waitlist'}
		<!-- Waitlist - Soft style -->
		<div class="flex items-center gap-3">
			<Icon 
				icon="streamline:time-clock-circle-1" 
				width="32" 
				height="32"
				class="text-[#A8C3A0] opacity-70"
			/>
			<span class="text-lg font-light text-[#A8C3A0] italic">
				{spotsText()}
			</span>
		</div>
	{:else}
		<!-- Available - Clean style -->
		<div class="flex items-center gap-3">
			<div class="w-2 h-2 bg-[#A8C3A0] transform rotate-45"></div>
			<span class="text-lg font-light text-[#333333]">
				{spotsText()}
			</span>
		</div>
	{/if}
	
	{#if capacity && availableSpots !== null && !isFull}
		<!-- Visual capacity indicator -->
		<div class="mt-2 h-1 bg-[#F9EDE8] overflow-hidden" style="width: 120px;">
			<div 
				class="h-full bg-gradient-to-r from-[#A8C3A0] to-[#dfbc69] transition-all duration-500"
				style="width: {((capacity - availableSpots) / capacity) * 100}%"
			></div>
		</div>
	{/if}
</div>
