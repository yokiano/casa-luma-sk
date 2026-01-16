<script lang="ts">
    import type { MenuSummary, MenuModifierOption } from '$lib/types/menu';
    import MenuModifiersList from './MenuModifiersList.svelte';
    import { cleanName } from '$lib/utils';
    import MenuItemIcons from './MenuItemIcons.svelte';
    
    import type { MenuModifier } from '$lib/types/menu';
    
    let { 
        menu, 
        getVisibleModifiers,
        getCustomDescription,
        getGroupedModifiers,
        getModifierDescription,
        isGrandCategoryTitleVisible,
        isSectionTitleVisible
    }: { 
        menu: MenuSummary;
        getVisibleModifiers?: (itemId: string) => MenuModifierOption[];
        getCustomDescription?: (id: string) => string;
        getGroupedModifiers?: (itemId: string) => Array<{ modifier: MenuModifier; options: MenuModifierOption[] }>;
        getModifierDescription?: (modifierId: string) => string;
        isGrandCategoryTitleVisible?: (id: string) => boolean;
        isSectionTitleVisible?: (id: string) => boolean;
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

<div class="menu-root font-sans text-slate-900 w-full h-full print:[print-color-adjust:exact] print:[color-adjust:exact] print:text-[13px]">
    <header class="mb-12 border-b-4 border-slate-900 pb-4 print:mb-8 print:border-b-[3px]">
        <h2 class="text-6xl font-bold tracking-tighter text-slate-900 print:text-5xl">MENU</h2>
    </header>

    <div class="space-y-16 print:space-y-12">
        {#each grandCategories as grand, grandIndex}
            <section class={grandIndex === 0 ? '' : 'print:break-inside-avoid-page'}>
                <header class="mb-10 mt-0 print:mb-8">
                    {#if !isGrandCategoryTitleVisible || isGrandCategoryTitleVisible(grand.id)}
                        <h3 class="text-4xl font-black text-slate-900 uppercase tracking-tight print:text-3xl">{cleanName(grand.name)}</h3>
                    {/if}
                    
                    {#if getCustomDescription}
                        {@const customDesc = getCustomDescription(grand.id)}
                        {#if customDesc}
                            <p class="mt-3 text-xs text-slate-500 italic print:mt-2 print:text-[10px] leading-relaxed">{customDesc}</p>
                        {/if}
                    {/if}
                    
                    {#if !isGrandCategoryTitleVisible || isGrandCategoryTitleVisible(grand.id)}
                        <div class="mt-3 border-b-[3px] border-slate-900 w-full print:mt-2"></div>
                        <div class="mt-2 border-b border-slate-200 w-full print:mt-1"></div>
                    {/if}
                </header>

                <div class="columns-1 md:columns-2 gap-12 print:columns-2 print:gap-12">
                    {#each grand.sections as section, sectionIndex}
                        <div class="mb-12 print:mb-10 {grandIndex === 0 ? '' : 'break-inside-avoid'}">
                            {#if !isSectionTitleVisible || isSectionTitleVisible(section.id)}
                                <h4 class="text-2xl font-bold mb-6 text-slate-900 uppercase border-b border-slate-200 pb-2 print:text-xl print:mb-4 print:pb-1">{cleanName(section.name)}</h4>
                            {/if}
                            
                            {#if getCustomDescription}
                                {@const customDesc = getCustomDescription(section.id)}
                                {#if customDesc}
                                    <p class="text-sm text-slate-500 mb-6 italic print:mb-4 print:text-[10px] leading-relaxed">{cleanName(customDesc)}</p>
                                {:else if section.intro}
                                    <p class="text-sm text-slate-500 mb-6 italic print:mb-4 print:text-[10px] leading-relaxed">{cleanName(section.intro)}</p>
                                {/if}
                            {:else if section.intro}
                                <p class="text-sm text-slate-500 mb-6 italic print:mb-4 print:text-[10px] leading-relaxed">{cleanName(section.intro)}</p>
                            {/if}

                            <div class="space-y-2">
                                {#each section.items as item}
                                    <div class="break-inside-avoid">
                                        <div class="flex justify-between items-start mb-0.5">
                                            <h5 class="text-base font-normal uppercase text-slate-900 leading-tight tracking-tight">
                                                <span class="inline-flex flex-wrap items-center gap-1">
                                                    <span>{cleanName(item.name)}</span>
                                                    <span class="inline-flex items-center gap-1 pl-0.5">
                                                        {#if item.recommended}
                                                            <MenuItemIcons kind="recommended" class="h-4 w-4 text-slate-700" title="Recommended" />
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
                                            <div class="font-bold text-sm text-slate-900 print:text-[15px]">
                                                {item.price.toLocaleString()}
                                            </div>
                                        </div>
                                        {#if item.description}
                                            <p class="text-slate-600 text-sm leading-snug mb-1 print:text-[11px] print:leading-normal">
                                                {cleanName(item.description)}
                                            </p>
                                        {/if}
                                        {#if getGroupedModifiers}
                                            {@const grouped = getGroupedModifiers(item.id)}
                                            {#if grouped.length > 0}
                                                <div class="mt-0.5">
                                                    <MenuModifiersList 
                                                        groupedModifiers={grouped}
                                                        getModifierDescription={getModifierDescription}
                                                        className="text-slate-600 print:text-[11px] print:leading-normal" 
                                                    />
                                                </div>
                                            {/if}
                                        {:else if getVisibleModifiers}
                                            <div class="mt-0.5">
                                                <MenuModifiersList 
                                                    options={getVisibleModifiers(item.id)} 
                                                    className="text-slate-600 print:text-[11px] print:leading-normal" 
                                                />
                                            </div>
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

                            {#if getGroupedModifiers}
                                {@const grouped = getGroupedModifiers(section.id)}
                                {#if grouped.length > 0}
                                    <div class="mt-6">
                                        <MenuModifiersList 
                                            groupedModifiers={grouped}
                                            getModifierDescription={getModifierDescription}
                                            className="text-slate-600 print:text-[12px]" 
                                        />
                                    </div>
                                {/if}
                            {:else if getVisibleModifiers}
                                <div class="mt-6">
                                    <MenuModifiersList 
                                        options={getVisibleModifiers(section.id)} 
                                        className="text-slate-600 print:text-[12px]" 
                                    />
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </section>
        {/each}
    </div>

    {#if hasAnyBadges}
        <footer class="menu-legend mt-10 border-t border-slate-200 pt-3 text-[11px] text-slate-600 print:mt-0 print:border-slate-300">
            <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div class="inline-flex items-center gap-2">
                    <MenuItemIcons kind="recommended" class="h-4 w-4 text-slate-700" />
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
        @page {
            /* Extra bottom space so the fixed legend never overlaps content */
            margin: 1.5cm 1.5cm 2.7cm 1.5cm;
            size: A4;
        }
        :global(body) {
            margin: 0;
            padding: 0;
        }

        .menu-root {
            /* Keep content clear of the fixed legend */
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
