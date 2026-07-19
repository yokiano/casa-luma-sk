import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PendingReviewCard from './PendingReviewCard.svelte';
import type { EmailAutomationEventDetail, ReviewQueueItem } from '$lib/server/email-automation/dashboard';
import type { ReviewOperations } from './types';

vi.mock('svelte-sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

const review: ReviewQueueItem = {
  id: 7,
  eventId: 42,
  status: 'waiting',
  reasonCode: 'classifier_review',
  reason: 'No rule matched this email. Review stays separate from external queues.',
  analysis: 'Existing analysis',
  summary: 'Existing summary',
  needsFullBody: false,
  revision: 3,
  createdAt: '2026-07-19T09:00:00.000Z' as unknown as Date,
  updatedAt: '2026-07-19T09:00:00.000Z' as unknown as Date,
  subject: 'Review this email',
  fromAddress: 'Sender <sender@example.test>',
  classification: 'review',
  subtype: 'unrecognized_email',
  processingState: 'review',
  amountMinor: null,
  currency: null,
  mimeCompleteness: 'complete',
  parserVersion: 'test',
  bodyPreviewTruncated: false
};

const operations = (): ReviewOperations => ({
  saveNotes: vi.fn(async () => ({ nextStep: 'Saved.' })),
  markDone: vi.fn(async () => ({})),
  dismiss: vi.fn(async () => ({})),
  reopen: vi.fn(async () => ({})),
  addSenderToIgnoredList: vi.fn(async () => ({})),
  retryAction: vi.fn(async () => ({})),
  reconcileAction: vi.fn(async () => ({})),
  retryNotification: vi.fn(async () => ({}))
});

describe('PendingReviewCard', () => {
  it('opens quick review from the card while nested controls keep their own behavior', async () => {
    const reviewOperations = operations();
    const onQuickReview = vi.fn();
    const onRefresh = vi.fn(async () => {});
    const clipboard = { writeText: vi.fn(async () => undefined) };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    const loadDetail = vi.fn(async () => ({ review: { bundle: '# bounded review bundle' } }) as EmailAutomationEventDetail);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const screen = render(PendingReviewCard, {
      review,
      operations: reviewOperations,
      onRefresh,
      loadDetail,
      onQuickReview
    });

    await screen.getByRole('button', { name: /open quick review for email/i }).click();
    expect(onQuickReview).toHaveBeenCalledWith(42);

    onQuickReview.mockClear();
    await screen.getByRole('button', { name: 'Copy review bundle' }).click();
    await vi.waitFor(() => expect(loadDetail).toHaveBeenCalledWith(42));
    expect(clipboard.writeText).toHaveBeenCalledWith('# bounded review bundle');
    expect(onQuickReview).not.toHaveBeenCalled();

    await screen.getByRole('button', { name: 'Dismiss as irrelevant' }).click();
    expect(confirm).toHaveBeenCalled();
    expect(onQuickReview).not.toHaveBeenCalled();

    await screen.getByText('Analysis notes').click();
    expect(onQuickReview).not.toHaveBeenCalled();

    await screen.getByRole('textbox', { name: 'Summary' }).fill('Updated summary');
    await screen.getByRole('button', { name: 'Save' }).click();
    await vi.waitFor(() => expect(reviewOperations.saveNotes).toHaveBeenCalledWith({
      reviewId: 7,
      analysis: 'Existing analysis',
      summary: 'Updated summary',
      needsFullBody: false,
      expectedRevision: 3
    }));
    expect(onQuickReview).not.toHaveBeenCalled();

    confirm.mockRestore();
  });
});
