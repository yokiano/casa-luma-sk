import { describe, expect, it, vi } from 'vitest';
import { BalanceSubmissionAuthorizationError, BalanceSubmissionConflictError, submitManagerBalanceSubmission } from './balance-submissions';
import type { ValidatedBalanceSubmission } from './balance-submission.logic';

const input = {
  submissionKey: 'submission-1234567890',
  observedAt: '2026-08-07T20:30',
  kbankBalance: '1000',
  safeBalance: '250.50',
  notes: 'Close count'
};

const record = (overrides: Partial<any> = {}): any => ({
  id: 7,
  submissionKey: 'submission-1234567890',
  observedAt: new Date('2026-08-07T13:30:00.000Z'),
  kbankBalance: 1000,
  safeBalance: 250.5,
  notes: 'Close count',
  status: 'processing',
  kbankNotionPageId: null,
  safeNotionPageId: null,
  lastError: null,
  updatedAt: new Date(0),
  ...overrides
});

const createDependencies = (initial = record()): any => {
  const state = { record: initial, failSafeOnce: true, created: [] as Array<{ account: string; observedAt: string }> };
  const store = {
    claim: vi.fn(async () => ({ kind: 'claimed' as const, record: state.record })),
    markPage: vi.fn(async (_id: number, account: 'kbank' | 'safe_cash', pageId: string) => {
      if (account === 'kbank') state.record.kbankNotionPageId = pageId;
      else state.record.safeNotionPageId = pageId;
    }),
    finish: vi.fn(async () => { state.record.status = 'succeeded'; }),
    fail: vi.fn(async () => { state.record.status = 'partial'; })
  };
  const notion = {
    findPage: vi.fn(async () => null),
    createPage: vi.fn(async (validated: ValidatedBalanceSubmission, account: 'kbank' | 'safe_cash') => {
      if (account === 'safe_cash' && state.failSafeOnce) {
        state.failSafeOnce = false;
        throw new Error('Notion unavailable for safe page');
      }
      state.created.push({ account, observedAt: validated.observedAt });
      return { id: `${account}-page` };
    })
  };
  return { state, store, notion };
};

describe('manager balance submission boundary', () => {
  it('requires manager authorization independently of the route', async () => {
    await expect(submitManagerBalanceSubmission('staff', input)).rejects.toBeInstanceOf(BalanceSubmissionAuthorizationError);
  });

  it('rejects a duplicate key with different balance data before any Notion write', async () => {
    const deps = createDependencies(record({ kbankBalance: 999 }));
    deps.store.claim.mockRejectedValue(new BalanceSubmissionConflictError('This submission key is already used for different balances.'));
    await expect(submitManagerBalanceSubmission('manager', input, deps)).rejects.toThrow('different balances');
    expect(deps.notion.createPage).not.toHaveBeenCalled();
  });

  it('retries only the missing Notion page after partial success', async () => {
    const deps = createDependencies();
    await expect(submitManagerBalanceSubmission('manager', input, deps)).rejects.toThrow('Notion unavailable');
    expect(deps.state.record.kbankNotionPageId).toBe('kbank-page');
    expect(deps.state.record.safeNotionPageId).toBeNull();

    const retry = await submitManagerBalanceSubmission('manager', input, deps);
    expect(retry.status).toBe('submitted');
    expect(deps.notion.createPage).toHaveBeenCalledTimes(3);
    expect(deps.notion.createPage.mock.calls.map((call: any[]) => call[1])).toEqual(['kbank', 'safe_cash', 'safe_cash']);
    expect(deps.state.record.status).toBe('succeeded');
  });

  it('returns a durable duplicate without writing again', async () => {
    const deps = createDependencies(record({
      status: 'succeeded',
      kbankNotionPageId: 'kbank-page',
      safeNotionPageId: 'safe-page'
    }));
    deps.store.claim.mockResolvedValue({ kind: 'duplicate', record: deps.state.record });
    const result = await submitManagerBalanceSubmission('manager', input, deps);
    expect(result).toEqual({
      status: 'duplicate',
      submissionKey: input.submissionKey,
      pageIds: { kbank: 'kbank-page', safe_cash: 'safe-page' }
    });
    expect(deps.notion.createPage).not.toHaveBeenCalled();
  });

  it('passes one identical UTC observation timestamp to both account writes', async () => {
    const deps = createDependencies();
    deps.state.failSafeOnce = false;
    await submitManagerBalanceSubmission('manager', input, deps);
    expect(deps.state.created[0].observedAt).toBe('2026-08-07T13:30:00.000Z');
    expect(deps.state.created[1].observedAt).toBe(deps.state.created[0].observedAt);
  });
});
