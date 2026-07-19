import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SingleEmailReview from './SingleEmailReview.svelte';
import type { EmailAutomationEventDetail } from '$lib/server/email-automation/dashboard';
import type { ReviewOperations } from './types';

vi.mock('svelte-sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn()
  }
}));

const detail = {
  event: {
    id: 42,
    receivedAt: '2026-07-19T09:00:00.000Z',
    messageId: null,
    fromAddress: 'Sender <sender@example.test>',
    toAddress: 'automations@example.test',
    subject: 'Review this email',
    attachmentCount: 0,
    classification: 'review',
    subtype: 'unrecognized_email',
    processingState: 'review',
    notificationState: 'not_requested',
    reviewReason: 'No rule matched.',
    externalRef: null,
    amountMinor: null,
    currency: null,
    notionPageId: null,
    authenticityVerdict: 'unverified',
    mimeCompleteness: 'complete',
    parserVersion: 'test',
    actionId: null,
    senderEmail: 'sender@example.test',
    ledgerUrl: null,
    bodyPreview: '<script>alert("x")</script>',
    bodyPreviewSource: 'text',
    bodyPreviewTruncated: false,
    classifierRuleDraft: '{"enabled":false}'
  },
  actions: [],
  outbox: [],
  attempts: [],
  audits: [],
  review: {
    id: 7,
    eventId: 42,
    status: 'waiting',
    reasonCode: 'classifier_review',
    reason: 'No rule matched.',
    evidenceSnapshot: {},
    classifierDiagnostics: {},
    analysis: 'Existing analysis',
    summary: 'Existing summary',
    analysisProvenance: {},
    createdAt: '2026-07-19T09:00:00.000Z',
    updatedAt: '2026-07-19T09:00:00.000Z',
    completedAt: null,
    triage: { needsFullBody: false, disposition: null, revision: 3 },
    bundle: '# bounded review bundle'
  },
  outcome: {
    whatHappened: 'The email needs review.',
    actionTaken: 'No external action ran.',
    currentState: 'Waiting for a manager.',
    nextStep: 'A manager should review it.',
    isActionRequired: true
  }
} as EmailAutomationEventDetail;

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

describe('SingleEmailReview', () => {
  it('renders untrusted body content as text and saves the current optimistic revision', async () => {
    const reviewOperations = operations();
    const screen = render(SingleEmailReview, {
      detail,
      variant: 'modal',
      operations: reviewOperations,
      onRefresh: vi.fn(async () => {})
    });

    await expect.element(screen.getByText('<script>alert("x")</script>', { exact: true })).toBeVisible();
    expect(screen.container.querySelector('pre script')).toBeNull();

    await screen.getByRole('textbox', { name: 'Analysis / triage guidance' }).fill('Updated analysis');
    await screen.getByRole('button', { name: 'Save notes' }).click();

    await vi.waitFor(() => expect(reviewOperations.saveNotes).toHaveBeenCalledWith({
      reviewId: 7,
      analysis: 'Updated analysis',
      summary: 'Existing summary',
      needsFullBody: false,
      expectedRevision: 3
    }));
    expect(reviewOperations.retryAction).not.toHaveBeenCalled();
    expect(reviewOperations.retryNotification).not.toHaveBeenCalled();
  });
});
