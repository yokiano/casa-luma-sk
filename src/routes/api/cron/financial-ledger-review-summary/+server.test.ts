import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ run: vi.fn() }));

vi.mock('$env/dynamic/private', () => ({
  env: { CRON_SECRET: 'cron-test-secret' }
}));
vi.mock('$lib/server/financial-ledger-review-summary', () => ({
  runFinancialLedgerReviewSummary: mocks.run
}));

import { GET } from './+server';

describe('Financial Ledger review summary cron endpoint', () => {
  beforeEach(() => mocks.run.mockReset());

  it('rejects requests without the exact bearer secret', async () => {
    const response = await GET({
      request: new Request('https://example.test/api/cron/financial-ledger-review-summary', {
        headers: { authorization: 'Bearer wrong' }
      })
    } as never);

    expect(response.status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('runs the summary for an authorized request', async () => {
    mocks.run.mockResolvedValue({ status: 'sent', localDate: '2026-08-07', count: 2 });
    const response = await GET({
      request: new Request('https://example.test/api/cron/financial-ledger-review-summary', {
        headers: { authorization: 'Bearer cron-test-secret' }
      })
    } as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'sent', localDate: '2026-08-07', count: 2 });
    expect(mocks.run).toHaveBeenCalledTimes(1);
  });

  it('returns conflict while another dated run holds the lease', async () => {
    mocks.run.mockResolvedValue({ status: 'in_progress', localDate: '2026-08-07' });
    const response = await GET({
      request: new Request('https://example.test/api/cron/financial-ledger-review-summary', {
        headers: { authorization: 'Bearer cron-test-secret' }
      })
    } as never);

    expect(response.status).toBe(409);
  });
});
