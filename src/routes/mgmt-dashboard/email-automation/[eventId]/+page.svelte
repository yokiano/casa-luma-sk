<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';
  import {
    addEmailAutomationReviewSenderToIgnoredListNow,
    dismissEmailAutomationReviewAsIrrelevantNow,
    markEmailAutomationReviewDoneNow,
    reopenEmailAutomationReviewNow,
    saveEmailAutomationReviewNotesNow,
    reconcileEmailAutomationActionNow,
    retryEmailAutomationActionNow,
    retryEmailAutomationNotificationNow
  } from '$lib/email-automation.remote';
  import SingleEmailReview from '$lib/components/mgmt-dashboard/email-automation/SingleEmailReview.svelte';
  import type { ReviewOperations } from '$lib/components/mgmt-dashboard/email-automation/types';

  let { data }: { data: PageData } = $props();

  const operations: ReviewOperations = {
    saveNotes: (payload) => saveEmailAutomationReviewNotesNow(payload),
    markDone: (payload) => markEmailAutomationReviewDoneNow(payload),
    dismiss: (payload) => dismissEmailAutomationReviewAsIrrelevantNow(payload),
    reopen: (payload) => reopenEmailAutomationReviewNow(payload),
    addSenderToIgnoredList: (payload) => addEmailAutomationReviewSenderToIgnoredListNow(payload),
    retryAction: (payload) => retryEmailAutomationActionNow(payload),
    reconcileAction: (payload) => reconcileEmailAutomationActionNow(payload),
    retryNotification: (payload) => retryEmailAutomationNotificationNow(payload)
  };
</script>

<SingleEmailReview detail={data} variant="route" {operations} onRefresh={() => invalidateAll()} />
