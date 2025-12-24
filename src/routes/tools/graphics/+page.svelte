<script lang="ts">
    import { GraphicState } from './GraphicState.svelte';
    import GeneratorControls from './components/GeneratorControls.svelte';
    import TextEditor from './components/TextEditor.svelte';
    import GraphicPreview from './components/GraphicPreview.svelte';

    // Initialize State
    const gState = new GraphicState();
</script>

<div class="container mx-auto py-8 px-4 max-w-7xl">
    <div class="flex flex-col gap-8">
        <!-- Header -->
        <div class="flex flex-col gap-2">
            <h1 class="text-3xl font-serif font-bold text-[var(--foreground)]">Graphic Generator</h1>
            <p class="text-[var(--muted-foreground)]">Create custom graphics for Casa Luma with AI generation and text overlays.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Left Column: Controls (4/12) -->
            <div class="lg:col-span-4 flex flex-col gap-6">
                <GeneratorControls graphicState={gState} />
                <TextEditor graphicState={gState} />
            </div>

            <!-- Right Column: Preview (8/12) -->
            <div class="lg:col-span-8">
                <div class="sticky top-8">
                    <GraphicPreview graphicState={gState} />
                </div>
            </div>
        </div>
    </div>
</div>

