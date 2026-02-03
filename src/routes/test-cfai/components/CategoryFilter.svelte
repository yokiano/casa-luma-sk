<script lang="ts">
    import { CATEGORIES } from '../data';

    let { activeCategory = $bindable() }: { activeCategory: string } = $props();
</script>

<div class="flex flex-wrap gap-3 py-4">
    {#each CATEGORIES as cat, i}
        <button
            class="px-6 py-2.5 rounded-full text-sm font-medium transition-all border-2 relative {activeCategory === cat.id 
                ? 'bg-[#00A890] text-white border-[#00A890] shadow-md shadow-[#00A890]/20' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#00A890]/50 hover:text-[#00A890]'}"
            onclick={() => activeCategory = cat.id}
        >
            {#if i === 0 && activeCategory !== cat.id}
                <span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ee9129]"></span>
            {/if}
            {cat.label}
        </button>
    {/each}
</div>
