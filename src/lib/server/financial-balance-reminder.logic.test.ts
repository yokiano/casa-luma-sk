import { describe, expect, it } from 'vitest';
import { bangkokDateKey, isCronAuthorized, renderFinancialBalanceReminder } from './financial-balance-reminder.logic';

describe('financial balance reminder', () => {
  it('uses the Bangkok calendar date for the reminder key', () => {
    expect(bangkokDateKey(new Date('2026-08-07T16:00:00.000Z'))).toBe('2026-08-07');
    expect(bangkokDateKey(new Date('2026-08-07T16:00:00.000Z'))).not.toBe('2026-08-08');
  });

  it('requires the exact cron bearer secret', () => {
    expect(isCronAuthorized('Bearer cron-test-secret', 'cron-test-secret')).toBe(true);
    expect(isCronAuthorized('Bearer wrong', 'cron-test-secret')).toBe(false);
    expect(isCronAuthorized('cron-test-secret', 'cron-test-secret')).toBe(false);
    expect(isCronAuthorized('Bearer cron-test-secret', undefined)).toBe(false);
  });

  it('renders actionable time-aligned balance details without claiming verification', () => {
    const body = renderFinancialBalanceReminder({
      asOf: '2026-08-07T13:30:00.000Z',
      setup: { hasOpeningBalances: true },
      expected: { totalCashAndBankThb: 100000 },
      actual: {
        comparableTotalThb: 99800,
        snapshots: [{ accountName: 'KBank', balanceThb: 90000, varianceThb: -200, stale: false }]
      },
      difference: { totalThb: -200, status: 'attention' }
    }, {
      localDate: '2026-08-07',
      reconciliationUrl: 'https://www.casalumakpg.com/mgmt-dashboard/reconciliation',
      submitUrl: 'https://www.casalumakpg.com/mgmt-dashboard/balances/submit'
    });

    expect(body).toContain('Financials daily balance reminder');
    expect(body).toContain('variance');
    expect(body).toContain('Review Financial Ledger');
    expect(body).toContain('not verified baselines');
  });
});
