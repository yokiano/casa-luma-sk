import type { EmailAutomationInput, EmailClassification } from '../classifier';
import { notificationTemplateByKind, type NotificationKind } from './templates';

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
export const renderTestEmailAutomationNotification = (
  input: EmailAutomationInput,
  classification: EmailClassification,
  ledgerEnabled: boolean
): string => [
  '<b>🧪 TEST — dashboard preview</b>',
  renderSimulatedEmailAutomationNotification(input, classification, ledgerEnabled)
].join('\n\n');
