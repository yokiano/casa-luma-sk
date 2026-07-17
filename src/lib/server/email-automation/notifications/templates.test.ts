import { describe, expect, it } from 'vitest';
import type { EmailAutomationInput, EmailClassification } from '../classifier';
import {
  actionReadyTemplate,
  expenseRecordedTemplate,
  ignoredTemplate,
  notificationTemplateByKind,
  renderDurableEmailAutomationNotification,
  renderEmailAutomationNotification,
  renderSimulatedEmailAutomationNotification,
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
    expect(blocks(message)[0]).toBe('<b>✅ Expense email - recorded</b>');
    expect(message).toContain('THB 123.45');
    expect(message).toContain('<code>PPFS260711TEST01</code>');
    expect(message).toContain('<code>notion-page-abc</code>');
  });

  it('links a valid Notion Ledger page ID from the expense template', () => {
    const pageId = '01234567-89ab-cdef-0123-456789abcdef';
    const message = renderEmailAutomationNotification(input, readyExpense, pageId);
    expect(message).toContain('<a href="https://www.notion.so/0123456789abcdef0123456789abcdef">Open Ledger page</a>');
  });

  it('renders the action-ready template for ready expenses without a Ledger page', () => {
    const message = renderEmailAutomationNotification(input, readyExpense);
    expect(blocks(message)[0]).toBe('<b>✅ Expense email - ready</b>');
    expect(message).toContain('Ledger creation is disabled in automation settings.');
    expect(message).not.toContain('notion-page-abc');
  });

  it('puts extracted monetary details immediately after the title', () => {
    const message = renderEmailAutomationNotification(input, {
      ...readyExpense,
      description: 'Makto',
      counterparty: 'Makto merchant',
      ledgerDefaults: { category: 'Food & Groceries' }
    });
    expect(blocks(message).slice(0, 6)).toEqual([
      '<b>✅ Expense email - ready</b>',
      '<b>Amount</b>\nTHB 123.45',
      '<b>Category</b>\nFood &amp; Groceries',
      '<b>Description</b>\nMakto',
      '<b>Counterparty</b>\nMakto merchant',
      '<b>Reference</b>\n<code>PPFS260711TEST01</code>'
    ]);
  });

  it('renders the review-needed template for review classifications', () => {
    const message = renderEmailAutomationNotification(input, reviewClassification);
    expect(blocks(message)[0]).toBe('<b>🔎 Email - review needed</b>');
    expect(message).toContain('Kshop Settlement Failed');
    expect(message).toContain('K SHOP settlement was not deposited.');
  });

  it('renders the ignored template for ignore classifications (preview only)', () => {
    const message = renderEmailAutomationNotification(input, ignoredClassification);
    expect(blocks(message)[0]).toBe('<b>🤫 Email - ignored</b>');
    expect(message).toContain('Matched an ignore rule.');
  });

  it('adds a dashboard link to a durable review notification without claiming success', () => {
    const message = renderDurableEmailAutomationNotification(input, reviewClassification, {
      processingState: 'review',
      reviewReason: reviewClassification.reviewReason,
      dashboardUrl: 'https://www.casalumakpg.com/mgmt-dashboard/email-automation/12'
    });
    expect(blocks(message)[0]).toBe('<b>🔎 Email - review needed</b>');
    expect(message).toContain('<a href="https://www.casalumakpg.com/mgmt-dashboard/email-automation/12">Management dashboard</a>');
    expect(message).toContain('<b>Current state</b>\nreview');
    expect(message).not.toContain('Financial Ledger record created');
  });

  it('puts the durable outcome state in the opening line', () => {
    const message = renderDurableEmailAutomationNotification(input, readyExpense, {
      actionStatus: 'succeeded',
      externalObjectId: 'ledger-page-1',
      externalUrl: 'https://www.notion.so/ledger-page-1'
    });
    expect(blocks(message)[0]).toBe('<b>✅ Expense email - recorded</b>');
    expect(message).toContain('<a href="https://www.notion.so/ledger-page-1">Open Ledger record</a>');
    expect(message).toContain('ledger-page-1');
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

  it('renders the action-ready template when Ledger is disabled (simulation)', () => {
    const message = renderSimulatedEmailAutomationNotification(input, readyExpense, false);
    expect(blocks(message)[0]).toBe('<b>✅ Expense email - ready</b>');
    expect(message).toContain('Ledger creation is disabled in automation settings.');
  });

  it('renders the expense-recorded template when Ledger is enabled (simulation)', () => {
    const message = renderSimulatedEmailAutomationNotification(input, readyExpense, true);
    expect(blocks(message)[0]).toBe('<b>✅ Expense email - recorded</b>');
    expect(message).toContain('Ledger page was created.');
    // No real notionPageId in simulation, so the ledger page block is omitted.
    expect(message).not.toContain('notion-page');
  });

  it('test render respects Ledger enabled setting for ready expenses', () => {
    const disabled = renderTestEmailAutomationNotification(input, readyExpense, false);
    expect(blocks(disabled)[0]).toBe('<b>🧪 TEST — dashboard preview</b>');
    expect(blocks(disabled)[1]).toBe('<b>✅ Expense email - ready</b>');
    expect(disabled).toContain('Ledger creation is disabled');

    const enabled = renderTestEmailAutomationNotification(input, readyExpense, true);
    expect(blocks(enabled)[1]).toBe('<b>✅ Expense email - recorded</b>');
    expect(enabled).not.toContain('Ledger creation is disabled');
  });

  it('simulation does not show expense-recorded for non-ledger ready classifications', () => {
    const notifyOnly: EmailClassification = { ...readyExpense, handlerKey: 'notify_only' };
    const message = renderSimulatedEmailAutomationNotification(input, notifyOnly, true);
    expect(blocks(message)[0]).toBe('<b>✅ Expense email - ready</b>');
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
