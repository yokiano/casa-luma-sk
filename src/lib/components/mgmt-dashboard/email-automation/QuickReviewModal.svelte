<script lang="ts">
  import { ExternalLink } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import type { EmailAutomationEventDetail } from '$lib/server/email-automation/dashboard';
  import SingleEmailReview from './SingleEmailReview.svelte';
  import type { ReviewOperations } from './types';

  type Props = {
    open: boolean;
    eventId: number | null;
    detail: EmailAutomationEventDetail | null;
    loading: boolean;
    errorMessage: string;
    operations: ReviewOperations;
    onRefresh: () => Promise<void>;
    onRetry: () => void | Promise<void>;
    onClose: () => void;
  };

  let {
    open,
    eventId,
    detail,
    loading,
    errorMessage,
    operations,
    onRefresh,
    onRetry,
    onClose
  }: Props = $props();

  const handleOpenChange = (value: boolean) => {
    if (!value) onClose();
  };

  const reviewUrl = $derived(eventId ? `/mgmt-dashboard/email-automation/${eventId}` : null);
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="max-h-[92vh] overflow-y-auto border-[#d3c5b8] bg-[#fdfbf9] p-4 sm:max-w-[min(96vw,72rem)] sm:p-6">
    <Dialog.Header>
      <div class="flex items-start justify-between gap-3">
        <div>
          <Dialog.Title class="text-xl font-semibold text-[#2c2925]">Quick email review</Dialog.Title>
          <Dialog.Description class="text-sm text-[#7a6550]">Loads one bounded event on demand. Review changes run now and stay separate from external-action and Telegram queues.</Dialog.Description>
        </div>
        {#if reviewUrl}
          <a
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d9d0c7] bg-white text-[#5c4a3d] hover:bg-[#efe6dc]"
            href={reviewUrl}
            target="_blank"
            rel="noreferrer"
            title="Open dedicated review page in a new tab"
            aria-label="Open dedicated review page in a new tab"
          >
            <ExternalLink size={15} />
          </a>
        {/if}
      </div>
    </Dialog.Header>

    <div>
      {#if loading}
        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950" aria-live="polite">Loading the selected review…</div>
      {:else if errorMessage}
        <div class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-950" aria-live="polite">
          <p class="font-semibold">Quick review unavailable</p>
          <p class="mt-1">{errorMessage}</p>
          {#if eventId}<button type="button" class="mt-3 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold" onclick={onRetry}>Try again</button>{/if}
        </div>
      {:else if detail}
        <SingleEmailReview {detail} variant="modal" {operations} onRefresh={onRefresh} />
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
