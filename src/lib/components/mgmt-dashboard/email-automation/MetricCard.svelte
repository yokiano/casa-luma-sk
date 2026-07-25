<script lang="ts">
  interface Props {
    label: string;
    value: string;
    detail?: string;
    tone?: 'neutral' | 'positive' | 'warning' | 'danger';
  }

  let { label, value, detail, tone = 'neutral' }: Props = $props();
  const tones = {
    neutral: 'border-[#e7e2dc] bg-white',
    positive: 'border-emerald-200 bg-emerald-50/70',
    warning: 'border-amber-200 bg-amber-50/70',
    danger: 'border-red-200 bg-red-50/70'
  };
</script>

<article class="rounded-xl border p-3 shadow-[0_1px_1px_rgba(44,41,37,0.03)] {tones[tone]}">
  <p class="text-[11px] font-semibold uppercase tracking-wider text-[#8a7a69]">{label}</p>
  <p class="mt-1.5 text-sm font-medium leading-5 text-[#1f1f1f]">{value}</p>
  {#if detail}<p class="mt-1 text-xs leading-5 text-[#7a6550]">{detail}</p>{/if}
</article>
