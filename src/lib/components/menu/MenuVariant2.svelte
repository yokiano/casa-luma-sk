<script lang="ts">
    import type { MenuSummary } from '$lib/types/menu';
    
    let { menu }: { menu: MenuSummary } = $props();

    const grandCategories = $derived(
        menu.grandCategories
            .map((grand) => ({
                ...grand,
                sections: grand.sections
                    .filter((section) => section.items.length > 0)
            }))
            .filter((grand) => grand.sections.length > 0)
    );
</script>

<div class="font-sans text-slate-900 w-full h-full">
    <header class="mb-16 border-b-4 border-slate-900 pb-4">
        <h2 class="text-6xl font-bold tracking-tighter text-slate-900">MENU</h2>
    </header>

    {#each grandCategories as grand, grandIndex}
        <section>
            <header class={grandIndex === 0 ? 'mb-10 mt-6' : 'mb-10 mt-14'}>
                <h3 class="text-4xl font-black text-slate-900 uppercase tracking-tight">{grand.name}</h3>
                <div class="mt-3 h-[3px] w-full bg-slate-900"></div>
                <div class="mt-2 h-px w-full bg-slate-200"></div>
            </header>

            <div class="columns-1 md:columns-2 gap-12">
                {#each grand.sections as section}
                    <div class="mb-12 break-inside-avoid">
                        <h4 class="text-2xl font-bold mb-6 text-slate-900 uppercase border-b border-slate-200 pb-2">{section.name}</h4>
                        
                        {#if section.intro}
                            <p class="text-slate-500 mb-6 italic">{section.intro}</p>
                        {/if}

                        <div class="space-y-8">
                            {#each section.items as item}
                                <div class="break-inside-avoid">
                                    <div class="flex justify-between items-start mb-1">
                                        <h5 class="text-xl font-normal uppercase text-slate-900 leading-tight tracking-tight">{item.name}</h5>
                                        <div class="font-bold text-xl text-slate-900">
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
        </section>
    {/each}
</div>
