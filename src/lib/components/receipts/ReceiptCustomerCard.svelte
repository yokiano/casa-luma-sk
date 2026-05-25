<script lang="ts">
  import { Baby, ExternalLink, Hash, Heart, Mail, Phone, User, Users } from 'lucide-svelte';

  type FamilySummary = {
    id: string;
    familyName: string;
    customerCode: string | null;
    loyverseCustomerId: string | null;
    mainPhone: string | null;
    mainEmail: string | null;
    status: string | null;
    members: {
      id: string;
      name: string;
      type: string | null;
      email: string | null;
      phone: string | null;
    }[];
  };

  interface Props {
    family: FamilySummary | null;
    customerId?: string | null;
  }

  let { family, customerId = null }: Props = $props();

  const receiptsHref = $derived.by(() => {
    if (!customerId) return '/tools/receipts';
    const params = new URLSearchParams({ customerId, tab: 'receipts', view: 'compact', sortOrder: 'desc' });
    return `/tools/receipts?${params.toString()}`;
  });

  const getMemberIcon = (type: string | null) => {
    const normalized = type?.toLowerCase() ?? '';
    if (normalized.includes('child') || normalized.includes('kid')) return Baby;
    if (normalized.includes('parent') || normalized.includes('mother') || normalized.includes('father')) return Heart;
    return User;
  };
</script>

<section class="rounded-2xl border border-[#d8c9bb] bg-white/80 p-5 shadow-sm">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0 space-y-2">
      <p class="flex items-center gap-2 text-xs uppercase tracking-wide text-[#7a6550]/70">
        <Users size={14} />
        Customer / family
      </p>

      {#if family}
        <div>
          <h2 class="text-2xl font-semibold text-[#2c2925]">{family.familyName}</h2>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            {#if family.customerCode}
              <span class="rounded-lg bg-[#f0e6db] px-2 py-1 text-xs font-bold tracking-tight text-[#7a6550]">
                {family.customerCode}
              </span>
            {/if}
            {#if family.status}
              <span class="rounded-lg bg-[#faf6f2] px-2 py-1 text-xs font-semibold text-[#7a6550]">
                {family.status}
              </span>
            {/if}
            {#if family.loyverseCustomerId}
              <span class="rounded-lg bg-[#edf5ec] px-2 py-1 text-xs font-semibold text-[#4c7650]">
                Loyverse synced
              </span>
            {/if}
          </div>
        </div>

        <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#7a6550]">
          {#if family.mainPhone}
            <span class="inline-flex items-center gap-1.5"><Phone size={14} /> {family.mainPhone}</span>
          {/if}
          {#if family.mainEmail}
            <span class="inline-flex items-center gap-1.5"><Mail size={14} /> {family.mainEmail}</span>
          {/if}
          {#if customerId}
            <span class="inline-flex items-center gap-1.5"><Hash size={14} /> {customerId}</span>
          {/if}
        </div>
      {:else}
        <div>
          <h2 class="text-xl font-semibold text-[#2c2925]">No matching family found</h2>
          <p class="mt-1 text-sm text-[#7a6550]/80">
            {#if customerId}
              This receipt has Loyverse customer ID <span class="font-mono">{customerId}</span>, but it did not match a Notion family.
            {:else}
              This receipt does not include a Loyverse customer ID.
            {/if}
          </p>
        </div>
      {/if}
    </div>

    {#if customerId}
      <a
        class="inline-flex items-center gap-2 rounded-full bg-[#7a6550] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6a5847]"
        href={receiptsHref}
      >
        View customer receipts
        <ExternalLink size={14} />
      </a>
    {/if}
  </div>

  {#if family && family.members.length}
    <div class="mt-5 border-t border-[#f0e6db] pt-4">
      <p class="mb-3 text-xs font-bold uppercase tracking-wider text-[#7a6550]/50">Family members</p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each family.members as member (member.id)}
          {@const Icon = getMemberIcon(member.type)}
          <div class="flex items-start gap-3 rounded-2xl bg-[#faf6f2]/70 p-3">
            <div class="mt-0.5 rounded-full bg-white p-1.5 text-[#7a6550]/60 shadow-sm">
              <Icon size={14} />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-[#2c2925]">{member.name}</p>
              {#if member.type}
                <p class="text-[10px] uppercase tracking-wide text-[#7a6550]/60">{member.type}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>
