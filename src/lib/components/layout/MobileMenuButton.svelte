<script lang="ts">
	let { open = false, onToggle }: { open?: boolean; onToggle: () => void } = $props();
</script>

<button
	type="button"
	class="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#2D3A3A]/15 text-[#2D3A3A] transition-colors hover:border-[#E07A5F] hover:text-[#E07A5F]"
	aria-label={open ? 'Close menu' : 'Open menu'}
	aria-expanded={open}
	onclick={onToggle}
>
	<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
		{#if open}
			<path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
		{:else}
			<path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
		{/if}
	</svg>
</button>
