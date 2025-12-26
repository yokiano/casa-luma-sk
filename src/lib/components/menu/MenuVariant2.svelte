<script lang="ts">
    import type { MenuSummary, MenuModifierOption } from '$lib/types/menu';
    
    let { 
        menu, 
        getVisibleModifiers 
    }: { 
        menu: MenuSummary;
        getVisibleModifiers?: (itemId: string) => MenuModifierOption[];
    } = $props();

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

<div class="font-sans text-slate-900 w-full h-full print:[print-color-adjust:exact] print:[color-adjust:exact] print:text-[13px]">
    <header class="mb-12 border-b-4 border-slate-900 pb-4 print:mb-8 print:border-b-[3px]">
        <h2 class="text-6xl font-bold tracking-tighter text-slate-900 print:text-5xl">MENU</h2>
    </header>

    <div class="space-y-16 print:space-y-12">
        {#each grandCategories as grand, grandIndex}
            <section class={grandIndex === 0 ? '' : 'print:break-inside-avoid-page'}>
                <header class="mb-10 mt-0 print:mb-8">
                    <h3 class="text-4xl font-black text-slate-900 uppercase tracking-tight print:text-3xl">{grand.name}</h3>
                    <div class="mt-3 border-b-[3px] border-slate-900 w-full print:mt-2"></div>
                    <div class="mt-2 border-b border-slate-200 w-full print:mt-1"></div>
                </header>

                <div class="columns-1 md:columns-2 gap-12 print:columns-2 print:gap-12">
                    {#each grand.sections as section, sectionIndex}
                        <div class="mb-12 print:mb-10 {grandIndex === 0 ? '' : 'break-inside-avoid'}">
                            <h4 class="text-2xl font-bold mb-6 text-slate-900 uppercase border-b border-slate-200 pb-2 print:text-xl print:mb-4 print:pb-1">{section.name}</h4>
                            
                            {#if section.intro}
                                <p class="text-slate-500 mb-6 italic print:mb-4 print:text-[12px] leading-relaxed">{section.intro}</p>
                            {/if}

                            <div class="space-y-4">
                                {#each section.items as item}
                                    <div class="break-inside-avoid">
                                        <div class="flex justify-between items-start mb-0.5">
                                            <h5 class="text-lg font-normal uppercase text-slate-900 leading-tight tracking-tight">{item.name}</h5>
                                            <div class="font-bold text-xl text-slate-900 print:text-[15px]">
                                                {item.price.toLocaleString()}
                                            </div>
                                        </div>
                                        {#if item.description}
                                            <p class="text-slate-600 text-sm leading-snug mb-1 print:text-[11px] print:leading-normal">
                                                {item.description}
                                            </p>
                                        {/if}
                                        {#if getVisibleModifiers}
                                            {@const visibleOptions = getVisibleModifiers(item.id)}
                                            {#if visibleOptions.length > 0}
                                                <div class="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-600 italic leading-snug ">
                                                    {#each visibleOptions as option}
                                                        <span class=" after:content-['•'] after:ml-2 after:text-slate-600 last:after:hidden">
                                                        {option.name}{option.price > 0 ? ` (+${option.price})` : ''}
                                                        </span>
                                                    {/each}
                                                </div>
                                            {/if}
                                        {/if}
                                         <!-- {#if item.dietaryTags.length > 0}
                                            <div class="flex gap-2 mt-1">
                                                {#each item.dietaryTags as tag}
                                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-200 px-1 rounded-sm print:text-[8px] print:px-1">{tag}</span>
                                                {/each}
                                            </div>
                                        {/if} -->
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        {/each}
    </div>
</div>

<style>
    @media print {
        @page {
            margin: 1.5cm;
            size: A4;
        }
        :global(body) {
            margin: 0;
            padding: 0;
        }
    }
</style>
