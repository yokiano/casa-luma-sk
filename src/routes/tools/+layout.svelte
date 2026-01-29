<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { Toaster } from "$lib/components/ui/sonner";

  let { children, data }: { children?: Snippet, data: any } = $props();

  const role = $derived(data.role);

  const allTabs = [
    // { href: '/tools/procurement-import', label: 'Procurement Import' },
    // { href: '/tools/menu-assistant', label: 'Menu Assistant' },
    { href: '/tools/pos-sync', label: 'POS Sync' },
    { href: '/tools/checklist', label: 'Checklist' },
    { href: '/tools/close-shift', label: 'Close Shift' },
    { href: '/tools/receipts', label: 'Receipts' },
    { href: '/tools/expense-scan', label: 'Expense Scan' },
    { href: '/tools/salary-payment', label: 'Salary Payment', managerOnly: true },
    { href: '/tools/memberships', label: 'Memberships' },
    // { href: '/tools/graphics', label: 'Graphics' },
    { href: '/tools/onboarding/kitchen', label: 'Onboarding' }
  ];

  const tabs = $derived(allTabs.filter(tab => !tab.managerOnly || role === 'manager'));

  const currentPath = $derived(page.url.pathname);
  const isOnboarding = $derived(currentPath.startsWith('/tools/onboarding'));

  const isSalaryPayment = $derived(currentPath === '/tools/salary-payment');

  const isActive = (href: string) => {
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };
</script>

<Toaster />

<div class="min-h-screen bg-[#f6f1eb] text-[#2c2925]">
  {#if !isOnboarding}
    <header class="border-b border-[#d3c5b8] bg-white/70 backdrop-blur print:hidden">
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
      {#if currentPath !== '/tools/login'}
        <nav class="mx-auto flex max-w-6xl gap-2 px-6 pb-4 print:hidden">
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
      {/if}
    </header>
  {/if}

  <main class={isOnboarding || isSalaryPayment ? 'mx-auto max-w-6xl px-6 py-10 print:px-0 print:py-0 print:max-w-none' : 'mx-auto max-w-6xl px-6 py-10'}>
    {@render children?.()}
  </main>
</div>

