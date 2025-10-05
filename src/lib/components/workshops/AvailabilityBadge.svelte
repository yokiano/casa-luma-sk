<script lang="ts">
	import type { RegistrationStatus } from '$lib/types/workshops';

	interface Props {
		availableSpots: number;
		capacity: number;
		registrationStatus: RegistrationStatus;
	}

	let { availableSpots, capacity, registrationStatus }: Props = $props();

	const percentFull = $derived((1 - availableSpots / capacity) * 100);

	const badgeClass = $derived.by(() => {
		if (registrationStatus === 'Closed') return 'bg-gray-500 text-white';
		if (registrationStatus === 'Waitlist') return 'bg-orange-500 text-white';
		if (availableSpots === 0) return 'bg-red-500 text-white';
		if (percentFull >= 80) return 'bg-yellow-500 text-black';
		return 'bg-green-500 text-white';
	});

	const badgeText = $derived.by(() => {
		if (registrationStatus === 'Closed') return 'Registration Closed';
		if (registrationStatus === 'Waitlist') return 'Waitlist Only';
		if (availableSpots === 0) return 'Sold Out';
		if (availableSpots === 1) return '1 spot left';
		if (availableSpots <= 5) return `Only ${availableSpots} spots left`;
		return `${availableSpots} spots available`;
	});
</script>

<span
	class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold {badgeClass}"
>
	<span class="h-2 w-2 rounded-full bg-white/80"></span>
	{badgeText}
</span>

