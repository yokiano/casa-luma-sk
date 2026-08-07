import {
  createFinancialLedgerRecord,
  isFinancialLedgerDuplicateConflict,
  reconcileFinancialLedgerRecord,
  type FinancialLedgerType
} from '$lib/server/financial-ledger';
import type { EmailAutomationHandler } from './types';

const SCAN_INCOME_TYPE = 'Scan Income' as FinancialLedgerType;
const KSHOP_REFERENCE = /^kshop:([a-z0-9][a-z0-9_-]{2,31}):(\d{4}-\d{2}-\d{2})$/i;

const reviewResult = (message: string) => ({ state: 'review' as const, message });

const parseKShopReference = (reference: string) => {
  const match = KSHOP_REFERENCE.exec(reference.trim());
  return match ? { merchantCode: match[1].toUpperCase(), settlementDate: match[2] } : undefined;
};

const settlementDateFromReference = (reference: string) => parseKShopReference(reference)?.settlementDate;

export const financialLedgerIncomeHandler: EmailAutomationHandler = {
  key: 'financial_ledger_income',
  version: '1',
  supportedClassifications: ['income'],
  sideEffectRisk: 'external_write',
  validate: (classification) => {
    if (classification.classification !== 'income') return 'Financial Ledger income automation only supports income classifications.';
    if (classification.subtype !== 'kshop_daily_settlement') return 'Financial Ledger income automation only supports K SHOP daily settlements.';
    if (classification.processingState !== 'ready') return 'This income is not ready for automatic processing.';
    if (!classification.externalRef) return 'A deterministic K SHOP settlement reference is required.';
    if (!parseKShopReference(classification.externalRef)) return 'The K SHOP settlement reference must be kshop:<merchant-code>:YYYY-MM-DD.';
    if (classification.amountMinor === undefined) return 'An amount is required.';
    if (!Number.isSafeInteger(classification.amountMinor) || classification.amountMinor <= 0) return 'The K SHOP amount must be a positive whole number of satang.';
    if (classification.currency !== 'THB') return 'Financial Ledger income automation currently supports only THB income.';
    return null;
  },
  idempotencyKey: (_input, classification) => `ledger-income:${classification.externalRef ?? 'missing'}:${classification.amountMinor ?? 'missing'}`,
  execute: async ({ input, classification, eventId, actionId }) => {
    const reference = classification.externalRef?.trim();
    const settlementDate = reference ? settlementDateFromReference(reference) : undefined;
    if (!reference || !settlementDate || classification.amountMinor === undefined) {
      return reviewResult('K SHOP income is missing the amount or deterministic settlement reference. No Financial Ledger record was created.');
    }

    const traceNote = [
      `Neon processing ID: email_event=${eventId}, action=${actionId}`,
      `Created by email automation from ${input.from}.`,
      `K SHOP settlement reference: ${reference}.`
    ].join('\n');

    try {
      const ledger = await createFinancialLedgerRecord({
        ledgerType: SCAN_INCOME_TYPE,
        title: classification.description ?? input.subject,
        amount: classification.amountMinor / 100,
        date: settlementDate,
        transactionId: reference,
        category: 'Revenue',
        department: 'General',
        bankAccount: 'KBank',
        paymentMethod: 'Scan',
        receiptNotRequired: true,
        eventId,
        actionId,
        actor: `email-automation:${eventId}`,
        notes: traceNote
      });
      return {
        state: ledger.reconciled ? 'reconciled' : 'succeeded',
        externalObjectId: ledger.id,
        externalUrl: ledger.externalUrl,
        message: ledger.reconciled ? 'Existing Scan Income Ledger page was verified and reconciled.' : 'Scan Income Financial Ledger page was created.'
      };
    } catch (cause) {
      if (isFinancialLedgerDuplicateConflict(cause)) return reviewResult(cause.message);
      throw cause;
    }
  },
  reconcile: async ({ classification, eventId, actionId }) => {
    const reference = classification.externalRef?.trim();
    if (!reference || classification.amountMinor === undefined) return reviewResult('Reconciliation requires the K SHOP settlement reference and amount.');

    const found = await reconcileFinancialLedgerRecord({
      reference,
      amount: classification.amountMinor / 100,
      ledgerType: SCAN_INCOME_TYPE,
      eventId,
      actionId,
      actor: `email-automation:${eventId}`
    });
    if (found.state === 'verified') return { state: 'reconciled' as const, externalObjectId: found.id, externalUrl: found.externalUrl, message: 'Existing Scan Income Ledger page matched the reference, amount, and Ledger Type.' };
    if (found.state === 'amount_mismatch') return reviewResult('A Financial Ledger page has the same K SHOP reference but a different amount. Do not retry automatically.');
    if (found.state === 'type_mismatch') return reviewResult('A Financial Ledger page has the same K SHOP reference and amount but a different Ledger Type. Do not retry automatically.');
    if (found.state === 'reference_mismatch') return reviewResult('The existing Financial Ledger reference could not be verified exactly. Do not retry automatically.');
    if (found.state === 'ambiguous') return reviewResult('Multiple Financial Ledger pages match this K SHOP reference. Resolve the duplicates manually.');
    return reviewResult('No matching Scan Income Ledger page was found. Review before deciding whether a retry is safe.');
  }
};
