<script lang="ts">
	import type { MenuModifierOption, MenuModifier } from '$lib/types/menu';
	import { cleanName } from '$lib/utils';

	let { 
		options, 
		className = '',
		groupedModifiers,
		getModifierDescription
	}: { 
		options?: MenuModifierOption[]; 
		className?: string;
		groupedModifiers?: Array<{ modifier: MenuModifier; options: MenuModifierOption[] }>;
		getModifierDescription?: (modifierId: string) => string;
	} = $props();
</script>

{#if groupedModifiers && groupedModifiers.length > 0}
	<div class="space-y-2">
		{#each groupedModifiers as { modifier, options: modifierOptions }}
			<div>
				{#if getModifierDescription}
					{@const desc = getModifierDescription(modifier.id)}
					{#if desc}
						<div class="text-sm font-bold text-slate-900 mb-1 {className}">{cleanName(desc)}</div>
					{/if}
				{/if}
				<div class="flex flex-wrap gap-x-3 gap-y-0.5 text-sm italic leading-relaxed {className}">
					{#each modifierOptions as option}
						<span class="whitespace-nowrap after:ml-3 after:content-['•'] after:opacity-50 last:after:hidden">
							+ {cleanName(option.name)}{option.price > 0 ? ` (+${option.price})` : ''}
						</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{:else if options && options.length > 0}
	<div class="flex flex-wrap gap-x-3 gap-y-0.5 text-sm italic leading-relaxed {className}">
		{#each options as option}
			<span class="whitespace-nowrap after:ml-3 after:content-['•'] after:opacity-50 last:after:hidden">
				+ {cleanName(option.name)}{option.price > 0 ? ` (+${option.price})` : ''}
			</span>
		{/each}
	</div>
{/if}

