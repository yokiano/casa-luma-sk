<script lang="ts">
    import ChecklistPrintView from '$lib/components/checklist/ChecklistPrintView.svelte';
    import type { PageData } from './$types';
    import { onMount } from 'svelte';

    let { data }: { data: PageData } = $props();

    onMount(() => {
        // Auto-print when opened in a new tab/window, but allow a moment for rendering
        setTimeout(() => {
            window.print();
        }, 500);
    });
</script>

<svelte:head>
    <title>Print Checklist - {data.sop.name}</title>
</svelte:head>

<div class="print:block bg-white min-h-screen"> 
    <ChecklistPrintView sop={data.sop} />
</div>
