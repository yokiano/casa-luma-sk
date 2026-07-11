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
 * Wraps the normal render with a visible "TEST" banner so demo messages sent
 * from the dashboard are obviously not real automation output.
 */
export const renderTestEmailAutomationNotification = (
  input: EmailAutomationInput,
  classification: EmailClassification
): string => [
  '<b>🧪 TEST — dashboard preview</b>',
  renderEmailAutomationNotification(input, classification)
].join('\n\n');
