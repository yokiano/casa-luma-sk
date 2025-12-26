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

<div class="font-serif text-stone-900 w-full h-full">
    <header class="text-center mb-16">
        <h2 class="text-4xl tracking-widest uppercase font-light text-stone-800 mb-2">Casa Luma</h2>
        <div class="w-16 h-px bg-stone-300 mx-auto"></div>
    </header>

    {#each grandCategories as grand, grandIndex}
        <section class="mb-14">
            <div class={grandIndex === 0 ? 'mb-10 mt-6 text-center' : 'mb-10 mt-14 text-center'}>
                <h3 class="text-3xl font-light uppercase tracking-[0.22em] text-stone-800">
                    {grand.name}
                </h3>
                <div class="mt-4 flex items-center justify-center gap-4">
                    <div class="h-px w-16 bg-stone-300"></div>
                    <div class="h-px w-40 bg-stone-500"></div>
                    <div class="h-px w-16 bg-stone-300"></div>
                </div>
            </div>

            {#each grand.sections as section}
                <div class="mb-12 break-inside-avoid">
                    <h4 class="text-xl font-light uppercase tracking-widest text-center mb-6 text-stone-600">
                        {section.name}
                    </h4>
                    
                    {#if section.intro}
                        <p class="text-center text-stone-500 italic mb-8 text-sm max-w-md mx-auto">{section.intro}</p>
                    {/if}

                    <div class="space-y-5">
                        {#each section.items as item}
                            <div class="group">
                                <div class="flex justify-between items-baseline w-full">
                                    <h5 class="text-lg font-medium text-stone-800">{item.name}</h5>
                                    <div class="flex-grow border-b border-dotted border-stone-300 mx-2 relative top-[-4px]"></div>
                                    <div class="text-lg text-stone-700 whitespace-nowrap font-variant-numeric oldstyle-nums">
                                        {item.price.toLocaleString()}
                                    </div>
                                </div>
                                <div class="flex justify-between items-start mt-1">
                                     <div class="max-w-[85%]">
                                        {#if item.description}
                                            <p class="text-stone-500 text-sm leading-relaxed">
                                                {item.description}
                                            </p>
                                        {/if}
                                        {#if getVisibleModifiers}
                                            {@const visibleOptions = getVisibleModifiers(item.id)}
                                            {#if visibleOptions.length > 0}
                                                <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-stone-500 italic leading-relaxed">
                                                    {#each visibleOptions as option}
                                                        <span class="whitespace-nowrap after:content-['•'] after:ml-3 after:text-stone-300 last:after:hidden">
                                                            + {option.name}{option.price > 0 ? ` (+${option.price})` : ''}
                                                        </span>
                                                    {/each}
                                                </div>
                                            {/if}
                                        {/if}
                                        {#if item.dietaryTags.length > 0}
                                            <div class="text-xs text-stone-400 mt-0.5 lowercase italic">
                                                {item.dietaryTags.join(', ')}
                                            </div>
                                        {/if}
                                     </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </section>
    {/each}
</div>
