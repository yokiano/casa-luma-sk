<script lang="ts">
	import type { Event } from '$lib/types/workshops';
	import EventCard3 from './EventCard3.svelte';
	import Icon from '@iconify/svelte';

	interface Props {
		events: Event[];
		emptyMessage?: string;
	}

	let { events, emptyMessage = 'No events found' }: Props = $props();
</script>

{#if events.length === 0}
	<!-- Empty state with organic shape -->
	<div class="relative">
		<div 
			class="relative overflow-hidden p-20 text-center bg-[#A8C3A0] bg-opacity-10"
			style="clip-path: polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%);"
		>
			<!-- Content -->
			<div class="relative">
				<div class="mx-auto mb-6 inline-block">
					<Icon 
						icon="streamline:ecology-leaf" 
						width="96" 
						height="96"
						class="text-[#A8C3A0] opacity-60"
					/>
				</div>
				<p class="text-3xl text-[#333333] font-light mb-3">{emptyMessage}</p>
				<p class="text-xl text-[#333333] opacity-70 font-light italic">New experiences coming soon...</p>
			</div>
		</div>
	</div>
{:else}
	<!-- Alternating layout with bold design -->
	<div class="space-y-24">
		{#each events as event, index (event.id)}
			<EventCard3 {event} isReversed={index % 2 === 1} index={index} />
		{/each}
	</div>
{/if}
