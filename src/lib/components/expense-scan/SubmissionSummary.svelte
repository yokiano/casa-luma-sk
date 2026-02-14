<script lang="ts">
  import type { ScannedSlip } from '../../../routes/tools/expense-scan/ExpenseScanState.svelte';

  interface Props {
    slips: ScannedSlip[];
  }

  let { slips }: Props = $props();

  const stats = $derived.by(() => {
    const total = slips.length;
    const submitted = slips.filter(s => s.status === 'submitted').length;
    const ready = slips.filter(s => s.status === 'scanned' && s.parsedAmount && s.category && s.department).length;
    const processing = slips.filter(s => s.status === 'scanning' || s.status === 'submitting' || s.status === 'pending').length;
    const errors = slips.filter(s => s.status === 'error').length;
    const totalAmount = slips
      .filter(s => s.status === 'scanned' || s.status === 'submitted')
      .reduce((sum, s) => sum + (s.parsedAmount || 0), 0);

    return { total, submitted, ready, processing, errors, totalAmount };
  });
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
  <div class="rounded-2xl border border-[#e0d6cc] bg-[#fdfaf8] p-3 text-center">
    <p class="text-[10px] font-bold uppercase tracking-wider text-[#5c4a3d]/60">Total Slips</p>
    <p class="mt-1 text-xl font-semibold text-[#2c2925]">{stats.total}</p>
  </div>
  
  <div class="rounded-2xl border border-green-100 bg-green-50/50 p-3 text-center">
    <p class="text-[10px] font-bold uppercase tracking-wider text-green-700/60">Ready</p>
    <p class="mt-1 text-xl font-semibold text-green-700">{stats.ready}</p>
  </div>

  <div class="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-center">
    <p class="text-[10px] font-bold uppercase tracking-wider text-blue-700/60">Submitted</p>
    <p class="mt-1 text-xl font-semibold text-blue-700">{stats.submitted}</p>
  </div>

  <div class="rounded-2xl border border-orange-100 bg-orange-50/50 p-3 text-center">
    <p class="text-[10px] font-bold uppercase tracking-wider text-orange-700/60">In Progress</p>
    <p class="mt-1 text-xl font-semibold text-orange-700">{stats.processing}</p>
  </div>

  <div class="col-span-2 rounded-2xl border border-[#e0d6cc] bg-[#7a6550] p-3 text-center sm:col-span-1">
    <p class="text-[10px] font-bold uppercase tracking-wider text-white/70">Total Amount</p>
    <p class="mt-1 text-xl font-semibold text-white">
      {stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </p>
  </div>
</div>
