<script lang="ts">
    import { CATEGORIES } from '../data';
    import { ChevronLeft, ChevronRight } from 'lucide-svelte';

    let { activeCategory = $bindable() }: { activeCategory: string } = $props();

    let scrollContainer = $state<HTMLDivElement>();

    function scroll(direction: 'left' | 'right') {
        if (!scrollContainer) return;
        // Flipped for RTL:
        // left: -200 -> scrolls towards the right (Start)
        // left: 200 -> scrolls towards the left (End)
        scrollContainer.scrollBy({
            left: direction === 'left' ? -200 : 200,
            behavior: 'smooth'
        });
    }
</script>

<div class="flex items-center gap-1">
    <button 
        onclick={() => scroll('right')}
        class="shrink-0 p-1 text-gray-400 hover:text-[#00A890] transition-colors"
        title="גלול ימינה"
    >
        <ChevronRight class="w-4 h-4" />
    </button>

    <div 
        bind:this={scrollContainer}
        class="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-1 px-1"
    >
        {#each CATEGORIES as cat}
            <button
                class="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border relative whitespace-nowrap {activeCategory === cat.id 
                    ? 'bg-[#00A890] text-white border-[#00A890] shadow-sm' 
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#00A890]/50 hover:text-[#00A890]'}
                "
                onclick={() => activeCategory = cat.id}
            >
                {cat.label}
            </button>
        {/each}
    </div>

    <button 
        onclick={() => scroll('left')}
        class="shrink-0 p-1 text-gray-400 hover:text-[#00A890] transition-colors"
        title="גלול שמאלה"
    >
        <ChevronLeft class="w-4 h-4" />
    </button>
</div>

<style>
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
