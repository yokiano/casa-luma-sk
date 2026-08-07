<script lang="ts">
  import { ArrowUpRight, BookOpenCheck, ShieldCheck } from 'lucide-svelte';

  let { data } = $props();

  const routeLabel = (route: string) => (route === 'manager' ? 'Manager' : 'Cashier');
  const severityClasses = (severity: string) => {
    if (severity === 'critical') return 'border-red-200 bg-red-50 text-red-800';
    if (severity === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
    return 'border-slate-200 bg-slate-50 text-slate-700';
  };
</script>

<svelte:head>
  <title>Receipt Validation Catalog · Mgmt Dashboard</title>
</svelte:head>

<section class="space-y-6">
  <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Manager operations</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Receipt validation catalog</h1>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-[#7a6550]">
        Read-only reference for the hard-coded receipt checks, their criteria, and the current notification routes.
      </p>
    </div>
    <div class="flex flex-wrap gap-3 text-sm">
      <a
        class="inline-flex items-center gap-2 rounded-2xl border border-[#dfd2c5] bg-white px-4 py-3 font-semibold text-[#7a6550] shadow-sm hover:border-[#b99f86]"
        href="/mgmt-dashboard/violations"
      >
        Open violations <ArrowUpRight size={16} />
      </a>
    </div>
  </div>

  <aside class="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 shadow-sm">
    <p class="font-semibold">Read-only routing reference</p>
    <p class="mt-1">Routes describe the configured manager and cashier destinations without exposing Telegram chat IDs. This page does not change validation behavior or notification settings.</p>
  </aside>

  <div class="grid gap-4 xl:grid-cols-2">
    {#each data.validations as validation}
      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-semibold tracking-tight text-[#2c2925]">{validation.label}</h2>
              <span class={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${severityClasses(validation.severity)}`}>
                {validation.severity}
              </span>
            </div>
            <p class="mt-2 break-all font-mono text-xs text-[#7a6550]">{validation.code}</p>
          </div>
          <BookOpenCheck class="shrink-0 text-[#7a6550]" size={24} />
        </div>

        <dl class="mt-5 space-y-4 text-sm leading-6">
          <div>
            <dt class="font-bold text-[#7a6550]">Exact criteria</dt>
            <dd class="mt-1 text-[#5c4a3d]">{validation.criteria}</dd>
          </div>
          <div>
            <dt class="font-bold text-[#7a6550]">Description</dt>
            <dd class="mt-1 text-[#5c4a3d]">{validation.description}</dd>
          </div>
          <div>
            <dt class="font-bold text-[#7a6550]">Protects from</dt>
            <dd class="mt-1 text-[#5c4a3d]">{validation.protectsFrom}</dd>
          </div>
        </dl>

        <div class="mt-5 border-t border-[#eadfd3] pt-4">
          <div class="flex items-center gap-2 text-sm font-bold text-[#7a6550]">
            <ShieldCheck size={16} />
            Telegram routes
          </div>
          {#if validation.telegramRoutes.length === 0}
            <p class="mt-2 text-sm text-[#5c4a3d]">No Telegram route</p>
          {:else}
            <div class="mt-2 flex flex-wrap gap-2">
              {#each validation.telegramRoutes as route}
                <span class="rounded-full border border-[#d8c9bb] bg-[#fffaf4] px-3 py-1 text-xs font-semibold text-[#7a6550]">{routeLabel(route)}</span>
              {/each}
            </div>
          {/if}
          {#if validation.telegramRoutingNote}
            <p class="mt-3 text-sm leading-6 text-[#5c4a3d]"><b>Routing detail:</b> {validation.telegramRoutingNote}</p>
          {/if}
          {#if validation.cashierAction}
            <div class="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
              <b>Cashier guidance:</b> {validation.cashierAction}
            </div>
          {/if}
        </div>
      </article>
    {/each}
  </div>
</section>
