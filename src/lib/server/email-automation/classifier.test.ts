import { describe, expect, it } from 'vitest';
import { classifyEmail, classifyEmailWithDiagnostics, createEmailAutomationHash, extractDescription, extractReference, matchesClassificationRule, shouldCreateLedgerExpense, type EmailAutomationInput, type EmailClassificationRuleInput } from './classifier';

const baseEmail = (overrides: Partial<EmailAutomationInput> = {}): EmailAutomationInput => ({
  receivedAt: '2026-07-11T10:00:00.000Z',
  from: 'K BIZ <KBIZ@kasikornbank.com>',
  to: 'automations@casalumakpg.com',
  subject: 'Result of PromptPay Funds Transfer (Success)',
  messageId: '<message-1@example.test>',
  attachmentCount: 0,
  textBody: 'Reference Number: PPFS260711TEST01 Amount (THB): 123.45',
  mime: { parserVersion: 'test', completeness: 'complete', attachmentCount: 0 },
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

  it('applies the dashboard ignored-sender rule before DB rules', () => {
    const result = classifyEmail(baseEmail({
      from: 'K BIZ <blocked@example.com>',
      attachmentCount: 1,
      mime: { parserVersion: 'test', completeness: 'unsupported', attachmentCount: 1 }
    }), [dbExpenseRule()], ['blocked@example.com']);

    expect(result).toMatchObject({
      classification: 'ignore',
      subtype: 'ignored_sender',
      processingState: 'ignored',
      notify: false,
      matchedRuleName: 'Ignored sender list'
    });
  });

  it('extracts bilingual K BIZ description and reference fields for Ledger mapping', () => {
    const thai = 'หมายเลขอ้างอิง: BILS260715313032359 จำนวนเงิน (บาท): 123.45 บันทึกช่วยจำ: Makto ผู้ทำรายการ: SURISA';
    const english = 'Reference Number: BILS260715313032359 Amount (THB): 123.45 Your Note: Makto User: SURISA';

    expect(extractReference(thai)).toBe('BILS260715313032359');
    expect(extractDescription(thai)).toBe('Makto');
    expect(extractReference(english)).toBe('BILS260715313032359');
    expect(extractDescription(english)).toBe('Makto');

    const result = classifyEmail(baseEmail({ textBody: thai }), [dbExpenseRule({ bodyPatterns: [] })]);
    expect(result).toMatchObject({ description: 'Makto', externalRef: 'BILS260715313032359' });
  });

  it('stores deterministic rule evaluation diagnostics alongside the selected result', () => {
    const result = classifyEmailWithDiagnostics(baseEmail(), [
      { ...dbExpenseRule({ id: 7, priority: 10 }), name: 'First non-match', subjectPattern: 'does not match' },
      { ...dbExpenseRule({ id: 8, priority: 20 }), name: 'Selected rule' }
    ]);

    expect(result.classification.matchedRuleName).toBe('Selected rule');
    expect(result.diagnostics).toMatchObject({ selectedSource: 'database_rule', selectedRuleId: 8, selectedRuleName: 'Selected rule' });
    expect(result.diagnostics.evaluatedRules).toEqual([
      expect.objectContaining({ id: 7, priority: 10, name: 'First non-match', patternMatched: false, usable: false }),
      expect.objectContaining({ id: 8, priority: 20, name: 'Selected rule', patternMatched: true, usable: true })
    ]);
  });

  it('prefers the extracted latest body over quoted legacy fields for rule matching', () => {
    const result = classifyEmail(baseEmail({
      extractedBody: 'Reference Number: LATEST123 Amount (THB): 45.00',
      textBody: 'Reference Number: OLD999 Amount (THB): 999.00'
    }), [dbExpenseRule({ bodyPatterns: ['LATEST123'] })]);

    expect(result).toMatchObject({ processingState: 'ready', externalRef: 'LATEST123', amountMinor: 4500 });
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

  it('does not change when only the parsed body improves for a Message-ID event', () => {
    expect(createEmailAutomationHash(baseEmail({ extractedBody: 'first parsed body' })))
      .toBe(createEmailAutomationHash(baseEmail({ extractedBody: 'improved parsed body' })));
  });
});
