import type { AuthenticityVerdict, EmailActionState, EmailAutomationOutcomeView, EmailNotificationState } from './types';

export type OutcomeFacts = {
  classification: string;
  subtype: string;
  processingState: string;
  actionState?: EmailActionState | null;
  notificationState?: EmailNotificationState | null;
  authenticityVerdict?: AuthenticityVerdict | null;
  reviewReason?: string | null;
  externalObjectId?: string | null;
};

const humanize = (value: string) => value.replaceAll('_', ' ');

/** Shared dashboard/Telegram truth. Never describe a queued action as completed. */
export const buildEmailAutomationOutcome = (facts: OutcomeFacts): EmailAutomationOutcomeView => {
  const happened = facts.processingState === 'ignored'
    ? `This email was intentionally ignored as ${humanize(facts.subtype)}.`
    : facts.processingState === 'review'
      ? `This email needs review: ${facts.reviewReason || humanize(facts.subtype)}.`
      : `This email was classified as ${humanize(facts.subtype)}.`;
  const auth = facts.authenticityVerdict && facts.authenticityVerdict !== 'passed'
    ? ` Sender authenticity is ${facts.authenticityVerdict}.`
    : '';
  const safetyBlocked = facts.actionState === 'failed' && facts.processingState === 'review' && /safety-locked|authenticity enforcement|canary blocked|canary is not active|not active/i.test(facts.reviewReason ?? '');
  const action = facts.actionState === 'succeeded' || facts.actionState === 'reconciled'
    ? `The configured action completed${facts.externalObjectId ? ` (external record ${facts.externalObjectId})` : ''}.`
    : facts.actionState === 'claimed'
      ? 'The configured action is being processed.'
      : facts.actionState === 'pending'
        ? 'The configured action is queued; no external change has happened yet.'
        : facts.actionState === 'retry_scheduled'
          ? 'The action did not complete and was scheduled for a safe retry.'
          : safetyBlocked
            ? 'The action was safety-blocked before any external change was made.'
            : facts.actionState === 'failed'
              ? 'The action stopped after its retry limit. No further automatic action will run.'
            : facts.actionState === 'cancelled'
              ? 'No action was run because the action was cancelled.'
              : 'No external action was run.';
  const state = `${humanize(facts.processingState)}${facts.actionState ? ` · action ${humanize(facts.actionState)}` : ''}${facts.notificationState ? ` · notification ${humanize(facts.notificationState)}` : ''}.${auth}`;
  const nextStep = safetyBlocked
    ? 'A manager should inspect the original email. Ledger automation runs only inside the explicit canary gates until sender-authenticity enforcement is implemented.'
    : facts.actionState === 'failed'
      ? 'A manager should open this event, inspect the attempt history, then retry or reconcile it.'
    : facts.actionState === 'retry_scheduled'
      ? 'Wait for a due retry or have a manager retry this action from the event page.'
      : facts.notificationState === 'failed'
        ? 'A manager should retry only the notification from the event page.'
        : facts.processingState === 'review'
          ? 'A manager should open this event and verify the original evidence. No automated financial action is available.'
          : facts.actionState === 'pending' || facts.actionState === 'claimed'
            ? 'No duplicate action is needed. Open the event only if the work remains pending unexpectedly.'
            : 'No action is needed.';
  return { whatHappened: happened, actionTaken: action, currentState: state, nextStep, isActionRequired: /manager should|wait for/i.test(nextStep) };
};
