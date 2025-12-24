<script lang="ts">
    import { GraphicState } from '../GraphicState.svelte';
    import { REPLICATE_MODEL_LABELS } from '$lib/constants';
    import { generateGraphicsImage } from '../graphics.remote';
    
    interface Props {
        graphicState: GraphicState;
    }
    
    let { graphicState: gState }: Props = $props();

    function selectTemplate(template: { label: string, prompt: string }) {
        gState.setPrompt(template.prompt);
    }

	function randomSeed() {
		// Replicate typically accepts 32-bit-ish ranges; keep it safely within JS int.
		return Math.floor(Math.random() * 1_000_000_000);
	}

	function setPinnedSeedPinned(pinned: boolean) {
		gState.isSeedPinned = pinned;
		if (pinned && gState.seed === null) {
			gState.seed = randomSeed();
		}
	}

	async function generate() {
		gState.isGenerating = true;
		try {
			const seedToUse = gState.isSeedPinned ? (gState.seed ?? randomSeed()) : undefined;
			if (gState.isSeedPinned && gState.seed === null && seedToUse !== undefined) {
				gState.seed = seedToUse;
			}

			const res = await generateGraphicsImage({
				prompt: gState.prompt,
				model: gState.selectedModel,
				aspectRatio: gState.aspectRatio,
				negativePrompt: gState.negativePrompt,
				seed: seedToUse
			});

			gState.setGeneratedImage({
				id: res.predictionId,
				url: res.imageUrl,
				prompt: gState.prompt,
				seed: seedToUse,
				model: gState.selectedModel,
				createdAt: new Date()
			});
		} finally {
			gState.isGenerating = false;
		}
	}
</script>

<div class="flex flex-col gap-6 p-6 bg-white/50 rounded-xl border border-[var(--border)]">
    <div class="space-y-2">
        <h3 class="text-lg font-serif font-semibold text-[var(--foreground)]">Generation Settings</h3>
        <p class="text-sm text-[var(--muted-foreground)]">Create a base image for your graphic.</p>
    </div>

    <!-- Templates -->
    <div class="space-y-3">
        <div class="text-sm font-medium">Quick Templates</div>
        <div class="flex flex-wrap gap-2">
            {#each gState.templates as template (template.label)}
                <button
                    type="button"
                    class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
                    {gState.prompt === template.prompt 
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]' 
                        : 'bg-white hover:bg-[var(--muted)] border-[var(--border)]'}"
                    onclick={() => selectTemplate(template)}
                >
                    {template.label}
                </button>
            {/each}
        </div>
    </div>

    <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); generate(); }}>
        <!-- Prompt -->
        <div class="space-y-2">
            <label for="prompt" class="text-sm font-medium">Prompt</label>
            <textarea
                id="prompt"
                bind:value={gState.prompt}
                class="w-full min-h-[120px] p-3 rounded-md border border-[var(--input)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Describe your image..."
            ></textarea>
        </div>

        <!-- Negative Prompt -->
         <div class="space-y-2">
            <label for="negativePrompt" class="text-sm font-medium">Negative Prompt (Optional)</label>
            <textarea
                id="negativePrompt"
                bind:value={gState.negativePrompt}
                class="w-full min-h-[60px] p-3 rounded-md border border-[var(--input)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="What to exclude..."
            ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <!-- Model Selection -->
            <div class="space-y-2">
                <label for="model" class="text-sm font-medium">Model</label>
                <select
                    id="model"
                    bind:value={gState.selectedModel}
                    class="w-full p-2 rounded-md border border-[var(--input)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                    {#each Object.entries(REPLICATE_MODEL_LABELS) as [value, label] (value)}
                        <option {value}>{label}</option>
                    {/each}
                </select>
            </div>

            <!-- Aspect Ratio -->
            <div class="space-y-2">
                <label for="aspectRatio" class="text-sm font-medium">Aspect Ratio</label>
                <select
                    id="aspectRatio"
                    bind:value={gState.aspectRatio}
                    class="w-full p-2 rounded-md border border-[var(--input)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                    <option value="1:1">1:1 (Square)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="4:5">4:5 (Portrait)</option>
                    <option value="9:16">9:16 (Story)</option>
                </select>
            </div>
        </div>

		<!-- Seed -->
		<div class="pt-2 border-t border-[var(--border)] space-y-3">
			<div class="flex items-center justify-between gap-3">
				<div class="space-y-1">
					<div class="text-sm font-medium">Seed</div>
					<p class="text-xs text-[var(--muted-foreground)]">Pin to iterate a style; unpin for variety.</p>
				</div>
				<label class="inline-flex items-center gap-2 select-none">
					<input
						type="checkbox"
						checked={gState.isSeedPinned}
						onchange={(e) => setPinnedSeedPinned(e.currentTarget.checked)}
						class="h-4 w-4 accent-[var(--primary)]"
					/>
					<span class="text-sm">Pin</span>
				</label>
			</div>

			<div class="grid grid-cols-[1fr_auto] gap-2 items-center">
				<input
					id="seed"
					type="number"
					min="0"
					step="1"
					disabled={!gState.isSeedPinned}
					value={gState.seed ?? ''}
					oninput={(e) => {
						const n = e.currentTarget.valueAsNumber;
						gState.seed = Number.isFinite(n) ? n : null;
					}}
					class="w-full p-2 rounded-md border border-[var(--input)] bg-white text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
					placeholder="e.g. 12345"
				/>

				<button
					type="button"
					disabled={!gState.isSeedPinned}
					onclick={() => (gState.seed = randomSeed())}
					class="px-3 py-2 text-xs font-medium rounded-md border border-[var(--border)] bg-white hover:bg-[var(--muted)] disabled:opacity-50"
					title="Pick a new seed"
				>
					Reroll
				</button>
			</div>
		</div>

        <button
            type="submit"
            disabled={gState.isGenerating}
            class="mt-2 w-full px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
            {#if gState.isGenerating}
                <span>Generating...</span>
            {:else}
                <span>Generate Image</span>
            {/if}
        </button>
    </form>
</div>

