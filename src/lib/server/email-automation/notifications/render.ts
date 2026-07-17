import type { EmailAutomationInput, EmailClassification } from '../classifier';
import { notificationTemplateByKind, type NotificationKind } from './templates';
import { detailBlock, escapeHtml, extractedDetailBlocks, humanSubtype, notionPageUrl, notificationTitle } from './helpers';

const safeExternalLink = (label: string, url?: string | null) => url && /^https:\/\//i.test(url)
  ? `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`
  : null;

/**
 * Selects the notification kind for a classification outcome.
 *
 * - `expenseRecorded` wins when a Ledger page was created (notionPageId).
 * - `actionReady` for processingState `ready` with no Ledger page yet.
 * - `ignored` for the `ignore` classification (preview-only; production never
 *   sends these because `notify` is false).
 * - `reviewNeeded` for everything else.
 */
export const selectTemplateKind = (classification: EmailClassification, notionPageId?: string): NotificationKind => {
  if (notionPageId) return 'expenseRecorded';
  if (classification.processingState === 'ready') return 'actionReady';
  if (classification.classification === 'ignore') return 'ignored';
  return 'reviewNeeded';
};

/**
 * Selects the template kind for a *simulated* outcome (dashboard Send test).
 * Unlike `selectTemplateKind`, this does not require a real Ledger page: when
 * the classification is a ready expense and Ledger writes are enabled in
 * settings, it renders the `expenseRecorded` template so the preview matches
 * what production WOULD send. No actual Ledger page is created by the test.
 */
export const selectTemplateKindForSimulation = (
  classification: EmailClassification,
  ledgerEnabled: boolean
): NotificationKind => {
  if (classification.processingState === 'ready'
    && classification.classification === 'expense'
    && classification.handlerKey === 'company_ledger_expense'
    && ledgerEnabled) {
    return 'expenseRecorded';
  }
  return selectTemplateKind(classification);
};

export const renderEmailAutomationNotification = (
  input: EmailAutomationInput,
  classification: EmailClassification,
  notionPageId?: string
): string => {
  const kind = selectTemplateKind(classification, notionPageId);
  const template = notificationTemplateByKind[kind];
  return template(input, classification, notionPageId).filter(Boolean).join('\n\n');
};

/**
 * Renders the notification that WOULD be sent under the given settings, without
 * creating any side effects. Used by the dashboard Send-test button so the
 * preview matches production behavior (e.g. shows "Expense recorded" when
 * Ledger is enabled, not the "Ledger disabled" message).
 */
export const renderSimulatedEmailAutomationNotification = (
  input: EmailAutomationInput,
  classification: EmailClassification,
  ledgerEnabled: boolean
): string => {
  const kind = selectTemplateKindForSimulation(classification, ledgerEnabled);
  const template = notificationTemplateByKind[kind];
  return template(input, classification).filter(Boolean).join('\n\n');
};

/**
 * Wraps the simulated render with a visible "TEST" banner so demo messages sent
 * from the dashboard are obviously not real automation output.
 */
export type DurableNotificationOutcome = {
  actionStatus?: string | null;
  externalObjectId?: string | null;
  externalUrl?: string | null;
  actionMessage?: string | null;
  processingState?: string | null;
  reviewReason?: string | null;
  dashboardUrl?: string;
};

/** Renders persisted action truth. It never infers success from classification. */
export const renderDurableEmailAutomationNotification = (
  input: EmailAutomationInput,
  classification: EmailClassification,
  outcome: DurableNotificationOutcome
) => {
  const status = outcome.actionStatus ?? (classification.processingState === 'review' ? 'review' : 'no_action');
  const succeeded = status === 'succeeded' || status === 'reconciled';
  const safetyBlocked = status === 'failed' && /safety-locked|safety.blocked|authenticity enforcement|canary blocked|canary is not active|not active/i.test(outcome.actionMessage ?? '');
  const actionTaken = status === 'succeeded'
    ? outcome.externalObjectId
      ? `Financial Ledger record created (${escapeHtml(outcome.externalObjectId)}).`
      : (outcome.actionMessage ? escapeHtml(outcome.actionMessage) : 'The notification-only action completed; no external system change was configured.')
    : status === 'reconciled'
      ? outcome.externalObjectId
        ? `Existing Financial Ledger record verified and linked (${escapeHtml(outcome.externalObjectId)}).`
        : (outcome.actionMessage ? escapeHtml(outcome.actionMessage) : 'The action was reconciled; no external record was required.')
      : status === 'retry_scheduled'
        ? 'The external action did not complete and a retry was scheduled.'
        : safetyBlocked
          ? 'The action was safety-blocked before any external change was made.'
          : status === 'failed'
            ? 'The external action failed permanently; no further automatic retry will run.'
            : 'No external action was run.';
  const nextStep = succeeded ? 'No action is needed.'
    : status === 'retry_scheduled' ? 'A manager should open the event and wait for or trigger the safe retry.'
    : safetyBlocked ? 'A manager should inspect the original email. Ledger automation runs only inside the explicit canary gates until sender-authenticity enforcement is implemented.'
    : status === 'failed' ? 'A manager should open the event, inspect the attempt, then retry or reconcile.'
    : 'A manager should open the event and review the evidence before acting.';
  const titleState = succeeded ? 'recorded' as const
    : status === 'retry_scheduled' ? 'retry scheduled' as const
    : status === 'failed' ? 'action failed' as const
    : outcome.processingState === 'review' || status === 'review' ? 'review needed' as const
    : 'ready' as const;
  const externalRecordUrl = outcome.externalUrl ?? (classification.handlerKey === 'company_ledger_expense' ? notionPageUrl(outcome.externalObjectId) : null);
  const externalRecordLabel = classification.handlerKey === 'company_ledger_expense' ? 'Open Ledger record' : 'Open external record';
  return [
    `<b>${notificationTitle(classification.classification, titleState)}</b>`,
    ...extractedDetailBlocks(classification),
    detailBlock('What happened', outcome.processingState === 'review' && outcome.reviewReason
      ? `Email needs review: ${escapeHtml(outcome.reviewReason)}`
      : `Email classified as ${humanSubtype(classification.subtype)}.`),
    detailBlock('Action taken', actionTaken),
    detailBlock('Current state', status.replaceAll('_', ' ')),
    detailBlock('Next step', nextStep),
    detailBlock(externalRecordLabel, safeExternalLink(externalRecordLabel, externalRecordUrl)),
    outcome.dashboardUrl ? detailBlock('Open event', `<a href="${escapeHtml(outcome.dashboardUrl)}">Management dashboard</a>`) : null,
    detailBlock('Email', `${escapeHtml(input.from)}\n${escapeHtml(input.subject)}`)
  ].filter(Boolean).join('\n\n');
};

export const renderTestEmailAutomationNotification = (
  input: EmailAutomationInput,
  classification: EmailClassification,
  ledgerEnabled = false
): string => [
  '<b>🧪 TEST — dashboard preview</b>',
  renderSimulatedEmailAutomationNotification(input, classification, ledgerEnabled)
].join('\n\n');
