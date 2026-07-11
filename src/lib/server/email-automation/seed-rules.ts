import type { EmailAutomationInput, EmailClassificationRuleInput } from './classifier';

/**
 * Default `email_classification_rules` rows, seeded by migration
 * `drizzle/0005_email_classification_rules_dummy_input.sql`.
 *
 * These mirror the built-in matchers in `classifier.ts` (`builtInClassify`).
 * The array is ordered by priority to mirror the built-in match order. The DB
 * rules run first by priority; once they are proven in production the
 * duplicated built-in matchers are meant to be removed from code, leaving only
 * the catch-all `unrecognized_*` fallback in `builtInClassify`. See the
 * deprecation note in `classifier.ts`.
 *
 * Keep this array in sync with the INSERT statements in migration 0005. The
 * `seed-rules.test.ts` suite guards the equivalence between these DB rules and
 * the built-in classifier.
 */
export type SeedClassificationRule = EmailClassificationRuleInput & {
  priority: number;
  dummyInput: EmailAutomationInput;
  description: string;
};

const kbizExpense = (subtype: string): Pick<EmailClassificationRuleInput, 'classification' | 'handlerKey' | 'ledgerDefaults'> => ({
  classification: 'expense',
  handlerKey: 'company_ledger_expense',
  ledgerDefaults: { bankAccount: 'KBank' }
});

