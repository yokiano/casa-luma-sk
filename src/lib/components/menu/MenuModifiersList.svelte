<script lang="ts">
	import type { MenuModifierOption } from '$lib/types/menu';

	let { options, className = '' }: { options: MenuModifierOption[]; className?: string } = $props();
</script>

{#if options.length > 0}
	<div class="flex flex-wrap gap-x-3 gap-y-0.5 text-sm italic leading-relaxed {className}">
		{#each options as option}
			<span class="whitespace-nowrap after:ml-3 after:content-['•'] after:opacity-50 last:after:hidden">
				+ {option.name}{option.price > 0 ? ` (+${option.price})` : ''}
			</span>
		{/each}
	</div>
{/if}

