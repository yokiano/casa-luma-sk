<script lang="ts">
	import InstructionBlockRenderer from './InstructionBlock.svelte';

	type InstructionBlock = {
		id: string;
		type: string;
		text?: string;
		level?: 1 | 2 | 3;
		checked?: boolean;
		imageUrl?: string;
		children?: InstructionBlock[];
	};

	let { block }: { block: InstructionBlock } = $props();
</script>

{#if block.type === 'image' && block.imageUrl}
	<figure class="overflow-hidden rounded-2xl border border-[#e4d8cc] bg-white shadow-sm">
		<img src={block.imageUrl} alt={block.text ?? 'Recipe instruction image'} class="max-h-[420px] w-full object-cover" />
		{#if block.text}
			<figcaption class="px-4 py-3 text-sm text-[#7a6550]">{block.text}</figcaption>
		{/if}
	</figure>
{:else if block.level}
	<svelte:element
		this={block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4'}
		class={block.level === 1
			? 'mt-8 text-2xl font-semibold text-[#2c2925]'
			: block.level === 2
				? 'mt-6 text-xl font-semibold text-[#2c2925]'
				: 'mt-5 text-lg font-semibold text-[#2c2925]'}
	>
		{block.text}
	</svelte:element>
{:else if block.type === 'bulleted_list_item'}
	<li class="ml-5 list-disc pl-1 text-[#3f352d]">{block.text}</li>
{:else if block.type === 'numbered_list_item'}
	<li class="ml-5 list-decimal pl-1 text-[#3f352d]">{block.text}</li>
{:else if block.type === 'to_do'}
	<div class="flex gap-3 rounded-2xl bg-white/70 px-4 py-3 text-[#3f352d]">
		<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#c9b8a7] text-xs">
			{block.checked ? '✓' : ''}
		</span>
		<span>{block.text}</span>
	</div>
{:else if block.type === 'callout'}
	<div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
		{block.text}
	</div>
{:else if block.type === 'quote'}
	<blockquote class="border-l-4 border-[#c9b8a7] pl-4 italic text-[#5c4a3d]">{block.text}</blockquote>
{:else if block.text}
	<p class="whitespace-pre-wrap leading-7 text-[#3f352d]">{block.text}</p>
{/if}

{#if block.children?.length}
	<div class="ml-4 mt-2 space-y-2 border-l border-[#e4d8cc] pl-4">
		{#each block.children as child (child.id)}
			<InstructionBlockRenderer block={child} />
		{/each}
	</div>
{/if}
