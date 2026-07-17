import { describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('$lib/notion-sdk/dbs/financial-ledger/db', () => ({
  FinancialLedgerDatabase: vi.fn().mockImplementation(() => ({ query, createPage: vi.fn() }))
}));

import { findCompanyLedgerExpenseByReference } from './ledger-expenses';

describe('company Ledger duplicate reconciliation', () => {
  it('does not reconcile a reference when its amount differs', async () => {
    query.mockResolvedValueOnce({
      results: [{ id: 'existing-page', properties: { 'Amount (THB)': { number: 99 } } }]
    });

    await expect(findCompanyLedgerExpenseByReference('BILS-1', 100)).resolves.toEqual({ state: 'amount_mismatch' });
  });

  it('treats multiple pages with the same reference as ambiguous', async () => {
    query.mockResolvedValueOnce({
      results: [
        { id: 'existing-page-1', properties: { 'Amount (THB)': { number: 100 } } },
        { id: 'existing-page-2', properties: { 'Amount (THB)': { number: 100 } } }
      ]
    });

    await expect(findCompanyLedgerExpenseByReference('BILS-1', 100)).resolves.toEqual({ state: 'ambiguous' });
  });
});
