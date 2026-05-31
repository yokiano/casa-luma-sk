<script lang="ts">
  import { page } from '$app/state';
  import type { Snippet } from 'svelte';
  import { Activity, AlertTriangle, BarChart3, HeartPulse, Scale } from 'lucide-svelte';

  let { children }: { children?: Snippet } = $props();

  const sections = [
    { href: '/mgmt-dashboard', label: 'Daily meeting', icon: BarChart3 },
    { href: '/mgmt-dashboard/reconciliation', label: 'Reconciliation', icon: Scale },
    { href: '/mgmt-dashboard/violations', label: 'Violations', icon: AlertTriangle },
    { href: '/mgmt-dashboard/health', label: 'Health checks', icon: HeartPulse }
  ];

  const currentPath = $derived(page.url.pathname.replace(/\/$/, '') || '/');
  const isActive = (href: string) =>
    href === '/mgmt-dashboard' ? currentPath === href : currentPath === href || currentPath.startsWith(`${href}/`);
</script>

<svelte:head>
  <title>Mgmt Dashboard · Casa Luma</title>
</svelte:head>

<div class="min-h-screen bg-[#f6f1eb] text-[#2c2925]">
  <div class="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
    <aside class="border-b border-[#dfd2c5] bg-white/75 px-6 py-6 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r lg:py-8">
      <a href="/mgmt-dashboard" class="flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7a6550] text-white shadow-sm">
          <Activity size={22} />
        </span>
        <span>
          <span class="block text-xs font-bold uppercase tracking-[0.22em] text-[#7a6550]/60">Casa Luma</span>
          <span class="block text-xl font-semibold tracking-tight">Mgmt Dashboard</span>
        </span>
      </a>

      <nav class="mt-8 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {#each sections as section}
          {@const Icon = section.icon}
          <a
            href={section.href}
            class={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              isActive(section.href)
                ? 'bg-[#7a6550] text-white shadow-sm'
                : 'text-[#7a6550] hover:bg-[#efe6dc] hover:text-[#2c2925]'
            }`}
          >
            <Icon size={18} />
            {section.label}
          </a>
        {/each}
      </nav>

      <p class="mt-8 hidden rounded-3xl border border-[#dfd2c5] bg-[#fbf8f4] p-4 text-xs leading-5 text-[#7a6550] lg:block">
        Daily meeting agenda with Notion-led expenses, bank/safe reconciliation, HR reminders, task links, and receipt operations snapshots.
      </p>
    </aside>

    <main class="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      {@render children?.()}
    </main>
  </div>
</div>
