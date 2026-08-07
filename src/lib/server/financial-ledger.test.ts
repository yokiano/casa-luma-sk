import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query, createFinancialLedgerPage, mutateFinancialLedger } = vi.hoisted(() => ({
  query: vi.fn(),
  createFinancialLedgerPage: vi.fn(),
  mutateFinancialLedger: vi.fn()
}));

vi.mock('$lib/notion-sdk/dbs/financial-ledger/db', () => ({
  FinancialLedgerDatabase: vi.fn().mockImplementation(() => ({ query }))
}));
vi.mock('./financial-ledger-completeness', () => ({ createFinancialLedgerPage, mutateFinancialLedger }));

import { createFinancialLedgerRecord, findFinancialLedgerByReference } from './financial-ledger';

const page = (overrides: Record<string, unknown> = {}) => ({
  id: 'ledger-page',
  url: 'https://notion.test/ledger-page',
  properties: {
    'Reference Number': { rich_text: [{ plain_text: 'kshop:SHOP:2026-08-07' }] },
    'Amount (THB)': { number: 100 },
    Type: { select: { name: 'Scan Income' } },
    ...overrides
  }
});

describe('neutral Financial Ledger helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires matching reference, amount, and Ledger Type before reconciliation', async () => {
    query.mockResolvedValue({ results: [page()] });

    await expect(findFinancialLedgerByReference('kshop:SHOP:2026-08-07', 100, 'Scan Income')).resolves.toMatchObject({ state: 'verified', id: 'ledger-page' });
    await expect(findFinancialLedgerByReference('kshop:SHOP:2026-08-07', 101, 'Scan Income')).resolves.toEqual({ state: 'amount_mismatch' });
    await expect(findFinancialLedgerByReference('kshop:SHOP:2026-08-07', 100, 'Scan Expense')).resolves.toEqual({ state: 'type_mismatch' });
  });

  it('sends the generated Notion status shape when creating income', async () => {
    query.mockResolvedValue({ results: [] });
    createFinancialLedgerPage.mockResolvedValue({ id: 'new-page', externalUrl: 'https://notion.test/new-page' });

    await createFinancialLedgerRecord({
      ledgerType: 'Scan Income',
      title: 'K SHOP settlement',
      amount: 100,
      date: '2026-08-07',
      transactionId: 'kshop:SHOP:2026-08-07',
      category: 'Revenue',
      department: 'General',
      bankAccount: 'KBank',
      paymentMethod: 'Scan',
      receiptNotRequired: true
    });

    expect(createFinancialLedgerPage).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        status: { name: 'Paid' },
        receiptNotRequired: true
      })
    }));
  });

  it('never creates a second page for a same-reference amount conflict', async () => {
    query.mockResolvedValue({ results: [page()] });

    await expect(createFinancialLedgerRecord({
      ledgerType: 'Scan Income',
      title: 'K SHOP settlement',
      amount: 101,
      date: '2026-08-07',
      transactionId: 'kshop:SHOP:2026-08-07',
      category: 'Revenue',
      department: 'General',
      bankAccount: 'KBank',
      paymentMethod: 'Scan',
      receiptNotRequired: true
    })).rejects.toThrow(/different.*amount/i);
    expect(createFinancialLedgerPage).not.toHaveBeenCalled();
  });
});
