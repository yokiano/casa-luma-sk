import { describe, expect, it, vi } from 'vitest';

const { createCompanyLedgerExpense } = vi.hoisted(() => ({ createCompanyLedgerExpense: vi.fn() }));

vi.mock('$lib/server/ledger-expenses', () => ({
  createCompanyLedgerExpense,
  findCompanyLedgerExpenseByReference: vi.fn()
}));

import { companyLedgerExpenseHandler } from './company-ledger-expense';

describe('company Ledger email handler', () => {
  it('uses the extracted description/reference and writes Neon trace IDs to notes', async () => {
    createCompanyLedgerExpense.mockResolvedValue({ id: 'notion-page-1', reconciled: false });

    await companyLedgerExpenseHandler.execute({
      eventId: 123,
      actionId: 456,
      input: {
        receivedAt: '2026-07-15T10:00:00.000Z',
        from: 'K BIZ <KBIZ@kasikornbank.com>',
        to: 'automations@casalumakpg.com',
        subject: 'Result of Bill Payment/Top-Up (Success)',
        attachmentCount: 0
      },
      classification: {
        classification: 'expense',
        subtype: 'bill_payment_success',
        processingState: 'ready',
        description: 'Makto',
        externalRef: 'BILS260715313032359',
        amountMinor: 12345,
        currency: 'THB',
        notify: true,
        handlerKey: 'company_ledger_expense',
        ledgerDefaults: { category: 'Food & Groceries', department: 'Cafe', supplierId: 'supplier-1' }
      }
    });

    expect(createCompanyLedgerExpense).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Makto',
      transactionId: 'BILS260715313032359',
      category: 'Food & Groceries',
      department: 'Cafe',
      supplierId: 'supplier-1',
      notes: expect.stringContaining('Neon processing ID: email_event=123, action=456')
    }));
  });
});
