import type { EmailClassification, EmailAutomationInput } from '../classifier';

/**
 * Code registry of the built-in classifier subtypes and their sample email
 * inputs. Used by the dashboard to preview and "Send test" the built-in
 * fallback matchers using the exact same renderer as production.
 *
 * The entries marked `deprecated: true` are mirrored as DB rules in
 * `seed-rules.ts` (migration 0005). The DB rules run first, so those built-in
 * matchers are effectively dead code and slated for removal; they stay here so
 * previews/tests remain available and the equivalence is auditable.
 *
 * The two `deprecated: false` entries (`unrecognized_kbiz`, `unrecognized_email`)
 * are the final catch-all fallback in `builtInClassify` and have no DB-rule
 * equivalent.
 */
export type BuiltinClassifier = {
  key: string;
  label: string;
  classification: EmailClassification['classification'];
  subtype: string;
  description: string;
  deprecated: boolean;
  dummyInput: EmailAutomationInput;
};

export const BUILTIN_CLASSIFIERS: BuiltinClassifier[] = [
  {
    key: 'bill_payment_success',
    label: 'Bill payment / top-up success',
    classification: 'expense',
    subtype: 'bill_payment_success',
    description: 'Built-in matcher for K BIZ bill payment / top-up success. Mirrored as a DB rule.',
    deprecated: true,
    dummyInput: {
      receivedAt: '2026-07-09T10:06:05.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Result of Bill Payment/Top-Up (Success)',
      messageId: '<builtin-bill-payment-success@example.test>',
      attachmentCount: 0,
      textBody: 'Reference Number: BILS260709267019809 Amount (THB): 5,776.31'
    }
  },
  {
    key: 'other_bank_transfer_success',
    label: 'Other-bank transfer success',
    classification: 'expense',
    subtype: 'other_bank_transfer_success',
    description: 'Built-in matcher for K BIZ other-bank transfer success. Mirrored as a DB rule.',
    deprecated: true,
    dummyInput: {
      receivedAt: '2026-07-09T10:03:54.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Result of Other Account Funds Transfer (Other Bank) (Success)',
      messageId: '<builtin-other-bank-success@example.test>',
      attachmentCount: 0,
      textBody: 'Reference Number: TRTS260709267002259 Amount (THB): 1,025.00'
    }
  },
  {
    key: 'promptpay_transfer_success',
    label: 'PromptPay transfer success',
    classification: 'expense',
    subtype: 'promptpay_transfer_success',
    description: 'Built-in matcher for K BIZ PromptPay transfer success. Mirrored as a DB rule.',
    deprecated: true,
    dummyInput: {
      receivedAt: '2026-07-07T17:51:30.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Result of PromptPay Funds Transfer (Success)',
      messageId: '<builtin-promptpay-success@example.test>',
      attachmentCount: 0,
      textBody: 'Reference Number: PPFS260707254721403 Amount (THB): 4,000.00'
    }
  },
  {
    key: 'approved_shadow',
    label: 'Approved companion message',
    classification: 'ignore',
    subtype: 'approved_shadow',
    description: 'Built-in matcher for "Status ... (Approved)" companion mail. Mirrored as a DB rule.',
    deprecated: true,
    dummyInput: {
      receivedAt: '2026-07-07T17:51:30.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Status of Promptpay Funds Transfer (Approved)',
      messageId: '<builtin-approved-shadow@example.test>',
      attachmentCount: 0,
      textBody: 'Reference Number: PPFS260707254721403 Amount (THB): 4,000.00'
    }
  },
  {
    key: 'kshop_settlement_failed',
    label: 'K SHOP settlement failure',
    classification: 'review',
    subtype: 'kshop_settlement_failed',
    description: 'Built-in matcher for K SHOP settlements that could not be deposited. Mirrored as a DB rule.',
    deprecated: true,
    dummyInput: {
      receivedAt: '2026-07-08T08:00:00.000Z',
      from: 'KSHOP <KPLUSSHOP@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'เรียน ร้านค้า K SHOP CASA LUMA',
      messageId: '<builtin-kshop-settlement-failed@example.test>',
      attachmentCount: 0,
      textBody: 'The settlement amount could not be deposited. K SHOP settlement is pending review.'
    }
  },
  {
    key: 'merchant_fee_failed',
    label: 'Merchant fee failure',
    classification: 'review',
    subtype: 'merchant_fee_failed',
    description: 'Built-in matcher for failed EDC/mini EDC merchant fees. Mirrored as a DB rule.',
    deprecated: true,
    dummyInput: {
      receivedAt: '2026-07-08T08:00:00.000Z',
      from: 'K-MERCHANT FEE <K-MERCHANT_FEE@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'แจ้งเตือนการชำระค่าธรรมเนียมรายเดือนเครื่อง EDC/mini EDC ไม่สำเร็จ',
      messageId: '<builtin-merchant-fee-failed@example.test>',
      attachmentCount: 0,
      textBody: 'The monthly merchant fee was unsuccessful. EDC fee failed and needs review.'
    }
  },
  {
    key: 'security_or_admin',
    label: 'Security / admin / OTP',
    classification: 'ignore',
    subtype: 'security_or_admin',
    description: 'Built-in matcher for login, OTP, email-change, and terms-of-service mail. Mirrored as a DB rule.',
    deprecated: true,
    dummyInput: {
      receivedAt: '2026-07-08T09:00:00.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Notification for login to K BIZ (via K BIZ Web/K BIZ Application)',
      messageId: '<builtin-security-or-admin@example.test>',
      attachmentCount: 0,
      textBody: 'Login notification. One Time Password (OTP) for K BIZ access.'
    }
  },
  {
    key: 'statement_or_attachment',
    label: 'Statement / e-document / renewal',
    classification: 'review',
    subtype: 'statement_or_attachment',
    description: 'Built-in matcher for statements, e-documents, and subscription renewals. Mirrored as a DB rule.',
    deprecated: true,
    dummyInput: {
      receivedAt: '2026-07-01T08:00:00.000Z',
      from: 'K-eDocument <K-ElectronicDocument@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'E-document (K-Deposit Statement) for the period of June 1, 2026-June 30, 2026.',
      messageId: '<builtin-statement-or-attachment@example.test>',
      attachmentCount: 0,
      textBody: 'Your e-document statement is now available for download.'
    }
  },
  {
    key: 'unrecognized_kbiz',
    label: 'Unrecognised K BIZ email (fallback)',
    classification: 'review',
    subtype: 'unrecognized_kbiz',
    description: 'Final fallback for K BIZ mail that matched no specific rule. Not mirrored in DB; stays in code as the catch-all.',
    deprecated: false,
    dummyInput: {
      receivedAt: '2026-07-10T08:00:00.000Z',
      from: 'K BIZ <KBIZ@kasikornbank.com>',
      to: 'automations@casalumakpg.com',
      subject: 'K BIZ service maintenance notice',
      messageId: '<builtin-unrecognized-kbiz@example.test>',
      attachmentCount: 0,
      textBody: 'Scheduled maintenance for K BIZ online banking. No action required from the sender.'
    }
  },
  {
    key: 'unrecognized_email',
    label: 'Unrecognised email (fallback)',
    classification: 'review',
    subtype: 'unrecognized_email',
    description: 'Final fallback for non-K-BIZ mail that matched no rule. Not mirrored in DB; stays in code as the catch-all.',
    deprecated: false,
    dummyInput: {
      receivedAt: '2026-07-10T08:00:00.000Z',
      from: 'Loyverse Team <help@loyverse.com>',
      to: 'automations@casalumakpg.com',
      subject: 'Your subscription will renew itself on 12-Jul-2026',
      messageId: '<builtin-unrecognized-email@example.test>',
      attachmentCount: 0,
      textBody: 'Your Loyverse subscription will renew soon. No matching automation rule applies.'
    }
  }
];

export const findBuiltinClassifier = (key: string): BuiltinClassifier | undefined =>
  BUILTIN_CLASSIFIERS.find((entry) => entry.key === key);
