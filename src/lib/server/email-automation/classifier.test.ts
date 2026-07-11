import { describe, expect, it } from 'vitest';
import { classifyEmail, createEmailAutomationHash, matchesClassificationRule, shouldCreateLedgerExpense, type EmailAutomationInput, type EmailClassificationRuleInput } from './classifier';

const baseEmail = (overrides: Partial<EmailAutomationInput> = {}): EmailAutomationInput => ({
  receivedAt: '2026-07-11T10:00:00.000Z',
  from: 'K BIZ <KBIZ@kasikornbank.com>',
  to: 'automations@casalumakpg.com',
  subject: 'Result of PromptPay Funds Transfer (Success)',
  messageId: '<message-1@example.test>',
  attachmentCount: 0,
  textBody: 'Reference Number: PPFS260711TEST01 Amount (THB): 123.45',
  ...overrides
});

const dbExpenseRule = (overrides: Partial<EmailClassificationRuleInput> = {}): EmailClassificationRuleInput => ({
  name: 'DB PromptPay success',
  classification: 'expense',
  subtype: 'db_promptpay_success',
  senderPattern: 'kasikornbank.com',
  subjectPattern: 'PromptPay Funds Transfer',
  bodyPatterns: ['Reference Number', 'Amount (THB)'],
  handlerKey: 'company_ledger_expense',
  notifyPolicy: 'review_and_success',
  ledgerDefaults: { bankAccount: 'KBank' },
  ...overrides
});

describe('email automation classifier', () => {
  it('uses enabled DB-backed rules before built-in defaults', () => {
    const result = classifyEmail(baseEmail(), [dbExpenseRule()]);

    expect(result).toMatchObject({
      classification: 'expense',
      subtype: 'db_promptpay_success',
      processingState: 'ready',
      externalRef: 'PPFS260711TEST01',
      amountMinor: 12345,
      currency: 'THB',
      notify: true,
      handlerKey: 'company_ledger_expense',
      matchedRuleName: 'DB PromptPay success'
    });
  });

  it('requires all body patterns by default and falls back when a DB rule does not match', () => {
    const result = classifyEmail(baseEmail({ textBody: 'Reference Number: PPFS260711TEST01' }), [dbExpenseRule()]);

    expect(result).toMatchObject({
      classification: 'expense',
      subtype: 'promptpay_transfer_success',
      processingState: 'review',
      handlerKey: 'company_ledger_expense'
    });
    expect(result.reviewReason).toContain('amount could not be extracted');
  });

  it('supports any-match body pattern rules for review triage', () => {
    const rule = dbExpenseRule({
      name: 'Statements for review',
      classification: 'review',
      subtype: 'db_statement_or_attachment',
      subjectPattern: 'monthly notice',
      bodyPatterns: { mode: 'any', patterns: ['statement', 'e-document'] },
      notifyPolicy: 'review_only'
    });

    const result = classifyEmail(baseEmail({
      subject: 'Monthly notice',
      textBody: 'Your e-document is available.'
    }), [rule]);

    expect(result).toMatchObject({
      classification: 'review',
      subtype: 'db_statement_or_attachment',
      processingState: 'review',
      notify: true
    });
  });

  it('keeps built-in ignore behavior when no DB rule matches', () => {
    const result = classifyEmail(baseEmail({
      subject: 'Status of PromptPay Funds Transfer (Approved)',
      textBody: 'Reference Number: PPFS260711TEST01 Amount (THB): 123.45'
    }), []);

    expect(result).toMatchObject({
      classification: 'ignore',
      subtype: 'approved_shadow',
      processingState: 'ignored',
      notify: false
    });
  });

  it('matches explicit regex patterns and rejects invalid regex patterns safely', () => {
    expect(matchesClassificationRule(baseEmail(), dbExpenseRule({ subjectPattern: 'regex:^Result of PromptPay' }))).toBe(true);
    expect(matchesClassificationRule(baseEmail(), dbExpenseRule({ subjectPattern: 'regex:(' }))).toBe(false);
  });

  it('only allows ready company-ledger expense classifications through the Ledger side-effect boundary', () => {
    expect(shouldCreateLedgerExpense(classifyEmail(baseEmail(), [dbExpenseRule()]))).toBe(true);
    expect(shouldCreateLedgerExpense(classifyEmail(baseEmail(), [dbExpenseRule({ handlerKey: 'notify_only' })]))).toBe(false);
    expect(shouldCreateLedgerExpense(classifyEmail(baseEmail(), [dbExpenseRule({ classification: 'income' })]))).toBe(false);
    expect(shouldCreateLedgerExpense(classifyEmail(baseEmail({ textBody: 'Reference Number: PPFS260711TEST01' }), [dbExpenseRule()]))).toBe(false);
  });
});

describe('email automation dedupe hash', () => {
  it('normalizes sender, recipients, body whitespace, and message id trimming', () => {
    const first = createEmailAutomationHash(baseEmail({
      from: '  K BIZ <KBIZ@kasikornbank.com> ',
      to: ' Automations@CasaLumaKPG.com ',
      messageId: ' <message-1@example.test> ',
      textBody: 'Reference Number: PPFS260711TEST01\n\nAmount (THB): 123.45'
    }));
    const second = createEmailAutomationHash(baseEmail({
      from: 'k biz <kbiz@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      messageId: '<message-1@example.test>',
      textBody: 'Reference Number: PPFS260711TEST01 Amount (THB): 123.45'
    }));

    expect(first).toBe(second);
  });

  it('changes when the message id changes', () => {
    expect(createEmailAutomationHash(baseEmail({ messageId: '<message-1@example.test>' })))
      .not.toBe(createEmailAutomationHash(baseEmail({ messageId: '<message-2@example.test>' })));
  });
});
