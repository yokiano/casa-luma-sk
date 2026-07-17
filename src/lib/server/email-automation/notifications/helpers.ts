import type { EmailClassification } from '../classifier';

/**
 * Shared formatting helpers for email-automation Telegram templates.
 * Kept pure and side-effect free so templates are easy to unit test.
 */

export const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const formatMoney = (amountMinor?: number, currency?: string) => amountMinor === undefined
  ? null
  : `${currency ?? 'THB'} ${(amountMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export const humanSubtype = (subtype: string) => subtype
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const emailClassificationLabel = (classification: EmailClassification['classification']) => classification === 'expense'
  ? 'Expense email'
  : classification === 'income'
    ? 'Income email'
    : 'Email';

export const notificationTitle = (
  classification: EmailClassification['classification'],
  state: 'recorded' | 'ready' | 'review needed' | 'ignored' | 'action failed' | 'retry scheduled'
) => {
  const icon = state === 'recorded' || state === 'ready' ? '✅' : state === 'ignored' ? '🤫' : state === 'action failed' ? '🛑' : '🔎';
  return `${icon} ${emailClassificationLabel(classification)} - ${state}`;
};

/** A labelled <b>label</b>\nvalue block, or null when value is empty. */
export const detailBlock = (label: string, value?: string | null) => value
  ? `<b>${label}</b>\n${value}`
  : null;

export const ledgerDefaults = (classification: EmailClassification) => classification.ledgerDefaults && typeof classification.ledgerDefaults === 'object'
  ? classification.ledgerDefaults as { ledgerType?: string; bankAccount?: string; paymentMethod?: string; category?: string; department?: string; supplierId?: string }
  : {};

/** Stable Notion web URL for a page ID returned by the Notion API. */
export const notionPageUrl = (pageId?: string | null) => {
  const normalized = pageId?.replaceAll('-', '').trim();
  return normalized && /^[a-f0-9]{32}$/i.test(normalized)
    ? `https://www.notion.so/${normalized}`
    : null;
};

/**
 * Keep extracted monetary facts together and near the title. Optional category
 * and description values are populated only when the classifier/runtime has them.
 */
export const extractedDetailBlocks = (classification: EmailClassification) => {
  const defaults = ledgerDefaults(classification);
  return [
    detailBlock('Amount', formatMoney(classification.amountMinor, classification.currency)),
    detailBlock('Category', typeof defaults.category === 'string' ? escapeHtml(defaults.category) : null),
    detailBlock('Description', classification.description ? escapeHtml(classification.description) : null),
    detailBlock('Counterparty', classification.counterparty ? escapeHtml(classification.counterparty) : null),
    detailBlock('Reference', classification.externalRef ? `<code>${escapeHtml(classification.externalRef)}</code>` : null)
  ];
};
