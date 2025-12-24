<script lang="ts">
    import { GraphicState } from '../GraphicState.svelte';
    import { domToPng } from 'modern-screenshot';

    interface Props {
        graphicState: GraphicState;
    }

    let { graphicState: gState }: Props = $props();
    let previewContainer: HTMLDivElement | undefined = $state();
    let isExporting = $state(false);

    async function exportPng() {
        if (!previewContainer) return;
        isExporting = true;
        try {
            const dataUrl = await domToPng(previewContainer, {
                quality: 1,
                scale: 2, // High resolution
            });
            const link = document.createElement('a');
            link.download = `casa-luma-graphic-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error('Export failed:', e);
        } finally {
            isExporting = false;
        }
    }

    // Calculate aspect ratio style
    const aspectRatioStyle = $derived.by(() => {
        const [w, h] = gState.aspectRatio.split(':').map(Number);
        return `aspect-ratio: ${w}/${h};`;
    });

    const fontStyle = $derived.by(() => {
        const fonts = {
            'Sarabun': "'Sarabun', sans-serif",
            'Prompt': "'Prompt', sans-serif",
            'Playfair Display': "'Playfair Display', serif",
            'Courier Prime': "'Courier Prime', monospace"
        };
        return fonts[gState.textOverlay.fontFamily] || 'sans-serif';
    });

    function hexToRgb(hex: string): string {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result 
            ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
            : '0, 0, 0';
    }
</script>

<div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
        <h3 class="text-lg font-serif font-semibold">Preview</h3>
        <div class="flex gap-2">
            <!-- Placeholders for future features -->
            <button class="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-500 rounded cursor-not-allowed" title="Coming Soon">Save to Notion</button>
            <button class="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-500 rounded cursor-not-allowed" title="Coming Soon">Export SVG</button>
            
            <button 
                onclick={exportPng}
                disabled={isExporting || !gState.currentImage}
                class="px-3 py-1.5 text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
                {isExporting ? 'Exporting...' : 'Export PNG'}
            </button>
        </div>
    </div>

    <div class="w-full bg-gray-100 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center p-4">
        <!-- Capture Container -->
        <div 
            bind:this={previewContainer}
            class="relative w-full max-w-[600px] shadow-xl bg-white overflow-hidden"
            style="{aspectRatioStyle}"
        >
            {#if gState.currentImage}
                <img 
                    src={gState.currentImage.url} 
                    alt={gState.currentImage.prompt}
                    class="w-full h-full object-cover"
                    crossorigin="anonymous"
                />
            {:else}
                <div class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-2">
                    <span class="text-4xl">🖼️</span>
                    <span class="text-sm">Generate an image to start</span>
                </div>
            {/if}

            <!-- Text Overlay -->
            {#if gState.textOverlay.content}
                <div 
                    class="absolute p-4 z-10 pointer-events-none"
                    style="
                        left: {gState.textOverlay.x}%;
                        top: {gState.textOverlay.y}%;
                        transform: translate(-{gState.textOverlay.layout === 'center' ? '50' : gState.textOverlay.x > 50 ? '100' : '0'}%, -{gState.textOverlay.layout === 'center' ? '50' : gState.textOverlay.y > 50 ? '100' : '0'}%);
                        width: auto;
                        max-width: {gState.textOverlay.maxWidth}%;
                        text-align: {gState.textOverlay.layout === 'center' ? 'center' : gState.textOverlay.x > 50 ? 'right' : 'left'};
                    "
                >
                    <div 
                        style="
                            font-family: {fontStyle};
                            font-size: {gState.textOverlay.fontSize}px;
                            color: {gState.textOverlay.color};
                            line-height: 1.2;
                            white-space: pre-wrap;
                        "
                    >
                        <span style="
                            background-color: rgba({hexToRgb(gState.textOverlay.backgroundColor)}, {gState.textOverlay.backgroundOpacity});
                            padding: 0.2em 0.4em;
                            border-radius: 0.1em;
                            box-decoration-break: clone;
                            -webkit-box-decoration-break: clone;
                        ">
                            {gState.textOverlay.content}
                        </span>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- History Bar -->
    {#if gState.history.length > 0}
        <div class="space-y-2">
            <label class="text-sm font-medium">History</label>
            <div class="flex gap-2 overflow-x-auto pb-2">
                {#each gState.history as item}
                    <button 
                        class="relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all"
                        class:border-[var(--primary)]={gState.currentImage?.id === item.id}
                        class:border-transparent={gState.currentImage?.id !== item.id}
                        onclick={() => gState.currentImage = item}
                    >
                        <img src={item.url} alt="History" class="w-full h-full object-cover" />
                    </button>
                {/each}
            </div>
        </div>
    {/if}
</div>
