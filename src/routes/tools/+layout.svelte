<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';

  const tabs = [
    { href: '/tools/procurement-import', label: 'Procurement Import' },
    { href: '/tools/menu-assistant', label: 'Menu Assistant' }
  ];

  let { children }: { children?: Snippet } = $props();

  const currentPath = $derived(page.url.pathname);

  const isActive = (href: string) => {
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };
</script>

<div class="min-h-screen bg-[#f6f1eb] text-[#2c2925]">
  <header class="border-b border-[#d3c5b8] bg-white/70 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <div>
        <h1 class="text-lg font-semibold tracking-tight uppercase text-[#7a6550]">
          Casa Luma · Internal Tools
        </h1>
        <p class="mt-1 text-sm text-[#7a6550]/80">
          Lightweight utilities for procurement and operations.
        </p>
      </div>
    </div>
    <nav class="mx-auto flex max-w-6xl gap-2 px-6 pb-4">
      {#each tabs as tab}
        <a
          href={tab.href}
          class={`group rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
            isActive(tab.href)
              ? 'bg-[#7a6550] text-white shadow'
              : 'text-[#7a6550]/65 hover:bg-white hover:text-[#7a6550]'
          }`}
        >
          {tab.label}
        </a>
      {/each}
    </nav>
  </header>

  <main class="mx-auto max-w-6xl px-6 py-10">
    {@render children?.()}
  </main>
</div>

