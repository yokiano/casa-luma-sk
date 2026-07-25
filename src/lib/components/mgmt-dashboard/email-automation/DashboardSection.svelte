<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    eyebrow?: string;
    description?: string;
    class?: string;
    children?: Snippet;
  }

  let { title, eyebrow, description, class: className = '', children }: Props = $props();
</script>

<section class="rounded-2xl border border-[#e7e2dc] bg-white p-4 shadow-[0_1px_2px_rgba(44,41,37,0.04)] {className}">
  {#if eyebrow}<p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a7a69]">{eyebrow}</p>{/if}
  <h2 class="{eyebrow ? 'mt-1.5' : ''} text-sm font-semibold text-[#1f1f1f]">{title}</h2>
  {#if description}<p class="mt-1.5 max-w-3xl text-xs leading-5 text-[#7a6b5c]">{description}</p>{/if}
  {#if children}<div class="mt-3">{@render children()}</div>{/if}
</section>
