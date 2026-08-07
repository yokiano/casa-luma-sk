import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createFinancialLedgerRecord, reconcileFinancialLedgerRecord, isFinancialLedgerDuplicateConflict } = vi.hoisted(() => ({
  createFinancialLedgerRecord: vi.fn(),
  reconcileFinancialLedgerRecord: vi.fn(),
  isFinancialLedgerDuplicateConflict: vi.fn()
}));

vi.mock('$lib/server/financial-ledger', () => ({
  createFinancialLedgerRecord,
  reconcileFinancialLedgerRecord,
  isFinancialLedgerDuplicateConflict
}));

import { financialLedgerIncomeHandler } from './financial-ledger-income';

const input = {
  receivedAt: '2026-08-07T03:30:00.000Z',
  from: 'Surisa Surisa <surisa0737@gmail.com>',
  to: 'automations@casalumakpg.com',
  subject: 'Fwd: K SHOP Daily Settlement Summary',
  attachmentCount: 0,
  mime: { completeness: 'complete' as const }
};

const classification = {
  classification: 'income' as const,
  subtype: 'kshop_daily_settlement',
  processingState: 'ready' as const,
  externalRef: 'kshop:123456789:2026-08-07',
  amountMinor: 123456,
  currency: 'THB',
  notify: true,
  handlerKey: 'financial_ledger_income'
};

describe('Financial Ledger income handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isFinancialLedgerDuplicateConflict.mockReturnValue(false);
  });

  it('creates a Scan Income record with fixed K SHOP defaults and trace notes', async () => {
    createFinancialLedgerRecord.mockResolvedValue({ id: 'income-page', externalUrl: 'https://notion.test/income-page', reconciled: false });

    const result = await financialLedgerIncomeHandler.execute({
      input,
      classification,
      eventId: 123,
      actionId: 456
    });

    expect(result).toMatchObject({ state: 'succeeded', externalObjectId: 'income-page' });
    expect(createFinancialLedgerRecord).toHaveBeenCalledWith({
      ledgerType: 'Scan Income',
      title: input.subject,
      amount: 1234.56,
      date: '2026-08-07',
      transactionId: 'kshop:123456789:2026-08-07',
      category: 'Revenue',
      department: 'General',
      bankAccount: 'KBank',
      paymentMethod: 'Scan',
      receiptNotRequired: true,
      eventId: 123,
      actionId: 456,
      actor: 'email-automation:123',
      notes: expect.stringContaining('Neon processing ID: email_event=123, action=456')
    });
  });

  it('returns review on a same-reference amount conflict instead of retrying a create', async () => {
    const conflict = new Error('Potential Duplicate: Reference Number kshop:123456789:2026-08-07 already exists with a different or unverifiable amount.');
    createFinancialLedgerRecord.mockRejectedValue(conflict);
    isFinancialLedgerDuplicateConflict.mockReturnValue(true);

    const result = await financialLedgerIncomeHandler.execute({ input, classification, eventId: 1, actionId: 2 });

    expect(result).toEqual({ state: 'review', message: conflict.message });
    expect(createFinancialLedgerRecord).toHaveBeenCalledTimes(1);
  });

  it('reconciles only an existing Scan Income record verified by the neutral helper', async () => {
    reconcileFinancialLedgerRecord.mockResolvedValue({ state: 'verified', id: 'income-page', externalUrl: 'https://notion.test/income-page' });

    const result = await financialLedgerIncomeHandler.reconcile({
      input,
      classification,
      eventId: 123,
      actionId: 456
    });

    expect(result).toMatchObject({ state: 'reconciled', externalObjectId: 'income-page' });
    expect(reconcileFinancialLedgerRecord).toHaveBeenCalledWith({
      reference: 'kshop:123456789:2026-08-07',
      amount: 1234.56,
      ledgerType: 'Scan Income',
      eventId: 123,
      actionId: 456,
      actor: 'email-automation:123'
    });
  });

  it('fails validation for a non-K SHOP, incomplete, or non-THB income candidate', () => {
    expect(financialLedgerIncomeHandler.validate({ ...classification, subtype: 'other_income' })).toMatch(/only supports K SHOP/);
    expect(financialLedgerIncomeHandler.validate({ ...classification, processingState: 'review' })).toMatch(/not ready/);
    expect(financialLedgerIncomeHandler.validate({ ...classification, currency: 'USD' })).toMatch(/THB/);
    expect(financialLedgerIncomeHandler.validate({ ...classification, externalRef: 'kshop:123456789' })).toMatch(/kshop:<merchant-code>:YYYY-MM-DD/);
    expect(financialLedgerIncomeHandler.validate({ ...classification, externalRef: 'kshop:bad merchant:2026-08-07' })).toMatch(/kshop:<merchant-code>/);
    expect(financialLedgerIncomeHandler.validate({ ...classification, amountMinor: 0 })).toMatch(/positive whole number/);
    expect(financialLedgerIncomeHandler.validate({ ...classification, amountMinor: 12.34 })).toMatch(/positive whole number/);
  });
});
