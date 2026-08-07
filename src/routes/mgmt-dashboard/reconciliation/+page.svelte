<script lang="ts">
  import BalanceReconciliationPanel from '$lib/components/mgmt-dashboard/BalanceReconciliationPanel.svelte';
  import { getBalanceReconciliationDashboard } from '$lib/mgmt-dashboard.remote';
  import { ExternalLink } from 'lucide-svelte';

  const reconciliation = getBalanceReconciliationDashboard();
  const errorMessage = (error: unknown) => (error instanceof Error ? error.message : error ? String(error) : null);
</script>

<section class="space-y-6">
  <div>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Reconciliation</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Bank and safe reconciliation</h1>
    <div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="max-w-3xl text-sm text-[#7a6550]">
        Review expected KBank and safe cash balances against accepted baselines, latest snapshots, receipt movements, and Financial Ledger records.
      </p>
      <a href="/mgmt-dashboard/balances/submit" class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#dfd2c5] bg-white px-4 py-2 text-xs font-bold text-[#7a6550] transition hover:border-[#7a6550] hover:text-[#2c2925]">
        Submit current balances <ExternalLink size={13} />
      </a>
    </div>
    <p class="mt-2 text-xs text-[#7a6550]/75">The form creates Observed / Needs Review evidence using the supplied Bangkok observation time. It does not create a baseline or ledger movement.</p>
  </div>

  <aside class="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
    <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-700/80">Don&apos;t forget</p>
    <ul class="mt-3 list-disc space-y-2 pl-5 text-sm font-medium">
      <li>Make sure you account for credit card fees deducted monthly.</li>
    </ul>
  </aside>

  <BalanceReconciliationPanel
    variant="detail"
    data={reconciliation.current}
    loading={reconciliation.loading}
    error={errorMessage(reconciliation.error)}
  />
</section>
