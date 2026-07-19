<script lang="ts">
  interface Props {
    label: string;
    value: string;
    detail?: string;
    tone?: 'neutral' | 'positive' | 'warning' | 'danger';
  }

  let { label, value, detail, tone = 'neutral' }: Props = $props();
  const tones = {
    neutral: 'border-[#dfd2c5] bg-white',
    positive: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-red-200 bg-red-50'
  };
</script>

<article class="rounded-2xl border p-4 {tones[tone]}">
  <p class="text-xs font-bold uppercase tracking-wider text-[#7a6550]/70">{label}</p>
  <p class="mt-2 text-lg font-semibold text-[#2c2925]">{value}</p>
  {#if detail}<p class="mt-1 text-xs leading-5 text-[#7a6550]">{detail}</p>{/if}
</article>
