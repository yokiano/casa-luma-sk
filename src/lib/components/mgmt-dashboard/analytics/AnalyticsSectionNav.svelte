<script lang="ts" module>
  export const analyticsSections = [
    { id: 'overview', href: '#overview', label: 'Overview' },
    { id: 'revenue', href: '#revenue', label: 'Revenue split' },
    { id: 'open-play', href: '#open-play', label: 'Open-play mix' },
    { id: 'profitability', href: '#profitability', label: 'Profitability' },
    { id: 'receipt-patterns', href: '#receipt-patterns', label: 'Receipt patterns' }
  ] as const;

  export type AnalyticsSectionId = (typeof analyticsSections)[number]['id'];
</script>

<script lang="ts">
  interface Props {
    activeSection?: AnalyticsSectionId;
  }

  let { activeSection = 'overview' }: Props = $props();
</script>

<nav aria-label="Analytics sections" class="border-t border-[#eadfd3] pt-3">
  <div class="flex gap-2 overflow-x-auto pb-1">
    {#each analyticsSections as section}
      <a
        href={section.href}
        aria-current={activeSection === section.id ? 'location' : undefined}
        class="shrink-0 rounded-full px-3 py-2 text-xs font-bold transition {activeSection === section.id ? 'bg-[#2c2925] text-white shadow-sm' : 'text-[#7a6550] hover:bg-[#efe6dc] hover:text-[#2c2925]'}"
      >
        {section.label}
      </a>
    {/each}
  </div>
</nav>
