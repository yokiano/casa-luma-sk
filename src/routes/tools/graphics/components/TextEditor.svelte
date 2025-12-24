<script lang="ts">
    import { GraphicState, type TextLayout, type FontFamily } from '../GraphicState.svelte';

    interface Props {
        graphicState: GraphicState;
    }

    let { graphicState: gState }: Props = $props();

    const layouts: { value: TextLayout; label: string }[] = [
        { value: 'center', label: 'Center' },
        { value: 'bottom-left', label: 'Bottom Left' },
        { value: 'bottom-right', label: 'Bottom Right' },
        { value: 'top-left', label: 'Top Left' },
        { value: 'top-right', label: 'Top Right' },
        { value: 'custom', label: 'Custom' }
    ];

    const fonts: { value: FontFamily; label: string }[] = [
        { value: 'Sarabun', label: 'Sarabun (Clean)' },
        { value: 'Prompt', label: 'Prompt (Modern)' },
        { value: 'Playfair Display', label: 'Playfair (Serif)' },
        { value: 'Courier Prime', label: 'Courier (Typewriter)' }
    ];

    const colors = [
        { value: '#333333', label: 'Charcoal' },
        { value: '#ffffff', label: 'White' },
        { value: '#dfbc69', label: 'Gold' },
        { value: '#A8C3A0', label: 'Sage' },
        { value: '#E07A5F', label: 'Terracotta' }
    ];
</script>

<div class="flex flex-col gap-6 p-6 bg-white/50 rounded-xl border border-[var(--border)]">
    <div class="space-y-2">
        <h3 class="text-lg font-serif font-semibold text-[var(--foreground)]">Text Overlay</h3>
        <p class="text-sm text-[var(--muted-foreground)]">Add and style your text.</p>
    </div>

    <!-- Content -->
    <div class="space-y-2">
        <label for="textContent" class="text-sm font-medium">Text Content</label>
        <textarea
            id="textContent"
            bind:value={gState.textOverlay.content}
            class="w-full min-h-[80px] p-3 rounded-md border border-[var(--input)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            placeholder="Enter text..."
        ></textarea>
    </div>

    <!-- Layout & Font -->
    <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
            <label for="layout" class="text-sm font-medium">Layout Position</label>
            <select
                id="layout"
                value={gState.textOverlay.layout}
                onchange={(e) => gState.updateTextOverlay({ layout: e.currentTarget.value as TextLayout })}
                class="w-full p-2 rounded-md border border-[var(--input)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
                {#each layouts as layout}
                    <option value={layout.value}>{layout.label}</option>
                {/each}
            </select>
        </div>

        <div class="space-y-2">
            <label for="font" class="text-sm font-medium">Font Family</label>
            <select
                id="font"
                bind:value={gState.textOverlay.fontFamily}
                class="w-full p-2 rounded-md border border-[var(--input)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
                {#each fonts as font}
                    <option value={font.value}>{font.label}</option>
                {/each}
            </select>
        </div>
    </div>

    <!-- Size & Opacity -->
    <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
            <div class="flex justify-between">
                <label for="fontSize" class="text-sm font-medium">Size</label>
                <span class="text-xs text-[var(--muted-foreground)]">{gState.textOverlay.fontSize}px</span>
            </div>
            <input
                id="fontSize"
                type="range"
                min="12"
                max="120"
                bind:value={gState.textOverlay.fontSize}
                class="w-full"
            />
        </div>

        <div class="space-y-2">
            <div class="flex justify-between">
                <label for="opacity" class="text-sm font-medium">BG Opacity</label>
                <span class="text-xs text-[var(--muted-foreground)]">{Math.round(gState.textOverlay.backgroundOpacity * 100)}%</span>
            </div>
            <input
                id="opacity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                bind:value={gState.textOverlay.backgroundOpacity}
                class="w-full"
            />
        </div>
    </div>

    <!-- Colors -->
    <div class="space-y-2">
        <label class="text-sm font-medium">Text Color</label>
        <div class="flex flex-wrap gap-2">
            {#each colors as color}
                <button
                    class="w-8 h-8 rounded-full border border-gray-200 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ring)]"
                    style="background-color: {color.value}"
                    onclick={() => gState.textOverlay.color = color.value}
                    title={color.label}
                    class:ring-2={gState.textOverlay.color === color.value}
                    class:ring-offset-2={gState.textOverlay.color === color.value}
                    class:ring-[var(--ring)]={gState.textOverlay.color === color.value}
                ></button>
            {/each}
            <input 
                type="color" 
                bind:value={gState.textOverlay.color}
                class="w-8 h-8 rounded-full p-0 border-0 overflow-hidden cursor-pointer"
            />
        </div>
    </div>

    <!-- Custom Position Controls (Only if custom) -->
    {#if gState.textOverlay.layout === 'custom'}
        <div class="pt-4 border-t border-[var(--border)] space-y-4">
             <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label for="posX" class="text-sm font-medium">X Position (%)</label>
                    <input
                        id="posX"
                        type="number"
                        min="0"
                        max="100"
                        bind:value={gState.textOverlay.x}
                        class="w-full p-2 rounded-md border border-[var(--input)] bg-white text-sm"
                    />
                </div>
                 <div class="space-y-2">
                    <label for="posY" class="text-sm font-medium">Y Position (%)</label>
                    <input
                        id="posY"
                        type="number"
                        min="0"
                        max="100"
                        bind:value={gState.textOverlay.y}
                        class="w-full p-2 rounded-md border border-[var(--input)] bg-white text-sm"
                    />
                </div>
             </div>
        </div>
    {/if}
</div>