export const SEED_CLASSIFICATION_RULES: SeedClassificationRule[] = [
  {
    priority: 10,
    name: 'Approved companion message',
    classification: 'ignore',
    subtype: 'approved_shadow',
    senderPattern: 'kasikornbank.com',
    subjectPattern: 'regex:Status .*\\(Approved\\)',
    bodyPatterns: [],
    handlerKey: 'none',
    ledgerDefaults: {},
    notifyPolicy: 'never',
    description: 'The "Status ... (Approved)" companion to a transfer. Stored as ignored and never notifies.',
    dummyInput: {
      receivedAt: '2026-07-07T17:51:30.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Status of Promptpay Funds Transfer (Approved)',
      messageId: '<seed-approved-shadow@example.test>',
      attachmentCount: 0,
      textBody: 'Reference Number: PPFS260707254721403 Amount (THB): 4,000.00'
    }
  },
  {
    ...kbizExpense('bill_payment_success'),
    priority: 20,
    name: 'Bill payment / top-up success',
    subtype: 'bill_payment_success',
    senderPattern: 'kasikornbank.com',
    subjectPattern: 'regex:Result of Bill Payment/Top-Up \\(Success\\)',
    bodyPatterns: [],
    notifyPolicy: 'review_and_success',
    description: 'K BIZ bill payment / top-up success result. Routes to the Ledger handler when enabled.',
    dummyInput: {
      receivedAt: '2026-07-09T10:06:05.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Result of Bill Payment/Top-Up (Success)',
      messageId: '<seed-bill-payment-success@example.test>',
      attachmentCount: 0,
      textBody: 'Reference Number: BILS260709267019809 Amount (THB): 5,776.31'
    }
  },
  {
    ...kbizExpense('other_bank_transfer_success'),
    priority: 30,
    name: 'Other-bank transfer success',
    subtype: 'other_bank_transfer_success',
    senderPattern: 'kasikornbank.com',
    subjectPattern: 'regex:Result of Other Account Funds Transfer \\(Other Bank\\) \\(Success\\)',
    bodyPatterns: [],
    notifyPolicy: 'review_and_success',
    description: 'K BIZ transfer to another bank success result. Routes to the Ledger handler when enabled.',
    dummyInput: {
      receivedAt: '2026-07-09T10:03:54.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Result of Other Account Funds Transfer (Other Bank) (Success)',
      messageId: '<seed-other-bank-success@example.test>',
      attachmentCount: 0,
      textBody: 'Reference Number: TRTS260709267002259 Amount (THB): 1,025.00'
    }
  },
  {
    ...kbizExpense('promptpay_transfer_success'),
    priority: 40,
    name: 'PromptPay transfer success',
    subtype: 'promptpay_transfer_success',
    senderPattern: 'kasikornbank.com',
    subjectPattern: 'regex:Result of PromptPay Funds Transfer \\(Success\\)',
    bodyPatterns: [],
    notifyPolicy: 'review_and_success',
    description: 'K BIZ PromptPay transfer success result. Routes to the Ledger handler (Scan Expense) when enabled.',
    dummyInput: {
      receivedAt: '2026-07-07T17:51:30.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Result of PromptPay Funds Transfer (Success)',
      messageId: '<seed-promptpay-success@example.test>',
      attachmentCount: 0,
      textBody: 'Reference Number: PPFS260707254721403 Amount (THB): 4,000.00'
    }
  },
  {
    priority: 50,
    name: 'K SHOP settlement failure',
    classification: 'review',
    subtype: 'kshop_settlement_failed',
    senderPattern: 'kasikornbank.com',
    subjectPattern: null,
    bodyPatterns: { mode: 'all', patterns: ['regex:could not be deposited|deposit.*failed', 'regex:K\\s*SHOP'] },
    handlerKey: 'notify_only',
    ledgerDefaults: {},
    notifyPolicy: 'review_only',
    description: 'K SHOP settlement that could not be deposited. Needs human review and notifies the group.',
    dummyInput: {
      receivedAt: '2026-07-08T08:00:00.000Z',
      from: 'KSHOP <KPLUSSHOP@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'เรียน ร้านค้า K SHOP CASA LUMA',
      messageId: '<seed-kshop-settlement-failed@example.test>',
      attachmentCount: 0,
      textBody: 'The settlement amount could not be deposited. K SHOP settlement is pending review.'
    }
  },
  {
    priority: 60,
    name: 'Merchant fee failure',
    classification: 'review',
    subtype: 'merchant_fee_failed',
    senderPattern: 'kasikornbank.com',
    subjectPattern: null,
    bodyPatterns: { mode: 'all', patterns: ['regex:fee.*(?:failed|unsuccessful)|(?:failed|unsuccessful).*fee', 'regex:merchant'] },
    handlerKey: 'notify_only',
    ledgerDefaults: {},
    notifyPolicy: 'review_only',
    description: 'EDC/mini EDC monthly merchant fee that failed. Needs human review and notifies the group.',
    dummyInput: {
      receivedAt: '2026-07-08T08:00:00.000Z',
      from: 'K-MERCHANT FEE <K-MERCHANT_FEE@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'แจ้งเตือนการชำระค่าธรรมเนียมรายเดือนเครื่อง EDC/mini EDC ไม่สำเร็จ',
      messageId: '<seed-merchant-fee-failed@example.test>',
      attachmentCount: 0,
      textBody: 'The monthly merchant fee was unsuccessful. EDC fee failed and needs review.'
    }
  },
  {
    priority: 70,
    name: 'Security / admin / OTP',
    classification: 'ignore',
    subtype: 'security_or_admin',
    senderPattern: 'kasikornbank.com',
    subjectPattern: null,
    bodyPatterns: { mode: 'any', patterns: ['otp', 'login', 'regex:sign.?in', 'email address change', 'terms of service'] },
    handlerKey: 'none',
    ledgerDefaults: {},
    notifyPolicy: 'never',
    description: 'Login notifications, OTP, email-change approvals, and terms-of-service mail. Stored as ignored.',
    dummyInput: {
      receivedAt: '2026-07-08T09:00:00.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Notification for login to K BIZ (via K BIZ Web/K BIZ Application)',
      messageId: '<seed-security-or-admin@example.test>',
      attachmentCount: 0,
      textBody: 'Login notification. One Time Password (OTP) for K BIZ access.'
    }
  },
  {
    priority: 80,
    name: 'Statement / e-document / renewal',
    classification: 'review',
    subtype: 'statement_or_attachment',
    senderPattern: null,
    subjectPattern: null,
    bodyPatterns: { mode: 'any', patterns: ['statement', 'e-document', 'subscription renewal'] },
    handlerKey: 'notify_only',
    ledgerDefaults: {},
    notifyPolicy: 'review_only',
    description: 'Bank statements, e-documents, and subscription renewal notices. Needs a person to decide if actionable.',
    dummyInput: {
      receivedAt: '2026-07-01T08:00:00.000Z',
      from: 'K-eDocument <K-ElectronicDocument@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'E-document (K-Deposit Statement) for the period of June 1, 2026-June 30, 2026.',
      messageId: '<seed-statement-or-attachment@example.test>',
      attachmentCount: 0,
      textBody: 'Your e-document statement is now available for download.'
    }
  }
];
