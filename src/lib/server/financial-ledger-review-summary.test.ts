import { describe, expect, it, vi } from 'vitest';
import { runFinancialLedgerReviewSummary } from './financial-ledger-review-summary';

const emptySummary = {
  localDate: '2026-08-07',
  asOf: '2026-08-07T11:00:00.000Z',
  count: 0,
  oldestAt: null,
  oldestAgeHours: null,
  missingFields: { category: 0, invoiceReceipt: 0 }
};

const populatedSummary = {
  ...emptySummary,
  count: 2,
  oldestAt: '2026-08-05T04:00:00.000Z',
  oldestAgeHours: 55,
  missingFields: { category: 1, invoiceReceipt: 2 }
};

describe('Financial Ledger review summary runner', () => {
  it('records an empty date without sending Telegram', async () => {
    const run = { id: 1, localDate: '2026-08-07' } as any;
    let completed = false;
    const publish = vi.fn(async () => undefined);
    const store = {
      claim: vi.fn(async () => completed
        ? { kind: 'already_sent' as const, run }
        : { kind: 'claimed' as const, run, leaseToken: 'lease-1' }),
      markSent: vi.fn(async () => { completed = true; }),
      markFailed: vi.fn(async () => undefined)
    };

    expect(await runFinancialLedgerReviewSummary(new Date('2026-08-07T11:00:00.000Z'), {
      store,
      getSummary: async () => emptySummary,
      publish
    })).toEqual({ status: 'no_reviews', localDate: '2026-08-07', count: 0 });
    expect(publish).not.toHaveBeenCalled();
    expect(store.markSent).toHaveBeenCalledWith(run, 'lease-1', emptySummary);

    expect(await runFinancialLedgerReviewSummary(new Date('2026-08-07T16:00:00.000Z'), {
      store,
      getSummary: async () => populatedSummary,
      publish
    })).toEqual({ status: 'already_sent', localDate: '2026-08-07' });
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes a populated summary and records the successful delivery', async () => {
    const run = { id: 2, localDate: '2026-08-07' } as any;
    const publish = vi.fn(async () => undefined);
    const store = {
      claim: vi.fn(async () => ({ kind: 'claimed' as const, run, leaseToken: 'lease-2' })),
      markSent: vi.fn(async () => undefined),
      markFailed: vi.fn(async () => undefined)
    };

    const result = await runFinancialLedgerReviewSummary(new Date('2026-08-07T11:00:00.000Z'), {
      store,
      getSummary: async () => populatedSummary,
      publish
    });

    expect(result).toEqual({ status: 'sent', localDate: '2026-08-07', count: 2 });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][0]).toContain('/mgmt-dashboard/financial-ledger-reviews');
    expect(store.markSent).toHaveBeenCalledWith(run, 'lease-2', populatedSummary);
  });

  it('records a failed delivery so a later invocation can retry', async () => {
    const run = { id: 3, localDate: '2026-08-07' } as any;
    const store = {
      claim: vi.fn(async () => ({ kind: 'claimed' as const, run, leaseToken: 'lease-3' })),
      markSent: vi.fn(async () => undefined),
      markFailed: vi.fn(async () => undefined)
    };

    await expect(runFinancialLedgerReviewSummary(new Date('2026-08-07T11:00:00.000Z'), {
      store,
      getSummary: async () => populatedSummary,
      publish: async () => { throw new Error('Telegram unavailable'); }
    })).rejects.toThrow('Telegram unavailable');
    expect(store.markFailed).toHaveBeenCalledWith(run, 'lease-3', 'Telegram unavailable');
  });
});
