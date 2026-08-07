import { describe, expect, it } from 'vitest';
import {
  bangkokDateKey,
  isCronAuthorized,
  renderFinancialLedgerReviewSummary,
  summarizeFinancialLedgerReviews
} from './financial-ledger-review-summary.logic';

describe('Financial Ledger review summary logic', () => {
  it('uses the Bangkok calendar date and includes all open reviews', () => {
    const now = new Date('2026-08-07T11:00:00.000Z');
    expect(bangkokDateKey(now)).toBe('2026-08-07');
    expect(summarizeFinancialLedgerReviews([
      { receivedAt: '2026-08-05T04:00:00.000Z', analysisProvenance: { missingFields: ['category', 'invoiceReceipt'] } },
      { receivedAt: '2026-08-07T02:00:00.000Z', analysisProvenance: { missingFields: ['category'] } }
    ], now)).toMatchObject({
      localDate: '2026-08-07',
      count: 2,
      oldestAt: '2026-08-05T04:00:00.000Z',
      oldestAgeHours: 55,
      missingFields: { category: 2, invoiceReceipt: 1 }
    });
  });

  it('renders a concise breakdown and management link', () => {
    const body = renderFinancialLedgerReviewSummary({
      localDate: '2026-08-07',
      asOf: '2026-08-07T11:00:00.000Z',
      count: 2,
      oldestAt: '2026-08-05T04:00:00.000Z',
      oldestAgeHours: 55,
      missingFields: { category: 1, invoiceReceipt: 2 }
    }, 'https://www.casalumakpg.com/mgmt-dashboard/financial-ledger-reviews');

    expect(body).toContain('Open recorded transactions: <b>2</b>');
    expect(body).toContain('Oldest age: <b>2d 7h</b>');
    expect(body).toContain('Missing: Category 1 · Invoice / Receipt 2');
    expect(body).toContain('/mgmt-dashboard/financial-ledger-reviews');
  });

  it('requires the exact cron bearer secret', () => {
    expect(isCronAuthorized('Bearer cron-test-secret', 'cron-test-secret')).toBe(true);
    expect(isCronAuthorized('Bearer wrong', 'cron-test-secret')).toBe(false);
    expect(isCronAuthorized('cron-test-secret', 'cron-test-secret')).toBe(false);
    expect(isCronAuthorized('Bearer cron-test-secret', undefined)).toBe(false);
  });
});
