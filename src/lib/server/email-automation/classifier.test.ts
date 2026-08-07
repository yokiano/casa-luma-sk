import { describe, expect, it } from 'vitest';
import { classifyEmail, classifyEmailWithDiagnostics, createEmailAutomationHash, extractCounterparty, extractDescription, extractReference, matchesClassificationRule, shouldCreateLedgerExpense, type EmailAutomationInput, type EmailClassificationRuleInput } from './classifier';

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

const dbKShopRule = (overrides: Partial<EmailClassificationRuleInput> = {}): EmailClassificationRuleInput => ({
  name: 'K SHOP daily settlement income',
  classification: 'income',
  subtype: 'kshop_daily_settlement',
  senderPattern: null,
  subjectPattern: null,
  bodyPatterns: {
    mode: 'all',
    patterns: [
      'regex:K(?:\\s*PLUS)?\\s*SHOP|เค\\s*ช็อป',
      'regex:daily|ประจำวัน',
      'regex:settlement|summary|สรุปยอด|ยอดขาย',
      'regex:completed?|successfully|successful|เรียบร้อย|สำเร็จ'
    ]
  },
  handlerKey: 'financial_ledger_income',
  ledgerDefaults: {
    type: 'Scan Income',
    category: 'Revenue',
    department: 'General',
    bankAccount: 'KBank',
    paymentMethod: 'Scan',
    receiptNotRequired: true
  },
  notifyPolicy: 'review_and_success',
  ...overrides
});

const kShopEmail = (overrides: Partial<EmailAutomationInput> = {}): EmailAutomationInput => ({
  receivedAt: '2026-08-07T03:30:00.000Z',
  from: 'Surisa Surisa <surisa0737@gmail.com>',
  to: 'automations@casalumakpg.com',
  subject: 'Fwd: K SHOP Daily Settlement Summary',
  messageId: '<kshop-classifier@example.test>',
  attachmentCount: 0,
  textBody: [
    '---------- Forwarded message ---------',
    'From: KSHOP <KPLUSSHOP@kasikornbank.com>',
    'Date: Fri, 07 Aug 2026 09:00:00 +0700',
    'Subject: K SHOP Daily Settlement Summary',
    'To: surisa0737@gmail.com',
    '',
    'K SHOP daily settlement summary was completed successfully for CASA LUMA KPG.',
    'Merchant Code: 123456789',
    'ยอดเงินจำนวน(บาท): 12,345.67'
  ].join('\n'),
  mime: { parserVersion: 'test', completeness: 'complete', attachmentCount: 0 },
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

  it('extracts the K BIZ payee separately from the memo used as the Ledger title', () => {
    const billPayment = 'To Account: พะงันค้าเหล็ก Amount (THB): 136.00 Your Note: MG for fix the door Creator: SURISA';
    const otherBank = 'To Account: xxx-x-x4232-xxx Account Name from System: Buppha Chabunrueang Amount (THB): 500.00 Your Note: groceries Creator: SURISA';
    const promptPay = 'To PromptPay ID: xxx-xxx-1484 Payee Name : MISS BORWONLA Amount (THB): 1,000.00 Your Note: Pearl advance Creator: SURISA';

    expect(extractCounterparty(billPayment)).toBe('พะงันค้าเหล็ก');
    expect(extractCounterparty(otherBank)).toBe('Buppha Chabunrueang');
    expect(extractCounterparty(promptPay)).toBe('MISS BORWONLA');

    const result = classifyEmail(baseEmail({ textBody: `Reference Number: BILS260727399185227 ${billPayment}` }), [dbExpenseRule({ bodyPatterns: [] })]);
    expect(result).toMatchObject({
      description: 'MG for fix the door',
      counterparty: 'พะงันค้าเหล็ก',
      externalRef: 'BILS260727399185227',
      amountMinor: 13600
    });
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

  it('classifies a proven K SHOP settlement as income with a deterministic reference', () => {
    const result = classifyEmail(kShopEmail(), [dbKShopRule()]);

    expect(result).toMatchObject({
      classification: 'income',
      subtype: 'kshop_daily_settlement',
      processingState: 'ready',
      externalRef: 'kshop:123456789:2026-08-07',
      amountMinor: 1_234_567,
      currency: 'THB',
      notify: true,
      handlerKey: 'financial_ledger_income',
      ledgerDefaults: expect.objectContaining({ type: 'Scan Income', category: 'Revenue', department: 'General', bankAccount: 'KBank', paymentMethod: 'Scan' })
    });
  });

  it('keeps K SHOP candidates as income+review when exact required data conflicts or is missing', () => {
    const missingMerchant = classifyEmail(kShopEmail({
      textBody: kShopEmail().textBody?.replace('Merchant Code: 123456789\n', '')
    }), [dbKShopRule()]);
    expect(missingMerchant).toMatchObject({ classification: 'income', subtype: 'kshop_daily_settlement', processingState: 'review', notify: true });
    expect(missingMerchant.reviewReason).toMatch(/merchant code/i);

    const conflictingAmount = classifyEmail(kShopEmail({
      textBody: `${kShopEmail().textBody}\nยอดเงินจำนวน(บาท): 99.00`
    }), [dbKShopRule()]);
    expect(conflictingAmount).toMatchObject({ classification: 'income', subtype: 'kshop_daily_settlement', processingState: 'review' });
    expect(conflictingAmount.reviewReason).toMatch(/conflicting/i);

    const wrongVisibleSender = classifyEmail(kShopEmail({ from: 'Other Sender <other@example.com>' }), [dbKShopRule()]);
    expect(wrongVisibleSender).toMatchObject({ classification: 'income', subtype: 'kshop_daily_settlement', processingState: 'review' });
    expect(wrongVisibleSender.reviewReason).toMatch(/visible sender/i);
  });

  it('keeps the K SHOP parser MIME gate independent from generic expense extraction', () => {
    const result = classifyEmail(kShopEmail({
      mime: { parserVersion: 'test', completeness: 'incomplete', attachmentCount: 0 }
    }), [dbKShopRule()]);
    expect(result).toMatchObject({ classification: 'income', subtype: 'kshop_daily_settlement', processingState: 'review' });
    expect(result.reviewReason).toMatch(/incomplete|before acting/i);

    const expense = classifyEmail(baseEmail(), [dbExpenseRule()]);
    expect(expense).toMatchObject({ classification: 'expense', processingState: 'ready', amountMinor: 12345 });
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
