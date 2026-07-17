import type { EmailAutomationInput, EmailClassification } from '../classifier';
import { detailBlock, escapeHtml, extractedDetailBlocks, humanSubtype, notionPageUrl, notificationTitle } from './helpers';

/**
 * Modular Telegram notification templates for email automation.
 *
 * Each template returns the ordered list of message blocks (lines) for one
 * notification kind. A block is either a string or null; nulls are filtered out
 * by the renderer, so templates can freely omit optional sections.
 *
 * Kinds currently produced by the automation flow:
 *  - expenseRecorded  : a Ledger page was created (notionPageId present)
 *  - actionReady      : classified and ready, but side effects are still disabled
 *  - reviewNeeded     : needs a human decision before any automation runs
 *  - ignored          : intentionally quiet (shown in dashboard previews only;
 *                       production never sends these because notify=false)
 *
 * To add a new template: add a function here, register it in
 * `notificationTemplateByKind`, and map the classification to its kind in
 * `render.ts` (`selectTemplate`).
 */

export type NotificationKind = 'expenseRecorded' | 'actionReady' | 'reviewNeeded' | 'ignored';

export type NotificationTemplate = (
  input: EmailAutomationInput,
  classification: EmailClassification,
  notionPageId?: string
) => (string | null)[];

const emailBlock = (input: EmailAutomationInput) => detailBlock(
  'Email',
  `${escapeHtml(input.from)}\n${escapeHtml(input.subject)}`
);

export const expenseRecordedTemplate: NotificationTemplate = (_input, classification, notionPageId) => [
  `<b>${notificationTitle(classification.classification, 'recorded')}</b>`,
  ...extractedDetailBlocks(classification),
  detailBlock('What happened', `Email classified as ${humanSubtype(classification.subtype)}`),
  detailBlock('Action taken', 'Financial Ledger page was created.'),
  detailBlock('Current state', 'Action succeeded.'),
  detailBlock('Ledger page', notionPageId ? `${notionPageUrl(notionPageId) ? `<a href="${notionPageUrl(notionPageId)}">Open Ledger page</a>\n` : ''}<code>${escapeHtml(notionPageId)}</code>` : null),
  emailBlock(_input),
  detailBlock('Next step', 'Ledger page was created. Please attach the receipt or invoice if needed.')
];

export const actionReadyTemplate: NotificationTemplate = (input, classification) => {
  const handlerIsLedger = classification.handlerKey === 'company_ledger_expense';
  const nextStep = handlerIsLedger
    ? 'Ledger creation is disabled in automation settings. Review this email, then enable Ledger writes when ready.'
    : 'Review the matched automation handler before enabling side effects.';
  return [
    `<b>${notificationTitle(classification.classification, 'ready')}</b>`,
    ...extractedDetailBlocks(classification),
    detailBlock('What happened', `Email classified as ${humanSubtype(classification.subtype)}`),
    detailBlock('Action taken', 'No external action has run.'),
    detailBlock('Current state', 'Action is ready but not queued because Ledger writes are disabled.'),
    emailBlock(input),
    detailBlock('Next step', nextStep)
  ];
};

export const reviewNeededTemplate: NotificationTemplate = (input, classification) => [
  `<b>${notificationTitle(classification.classification, 'review needed')}</b>`,
  ...extractedDetailBlocks(classification),
  detailBlock('What happened', `Email classified as ${humanSubtype(classification.subtype)}`),
  detailBlock('Action taken', 'No external action was run.'),
  detailBlock('Current state', 'Waiting for manager review.'),
  detailBlock('Why', classification.reviewReason ? escapeHtml(classification.reviewReason) : null),
  emailBlock(input),
  detailBlock('Next step', 'Please review this email before any automation runs.')
];

export const ignoredTemplate: NotificationTemplate = (input, classification) => [
  `<b>${notificationTitle(classification.classification, 'ignored')}</b>`,
  ...extractedDetailBlocks(classification),
  detailBlock('What happened', `Email classified as ${humanSubtype(classification.subtype)}`),
  detailBlock('Action taken', 'No external action was run.'),
  detailBlock('Current state', 'Ignored.'),
  detailBlock('Why', classification.reviewReason ? escapeHtml(classification.reviewReason) : 'Matched an ignore rule. No notification or side effect is produced.'),
  emailBlock(input)
];

export const notificationTemplateByKind: Record<NotificationKind, NotificationTemplate> = {
  expenseRecorded: expenseRecordedTemplate,
  actionReady: actionReadyTemplate,
  reviewNeeded: reviewNeededTemplate,
  ignored: ignoredTemplate
};
