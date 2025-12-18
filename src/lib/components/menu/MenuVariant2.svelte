<script lang="ts">
    import type { MenuSummary } from '$lib/types/menu';
    
    let { menu }: { menu: MenuSummary } = $props();
</script>

<div class="font-sans text-slate-900 w-full h-full">
    <header class="mb-16 border-b-4 border-slate-900 pb-4">
        <h2 class="text-6xl font-bold tracking-tighter text-slate-900">MENU</h2>
    </header>

    <div class="columns-1 md:columns-2 gap-12">
        {#each menu.sections as section}
            <div class="mb-12 break-inside-avoid">
                <h3 class="text-2xl font-bold mb-6 text-slate-900 uppercase border-b border-slate-200 pb-2">{section.name}</h3>
                
                {#if section.intro}
                    <p class="text-slate-500 mb-6 italic">{section.intro}</p>
                {/if}

                <div class="space-y-8">
                    {#each section.items as item}
                        <div class="break-inside-avoid">
                            <div class="flex justify-between items-start mb-1">
                                <h4 class="text-lg font-bold text-slate-800 uppercase tracking-wide leading-none">{item.name}</h4>
                                <div class="font-bold text-lg text-slate-900">
                                    {item.price.toLocaleString()}
                                </div>
                            </div>
                            {#if item.description}
                                <p class="text-slate-600 text-sm leading-snug mb-1">
                                    {item.description}
                                </p>
                            {/if}
                             {#if item.dietaryTags.length > 0}
                                <div class="flex gap-2">
                                    {#each item.dietaryTags as tag}
                                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-200 px-1 rounded-sm">{tag}</span>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>
