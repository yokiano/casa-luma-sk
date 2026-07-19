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

<section class="rounded-2xl border border-[#dfd2c5] bg-white p-5 shadow-sm {className}">
  {#if eyebrow}<p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">{eyebrow}</p>{/if}
  <h2 class="{eyebrow ? 'mt-2' : ''} font-semibold text-[#2c2925]">{title}</h2>
  {#if description}<p class="mt-2 text-sm leading-6 text-[#7a6550]">{description}</p>{/if}
  {#if children}<div class="mt-4">{@render children()}</div>{/if}
</section>
