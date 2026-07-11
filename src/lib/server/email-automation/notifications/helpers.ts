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

/** A labelled <b>label</b>\nvalue block, or null when value is empty. */
export const detailBlock = (label: string, value?: string | null) => value
  ? `<b>${label}</b>\n${value}`
  : null;

export const ledgerDefaults = (classification: EmailClassification) => classification.ledgerDefaults && typeof classification.ledgerDefaults === 'object'
  ? classification.ledgerDefaults as { ledgerType?: string; bankAccount?: string; paymentMethod?: string; category?: string; department?: string; supplierId?: string }
  : {};
