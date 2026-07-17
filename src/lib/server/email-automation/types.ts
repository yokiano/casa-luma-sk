export const EVENT_PROCESSING_STATES = ['received', 'queued', 'linked_existing_action', 'review', 'ignored', 'action_succeeded', 'retry_scheduled', 'failed', 'cancelled', 'reconciled'] as const;
export type EmailEventProcessingState = typeof EVENT_PROCESSING_STATES[number];

export const ACTION_STATES = ['pending', 'claimed', 'succeeded', 'retry_scheduled', 'failed', 'cancelled', 'reconciled'] as const;
export type EmailActionState = typeof ACTION_STATES[number];

export const NOTIFICATION_STATES = ['not_needed', 'pending', 'claimed', 'sent', 'retry_scheduled', 'failed', 'cancelled'] as const;
export type EmailNotificationState = typeof NOTIFICATION_STATES[number];

export const REVIEW_STATES = ['waiting', 'in_progress', 'done'] as const;
export type EmailReviewState = typeof REVIEW_STATES[number];

export const AUTHENTICITY_VERDICTS = ['unverified', 'passed', 'failed', 'indeterminate'] as const;
export type AuthenticityVerdict = typeof AUTHENTICITY_VERDICTS[number];

export type EmailAutomationOutcomeView = {
  whatHappened: string;
  actionTaken: string;
  currentState: string;
  nextStep: string;
  isActionRequired: boolean;
};

const transitions: Record<EmailActionState, readonly EmailActionState[]> = {
  pending: ['claimed', 'cancelled'],
  claimed: ['succeeded', 'retry_scheduled', 'failed', 'reconciled', 'pending'],
  succeeded: ['reconciled'],
  retry_scheduled: ['claimed', 'cancelled'],
  failed: ['pending', 'cancelled', 'reconciled'],
  cancelled: [],
  reconciled: []
};

export const canTransitionAction = (from: EmailActionState, to: EmailActionState) => transitions[from].includes(to);

export const assertActionTransition = (from: EmailActionState, to: EmailActionState) => {
  if (!canTransitionAction(from, to)) throw new Error(`Illegal email automation action transition: ${from} -> ${to}`);
};
