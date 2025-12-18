<script lang="ts">
    import type { MenuSummary } from '$lib/types/menu';
    
    let { menu }: { menu: MenuSummary } = $props();
</script>

<div class="font-serif text-stone-900 w-full h-full">
    <header class="text-center mb-16">
        <h2 class="text-4xl tracking-widest uppercase font-light text-stone-800 mb-2">Casa Luma</h2>
        <div class="w-16 h-px bg-stone-300 mx-auto"></div>
    </header>

    {#each menu.sections as section}
        <div class="mb-12 break-inside-avoid">
            <h3 class="text-xl font-light uppercase tracking-widest text-center mb-6 text-stone-600">
                {section.name}
            </h3>
            
            {#if section.intro}
                <p class="text-center text-stone-500 italic mb-8 text-sm max-w-md mx-auto">{section.intro}</p>
            {/if}

            <div class="space-y-5">
                {#each section.items as item}
                    <div class="group">
                        <div class="flex justify-between items-baseline w-full">
                            <h4 class="text-lg font-medium text-stone-800">{item.name}</h4>
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
</div>
