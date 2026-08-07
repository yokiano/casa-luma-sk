import { describe, expect, it, vi } from 'vitest';
import { runFinancialBalanceReminder } from './financial-balance-reminder';

const summary = {
  asOf: '2026-08-07T13:30:00.000Z',
  setup: { hasOpeningBalances: true },
  expected: { totalCashAndBankThb: 100000 },
  actual: { comparableTotalThb: 100000, missingAccounts: [], snapshots: [] },
  difference: { totalThb: 0, status: 'ok' }
};

describe('financial balance reminder runner', () => {
  it('sends once and treats the same Bangkok date as an idempotent duplicate', async () => {
    const run = { id: 1, localDate: '2026-08-07' } as any;
    let sent = false;
    const publish = vi.fn(async () => undefined);
    const store = {
      claim: vi.fn(async () => sent
        ? { kind: 'already_sent' as const, run }
        : { kind: 'claimed' as const, run, leaseToken: 'lease-1' }),
      markSent: vi.fn(async () => { sent = true; }),
      markFailed: vi.fn(async () => undefined)
    };
    const getSummary = vi.fn(async () => summary);
    const now = new Date('2026-08-07T13:30:00.000Z');

    expect(await runFinancialBalanceReminder(now, { store, getSummary, publish })).toEqual({ status: 'sent', localDate: '2026-08-07' });
    expect(await runFinancialBalanceReminder(new Date('2026-08-07T16:00:00.000Z'), { store, getSummary, publish })).toEqual({ status: 'already_sent', localDate: '2026-08-07' });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(store.markSent).toHaveBeenCalledTimes(1);
  });

  it('records a failed delivery so the next invocation can retry', async () => {
    const run = { id: 2, localDate: '2026-08-07' } as any;
    const store = {
      claim: vi.fn(async () => ({ kind: 'claimed' as const, run, leaseToken: 'lease-2' })),
      markSent: vi.fn(async () => undefined),
      markFailed: vi.fn(async () => undefined)
    };
    await expect(runFinancialBalanceReminder(new Date('2026-08-07T13:30:00.000Z'), {
      store,
      getSummary: async () => summary,
      publish: async () => { throw new Error('Telegram unavailable'); }
    })).rejects.toThrow('Telegram unavailable');
    expect(store.markFailed).toHaveBeenCalledWith(run, 'lease-2', 'Telegram unavailable');
  });
});
