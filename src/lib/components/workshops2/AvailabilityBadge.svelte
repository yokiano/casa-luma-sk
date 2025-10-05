<script lang="ts">
	import type { RegistrationStatus } from '$lib/types/workshops';

	interface Props {
		availableSpots: number;
		capacity: number;
		registrationStatus: RegistrationStatus;
	}

	let { availableSpots, capacity, registrationStatus }: Props = $props();

	const statusConfig = $derived(() => {
		if (registrationStatus === 'Closed') {
			return { 
				label: 'Closed', 
				color: '#333333',
				bg: '#333333'
			};
		}
		if (registrationStatus === 'Waitlist') {
			return { 
				label: 'Join Waitlist', 
				color: '#E07A5F',
				bg: '#E07A5F'
			};
		}
		if (availableSpots === 0) {
			return { 
				label: 'Fully Booked', 
				color: '#E07A5F',
				bg: '#E07A5F'
			};
		}
		if (availableSpots <= 3) {
			return { 
				label: `${availableSpots} spots left`, 
				color: '#dfbc69',
				bg: '#dfbc69'
			};
		}
		return { 
			label: 'Spots Available', 
			color: '#A8C3A0',
			bg: '#A8C3A0'
		};
	});

	const config = $derived(statusConfig());
</script>

<!-- Bold geometric badge - no boring border-radius -->
<div 
	class="relative px-6 py-3 text-center font-bold text-white"
	style="background-color: {config.bg};"
>
	<!-- Triangle corner accent -->
	<div 
		class="absolute -right-1 -top-1 h-4 w-4"
		style="background-color: {config.bg}; clip-path: polygon(100% 0, 0 0, 100% 100%); filter: brightness(1.3);"
	></div>
	
	<div class="text-xs uppercase tracking-wider">
		{config.label}
	</div>
</div>

