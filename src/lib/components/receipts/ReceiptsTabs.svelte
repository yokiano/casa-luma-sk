<script lang="ts">
  interface Tab {
    id: 'receipts' | 'analytics';
    label: string;
    description: string;
  }

  interface Props {
    activeTab: 'receipts' | 'analytics';
    onChange?: (tab: Tab['id']) => void;
  }

  let { activeTab, onChange }: Props = $props();

  const tabs: Tab[] = [
    {
      id: 'receipts',
      label: 'Receipts',
      description: 'Review individual transactions.'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'High-level trends and summaries.'
    }
  ];
</script>

<div class="flex flex-wrap items-center gap-3">
  {#each tabs as tab}
    <button
      type="button"
      class={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        activeTab === tab.id
          ? 'border-[#7a6550] bg-[#7a6550] text-white'
          : 'border-[#d8c9bb] text-[#7a6550] hover:border-[#7a6550]'
      }`}
      onclick={() => onChange?.(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>
<p class="text-xs text-[#7a6550]/70">
  {tabs.find((tab) => tab.id === activeTab)?.description}
</p>
