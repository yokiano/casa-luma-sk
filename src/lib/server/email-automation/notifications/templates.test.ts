import { describe, expect, it } from 'vitest';
import type { EmailAutomationInput, EmailClassification } from '../classifier';
import {
  actionReadyTemplate,
  expenseRecordedTemplate,
  ignoredTemplate,
  notificationTemplateByKind,
  renderEmailAutomationNotification,
  renderTestEmailAutomationNotification,
  reviewNeededTemplate,
  selectTemplateKind
} from './index';

const input: EmailAutomationInput = {
  receivedAt: '2026-07-11T10:00:00.000Z',
  from: 'K BIZ <KBIZ@kasikornbank.com>',
  to: 'automations@casalumakpg.com',
  subject: 'Result of PromptPay Funds Transfer (Success)',
  messageId: '<template-test@example.test>',
  attachmentCount: 0,
  textBody: 'Reference Number: PPFS260711TEST01 Amount (THB): 123.45'
};

const readyExpense: EmailClassification = {
  classification: 'expense',
  subtype: 'promptpay_transfer_success',
  processingState: 'ready',
  externalRef: 'PPFS260711TEST01',
  amountMinor: 12345,
  currency: 'THB',
  notify: true,
  handlerKey: 'company_ledger_expense'
};

const reviewClassification: EmailClassification = {
  classification: 'review',
  subtype: 'kshop_settlement_failed',
  processingState: 'review',
  reviewReason: 'K SHOP settlement was not deposited.',
  notify: true,
  handlerKey: 'notify_only'
};

const ignoredClassification: EmailClassification = {
  classification: 'ignore',
  subtype: 'approved_shadow',
  processingState: 'ignored',
  externalRef: 'PPFS260711TEST01',
  amountMinor: 12345,
  currency: 'THB',
  notify: false,
  handlerKey: 'none'
};

const blocks = (message: string) => message.split('\n\n');

describe('notification templates', () => {
  it('renders the expense-recorded template when a Ledger page exists', () => {
    const message = renderEmailAutomationNotification(input, readyExpense, 'notion-page-abc');
    expect(blocks(message)[0]).toBe('<b>✅ Expense recorded</b>');
    expect(message).toContain('THB 123.45');
    expect(message).toContain('<code>PPFS260711TEST01</code>');
    expect(message).toContain('<code>notion-page-abc</code>');
  });

  it('renders the action-ready template for ready expenses without a Ledger page', () => {
    const message = renderEmailAutomationNotification(input, readyExpense);
    expect(blocks(message)[0]).toBe('<b>✅ Action ready</b>');
    expect(message).toContain('Ledger creation is disabled in automation settings.');
    expect(message).not.toContain('notion-page-abc');
  });

  it('renders the review-needed template for review classifications', () => {
    const message = renderEmailAutomationNotification(input, reviewClassification);
    expect(blocks(message)[0]).toBe('<b>🔎 Review needed</b>');
    expect(message).toContain('Kshop Settlement Failed');
    expect(message).toContain('K SHOP settlement was not deposited.');
  });

  it('renders the ignored template for ignore classifications (preview only)', () => {
    const message = renderEmailAutomationNotification(input, ignoredClassification);
    expect(blocks(message)[0]).toBe('<b>🤫 Ignored</b>');
    expect(message).toContain('Matched an ignore rule.');
  });

  it('selects the right template kind for each outcome', () => {
    expect(selectTemplateKind(readyExpense, 'page')).toBe('expenseRecorded');
    expect(selectTemplateKind(readyExpense)).toBe('actionReady');
    expect(selectTemplateKind(reviewClassification)).toBe('reviewNeeded');
    expect(selectTemplateKind(ignoredClassification)).toBe('ignored');
  });

  it('keeps every registered template aligned with its kind', () => {
    expect(notificationTemplateByKind.expenseRecorded).toBe(expenseRecordedTemplate);
    expect(notificationTemplateByKind.actionReady).toBe(actionReadyTemplate);
    expect(notificationTemplateByKind.reviewNeeded).toBe(reviewNeededTemplate);
    expect(notificationTemplateByKind.ignored).toBe(ignoredTemplate);
  });

  it('wraps the production render with a TEST banner for dashboard previews', () => {
    const rendered = renderEmailAutomationNotification(input, readyExpense);
    const message = renderTestEmailAutomationNotification(input, readyExpense);
    expect(blocks(message)[0]).toBe('<b>🧪 TEST — dashboard preview</b>');
    expect(message).toBe(`<b>🧪 TEST — dashboard preview</b>\n\n${rendered}`);
  });

  it('escapes HTML in review reasons and email metadata', () => {
    const dangerous: EmailClassification = {
      classification: 'review',
      subtype: 'unrecognized_email',
      processingState: 'review',
      reviewReason: '<script>alert("x")</script>',
      notify: true
    };
    const dangerousInput: EmailAutomationInput = { ...input, from: 'a<b>@c.com', subject: 'x & y' };
    const message = renderEmailAutomationNotification(dangerousInput, dangerous);
    expect(message).not.toContain('<script>');
    expect(message).toContain('&lt;script&gt;');
    expect(message).toContain('a&lt;b&gt;@c.com');
    expect(message).toContain('x &amp; y');
  });
});
