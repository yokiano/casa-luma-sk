<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { Toaster } from "$lib/components/ui/sonner";
  import { LogOut } from 'lucide-svelte';

  let { children, data }: { children?: Snippet, data: any } = $props();

  const role = $derived(data.role);

  const allTabs = [
    { href: '/tools/checklist', label: 'Checklist' },
    { href: '/tools/close-shift', label: 'Close Shift' },
    { href: '/tools/families', label: 'Families' },
    { href: '/tools/memberships', label: 'Memberships' },
    { href: '/tools/recipes', label: 'Casa Luma Recipes' },
    { href: '/tools/onboarding', label: 'Onboarding' },

    { href: '/tools/salary-payment', label: 'Payroll', managerOnly: true },
    { href: '/tools/pos-sync', label: 'POS Sync', managerOnly: true },
    { href: '/tools/receipts', label: 'Receipts', managerOnly: true },
    { href: '/tools/incidents', label: 'Incidents', managerOnly: true },
    { href: '/tools/expense-scan', label: 'Expense Scan', managerOnly: true }
  ];

  const staffTabs = $derived(allTabs.filter(tab => !tab.managerOnly));
  const managerTabs = $derived(allTabs.filter(tab => tab.managerOnly && role === 'manager'));
  const hasManagerTools = $derived(managerTabs.length > 0);

  const currentPath = $derived(page.url.pathname);
  const isOnboarding = $derived(currentPath.startsWith('/tools/onboarding'));

  const isSalaryPayment = $derived(currentPath === '/tools/salary-payment');

  const isActive = (href: string) => {
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };
</script>

<Toaster 
  richColors 
  theme="light"
  toastOptions={{
    classes: {
      toast: "rounded-3xl border-[#d9d0c7] shadow-xl",
      title: "text-[#2c2925] font-semibold",
      description: "text-[#5c4a3d] font-medium"
    }
  }}
/>

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
        {#if currentPath !== '/tools/login'}
          <a
            href="/tools/logout"
            class="flex items-center gap-2 rounded-full border border-[#d3c5b8] px-4 py-2 text-sm font-medium text-[#7a6550] transition-colors hover:bg-[#7a6550] hover:text-white"
          >
            <LogOut size={16} />
            Log Out
          </a>
        {/if}
      </div>
      {#if currentPath !== '/tools/login'}
        <nav class="mx-auto flex max-w-6xl flex-col gap-7 px-6 pb-6 print:hidden">
          <div class="flex flex-col gap-3">
            <span class="ml-1 text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/40">
              Staff Tools
            </span>
            <div class="flex flex-wrap gap-3">
              {#each staffTabs as tab}
                <a
                  href={tab.href}
                  class={`group inline-flex min-h-12 items-center justify-center rounded-full px-5 py-3 text-base font-medium leading-none transition-colors duration-150 sm:min-h-11 sm:px-4 sm:py-2.5 sm:text-sm ${
                    isActive(tab.href)
                      ? 'bg-[#7a6550] text-white shadow'
                      : 'text-[#7a6550]/65 hover:bg-white hover:text-[#7a6550]'
                  }`}
                >
                  {tab.label}
                </a>
              {/each}
            </div>
          </div>

          {#if hasManagerTools}
            <div class="flex flex-col gap-3">
              <span class="ml-1 text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/40">
                Manager Tools
              </span>
              <div class="flex flex-wrap gap-3">
                {#each managerTabs as tab}
                  <a
                    href={tab.href}
                    class={`group inline-flex min-h-12 items-center justify-center rounded-full px-5 py-3 text-base font-medium leading-none transition-colors duration-150 sm:min-h-11 sm:px-4 sm:py-2.5 sm:text-sm ${
                      isActive(tab.href)
                        ? 'bg-[#7a6550] text-white shadow'
                        : 'text-[#7a6550]/65 hover:bg-white hover:text-[#7a6550]'
                    }`}
                  >
                    {tab.label}
                  </a>
                {/each}
              </div>
            </div>
          {/if}
        </nav>
      {/if}
    </header>
  {/if}

  <main class={isOnboarding || isSalaryPayment ? 'mx-auto max-w-6xl px-6 py-10 print:px-0 print:py-0 print:max-w-none' : 'mx-auto max-w-6xl px-6 py-10'}>
    {@render children?.()}
  </main>
</div>
