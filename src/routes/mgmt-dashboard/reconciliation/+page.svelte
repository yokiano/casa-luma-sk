<script lang="ts">
  import BalanceReconciliationPanel from '$lib/components/mgmt-dashboard/BalanceReconciliationPanel.svelte';
  import { getBalanceReconciliationDashboard } from '$lib/mgmt-dashboard.remote';

  const reconciliation = getBalanceReconciliationDashboard();
  const errorMessage = (error: unknown) => (error instanceof Error ? error.message : error ? String(error) : null);
</script>

<section class="space-y-6">
  <div>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Reconciliation</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Bank and safe reconciliation</h1>
    <p class="mt-2 max-w-3xl text-sm text-[#7a6550]">
      Review expected KBank and safe cash balances against accepted baselines, latest snapshots, receipt movements, and Company Ledger records.
    </p>
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
