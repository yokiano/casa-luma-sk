import { createCompanyLedgerExpense, findCompanyLedgerExpenseByReference, type CompanyLedgerExpenseType } from '$lib/server/ledger-expenses';
import type { EmailAutomationHandler } from './types';

const defaults = (value: unknown) => value && typeof value === 'object' ? value as Record<string, string> : {};
export const companyLedgerExpenseHandler: EmailAutomationHandler = {
  key: 'company_ledger_expense', version: '1', supportedClassifications: ['expense'], sideEffectRisk: 'external_write',
  validate: (c) => c.classification !== 'expense' ? 'Company Ledger automation only supports expense classifications.' : c.processingState !== 'ready' ? 'This expense is not ready for automatic processing.' : !c.externalRef ? 'A transaction reference is required.' : c.amountMinor === undefined ? 'An amount is required.' : c.currency !== 'THB' ? 'Company Ledger canary currently supports only THB expenses.' : null,
  idempotencyKey: (_input, c) => `ledger-expense:${c.externalRef ?? 'missing'}:${c.amountMinor ?? 'missing'}`,
  execute: async ({ input, classification, eventId, actionId }) => {
    const config = defaults(classification.ledgerDefaults);
    const traceNote = `Neon processing ID: email_event=${eventId}, action=${actionId}`;
    const ledger = await createCompanyLedgerExpense({
      ledgerType: (config.ledgerType ?? 'Scan Expense') as CompanyLedgerExpenseType,
      title: classification.description ?? input.subject, amount: (classification.amountMinor ?? 0) / 100, date: input.receivedAt,
      transactionId: classification.externalRef, bankAccount: config.bankAccount ?? 'KBank',
      paymentMethod: config.paymentMethod ?? 'Scan', category: config.category, department: config.department,
      supplierId: config.supplierId,
      // Keep the Neon trace before email-derived text so it cannot be lost in a truncated note.
      notes: [traceNote, `Created by email automation from ${input.from}.`, 'Review and attach the invoice/receipt image.'].join('\n')
    });
    return { state: ledger.reconciled ? 'reconciled' : 'succeeded', externalObjectId: ledger.id, externalUrl: ledger.externalUrl, message: ledger.reconciled ? 'Existing Financial Ledger page was verified and reconciled.' : 'Financial Ledger page was created.' };
  },
  reconcile: async ({ classification }) => {
    if (!classification.externalRef) return { state: 'review', message: 'Reconciliation requires a transaction reference.' };
    const found = await findCompanyLedgerExpenseByReference(classification.externalRef, classification.amountMinor === undefined ? undefined : classification.amountMinor / 100);
    if (found.state === 'verified') return { state: 'reconciled', externalObjectId: found.id, externalUrl: found.externalUrl, message: 'Existing Financial Ledger page matched both reference and amount.' };
    if (found.state === 'amount_mismatch') return { state: 'review', message: 'A Ledger page has the same reference but a different amount. Do not retry automatically.' };
    if (found.state === 'ambiguous') return { state: 'review', message: 'Multiple Ledger pages match this reference and amount. Resolve the duplicates manually.' };
    return { state: 'review', message: 'No matching Ledger page was found. Review before deciding whether a retry is safe.' };
  }
};
