<script lang="ts">
    import type { MenuSummary, MenuModifierOption } from '$lib/types/menu';
    import MenuModifiersList from './MenuModifiersList.svelte';
    import MenuItemIcons from './MenuItemIcons.svelte';
    
    let { 
        menu, 
        getVisibleModifiers,
        isItemVisible
    }: { 
        menu: MenuSummary;
        getVisibleModifiers?: (itemId: string) => MenuModifierOption[];
        isItemVisible?: (itemId: string) => boolean;
    } = $props();

    const grandCategories = $derived(
        menu.grandCategories
            .map((grand) => ({
                ...grand,
                sections: grand.sections
                    .map((section) => ({
                        ...section,
                        items: !isItemVisible ? section.items : section.items.filter((item) => isItemVisible(item.id))
                    }))
                    .filter((section) => section.items.length > 0)
            }))
            .filter((grand) => grand.sections.length > 0)
    );

    const hasAnyBadges = $derived.by(() => {
        for (const grand of grandCategories) {
            for (const section of grand.sections) {
                for (const item of section.items) {
                    if (item.recommended) return true;
                    if (item.dietaryTags?.includes('Vegan')) return true;
                    if (item.dietaryTags?.includes('Vegan Option')) return true;
                }
            }
        }
        return false;
    });
</script>

<div class="menu-root font-serif text-stone-900 w-full h-full">
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

                    {#if getVisibleModifiers}
                        <div class="mb-8 flex justify-center">
                            <MenuModifiersList 
                                options={getVisibleModifiers(section.id)} 
                                className="text-stone-500 justify-center" 
                            />
                        </div>
                    {/if}

                    <div class="space-y-5">
                        {#each section.items as item}
                            <div class="group">
                                <div class="flex justify-between items-baseline w-full">
                                    <h5 class="text-lg font-medium text-stone-800">
                                        <span class="inline-flex flex-wrap items-center gap-1">
                                            <span>{item.name}</span>
                                            <span class="inline-flex items-center gap-1 pl-0.5">
                                                {#if item.recommended}
                                                    <MenuItemIcons kind="recommended" class="h-4 w-4 text-stone-700" title="Recommended" />
                                                {/if}
                                                {#if item.dietaryTags?.includes('Vegan')}
                                                    <MenuItemIcons kind="vegan" class="h-4 w-4 text-emerald-700" title="Vegan" />
                                                {/if}
                                                {#if item.dietaryTags?.includes('Vegan Option')}
                                                    <MenuItemIcons kind="vegan-option" class="h-4 w-4 text-emerald-700" title="Vegan option" />
                                                {/if}
                                            </span>
                                        </span>
                                    </h5>
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
                                            <div class="mt-1">
                                                <MenuModifiersList 
                                                    options={getVisibleModifiers(item.id)} 
                                                    className="text-stone-500" 
                                                />
                                            </div>
                                        {/if}
                                        <!-- keep the old textual dietary line off; icons + legend replace it -->
                                     </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </section>
    {/each}

    {#if hasAnyBadges}
        <footer class="menu-legend mt-10 border-t border-stone-200 pt-3 text-[11px] text-stone-600 print:mt-0 print:border-stone-300">
            <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div class="inline-flex items-center gap-2">
                    <MenuItemIcons kind="recommended" class="h-4 w-4 text-stone-700" />
                    <span class="uppercase tracking-wide">Recommended</span>
                </div>
                <div class="inline-flex items-center gap-2">
                    <MenuItemIcons kind="vegan" class="h-4 w-4 text-emerald-700" />
                    <span class="uppercase tracking-wide">Vegan</span>
                </div>
                <div class="inline-flex items-center gap-2">
                    <MenuItemIcons kind="vegan-option" class="h-4 w-4 text-emerald-700" />
                    <span class="uppercase tracking-wide">Vegan option</span>
                </div>
            </div>
        </footer>
    {/if}
</div>

<style>
    @media print {
        .menu-root {
            padding-bottom: 1.2cm;
        }

        .menu-legend {
            position: fixed;
            left: 1.5cm;
            right: 1.5cm;
            bottom: 1.1cm;
            background: white;
            padding-top: 0.25cm;
        }
    }
</style>
