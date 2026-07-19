<script lang="ts">
  import { AlertTriangle, Ban, CheckCircle2, Inbox } from 'lucide-svelte';
  import type { DashboardData } from '$lib/server/email-automation/dashboard';

  let { totals }: { totals: DashboardData['totals'] } = $props();
</script>

<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <article class="rounded-3xl border border-[#dfd2c5] bg-white p-5"><div class="flex items-center gap-2 text-[#7a6550]/60"><Inbox size={16} /><p class="text-xs font-bold uppercase tracking-wider">Received</p></div><p class="mt-2 text-3xl font-semibold">{totals.total}</p></article>
  <article class="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><div class="flex items-center gap-2 text-emerald-800/60"><CheckCircle2 size={16} /><p class="text-xs font-bold uppercase tracking-wider">Ready for action</p></div><p class="mt-2 text-3xl font-semibold text-emerald-900">{totals.ready}</p></article>
  <article class="rounded-3xl border border-amber-200 bg-amber-50 p-5"><div class="flex items-center gap-2 text-amber-800/60"><AlertTriangle size={16} /><p class="text-xs font-bold uppercase tracking-wider">Needs review</p></div><p class="mt-2 text-3xl font-semibold text-amber-900">{totals.review}</p></article>
  <article class="rounded-3xl border border-slate-200 bg-slate-50 p-5"><div class="flex items-center gap-2 text-slate-700/60"><Ban size={16} /><p class="text-xs font-bold uppercase tracking-wider">Ignored</p></div><p class="mt-2 text-3xl font-semibold text-slate-900">{totals.ignored}</p></article>
</div>
