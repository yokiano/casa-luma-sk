<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    status?: string;
    busy?: boolean;
    children?: Snippet;
  }

  let { status = '', busy = false, children }: Props = $props();
</script>

<div class="rounded-xl border border-[#eadfd3] bg-[#fbf8f4] p-3">
  <div class="flex flex-wrap items-center gap-2">
    {#if children}{@render children()}{/if}
  </div>
  <p class={status ? 'mt-2 text-xs leading-5 text-[#7a6550]' : 'sr-only'} aria-live="polite">{busy ? status || 'Working…' : status}</p>
</div>
