import type { EmailAutomationEventDetail } from '$lib/server/email-automation/dashboard';

export type EmailAutomationReviewDetail = EmailAutomationEventDetail;
export type ReviewRecord = NonNullable<EmailAutomationEventDetail['review']>;
export type ReviewOperationResult = { nextStep?: string };

export type ReviewNotesPayload = {
  reviewId: number;
  analysis: string;
  summary: string;
  needsFullBody: boolean;
  expectedRevision: number;
};

type ReviewNotesTarget =
  | Pick<ReviewRecord, 'id'> & { triage: Pick<ReviewRecord['triage'], 'revision'> }
  | { id: number; revision: number };

export type RecoveryReasonPayload = { reason: string };
export type ActionRecoveryPayload = RecoveryReasonPayload & { actionId: number };
export type NotificationRecoveryPayload = RecoveryReasonPayload & { outboxId: number };

/**
 * The review component owns the UI flow, while the route or a future modal owns
 * the authorized remote command implementations. Keeping these callbacks typed
 * prevents review actions from being accidentally wired to queue mutations.
 */
export type ReviewOperations = {
  saveNotes: (payload: ReviewNotesPayload) => Promise<ReviewOperationResult>;
  markDone: (payload: ReviewNotesPayload) => Promise<ReviewOperationResult>;
  dismiss: (payload: ReviewNotesPayload) => Promise<ReviewOperationResult>;
  reopen: (payload: { reviewId: number }) => Promise<ReviewOperationResult>;
  addSenderToIgnoredList: (payload: { reviewId: number; confirmIgnoredSenderBypassRisk: true }) => Promise<ReviewOperationResult>;
  retryAction: (payload: ActionRecoveryPayload) => Promise<ReviewOperationResult>;
  reconcileAction: (payload: ActionRecoveryPayload) => Promise<ReviewOperationResult>;
  retryNotification: (payload: NotificationRecoveryPayload) => Promise<ReviewOperationResult>;
};

export type SingleEmailReviewProps = {
  detail: EmailAutomationReviewDetail;
  variant?: 'route' | 'modal';
  operations: ReviewOperations;
  onRefresh: () => Promise<void>;
};

export const reviewNotesPayload = (
  review: ReviewNotesTarget,
  analysis: string,
  summary: string,
  needsFullBody: boolean
): ReviewNotesPayload => ({
  reviewId: review.id,
  analysis,
  summary,
  needsFullBody,
  expectedRevision: 'revision' in review ? review.revision : review.triage.revision
});
