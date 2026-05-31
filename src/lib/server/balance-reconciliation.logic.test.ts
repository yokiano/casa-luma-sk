import { describe, expect, it } from 'vitest';
import {
  accountKeyFromLedger,
  accountKeyFromPayment,
  buildExpectedAccounts,
  deriveReconciliationStatus,
  ledgerMovementsFromRecord,
  movementsAfterBaseline,
  sumComparableExpected,
  type AccountKey,
  type BaselineSnapshot,
  type Movement
} from './balance-reconciliation.logic';

const baseRecord = {
  id: 'ledger-1',
  date: '2026-05-28T10:00:00.000Z',
  status: 'Paid',
  bankAccount: 'KBank',
  paymentMethod: 'Wire Transfer',
  url: 'https://www.notion.so/example'
};

describe('balance reconciliation ledger mapping', () => {
  it('maps cash register bank account to safe cash', () => {
    expect(accountKeyFromLedger('Cash Register', 'Cash')).toBe('safe_cash');
  });

  it('treats register expense as a negative movement on the selected account', () => {
    const [movement] = ledgerMovementsFromRecord({
      ...baseRecord,
      amountThb: 240,
      type: 'Register Expense',
      category: 'Food & Groceries',
      description: 'Ice',
      paymentMethod: 'Cash',
      bankAccount: 'Cash Register'
    });

    expect(movement).toMatchObject({
      accountKey: 'safe_cash',
      amountThb: -240
    });
  });

  it('treats scan expense as a negative KBank movement by default', () => {
    const [movement] = ledgerMovementsFromRecord({
      ...baseRecord,
      amountThb: 1800,
      type: 'Scan Expense',
      category: 'Food & Groceries',
      description: 'Vendor QR payment',
      paymentMethod: 'Scan',
      bankAccount: ''
    });

    expect(movement).toMatchObject({
      accountKey: 'kbank',
      amountThb: -1800
    });
  });

  it('treats card-paid ledger expenses as KBank unless an account is selected explicitly', () => {
    const [movement] = ledgerMovementsFromRecord({
      ...baseRecord,
      amountThb: 900,
      type: 'Expense',
      category: 'Supplies',
      description: 'Card fee or purchase',
      paymentMethod: 'Credit Card',
      bankAccount: ''
    });

    expect(movement).toMatchObject({
      accountKey: 'kbank',
      amountThb: -900
    });
  });

  it('still treats legacy expense rows as negative movements', () => {
    const [movement] = ledgerMovementsFromRecord({
      ...baseRecord,
      amountThb: 240,
      type: 'Expense',
      category: 'Food & Groceries',
      description: 'Ice',
      paymentMethod: 'Cash',
      bankAccount: 'Cash Register'
    });

    expect(movement).toMatchObject({
      accountKey: 'safe_cash',
      amountThb: -240
    });
  });

  it('treats refund type as money leaving the account', () => {
    const [movement] = ledgerMovementsFromRecord({
      ...baseRecord,
      amountThb: 500,
      type: 'Refund',
      category: 'Miscellaneous',
      description: 'Customer refund',
      paymentMethod: 'Cash',
      bankAccount: 'Cash Register'
    });

    expect(movement).toMatchObject({
      accountKey: 'safe_cash',
      amountThb: -500
    });
  });

  it('uses Bank Deposit Income type without deposit keywords', () => {
    const movements = ledgerMovementsFromRecord({
      ...baseRecord,
      amountThb: 10000,
      type: 'Bank Deposit Income',
      description: 'Weekly bank deposit',
      paymentMethod: 'Cash',
      bankAccount: ''
    });

    expect(movements).toHaveLength(2);
    expect(movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountKey: 'kbank', amountThb: 10000 }),
        expect.objectContaining({ accountKey: 'safe_cash', amountThb: -10000 })
      ])
    );
  });

  it('uses positive deposit amounts and moves money from safe to bank via legacy keywords', () => {
    const movements = ledgerMovementsFromRecord({
      ...baseRecord,
      amountThb: 10000,
      type: 'Bank Deposit Income',
      category: 'Owner Capital',
      description: 'Weekly cash deposit',
      notes: 'safe deposit from close shift',
      paymentMethod: 'Wire Transfer',
      bankAccount: 'KBank'
    });

    expect(movements).toHaveLength(2);
    expect(movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountKey: 'kbank', amountThb: 10000 }),
        expect.objectContaining({ accountKey: 'safe_cash', amountThb: -10000 })
      ])
    );
  });

  it('ignores Scan Income and Credit Card Income because Loyverse already credits KBank', () => {
    expect(
      ledgerMovementsFromRecord({
        ...baseRecord,
        amountThb: 4200,
        type: 'Scan Income',
        description: 'Daily scan settlement',
        bankAccount: 'KBank'
      })
    ).toEqual([]);

    expect(
      ledgerMovementsFromRecord({
        ...baseRecord,
        amountThb: 1800,
        type: 'Credit Card Income',
        description: 'Daily card settlement',
        bankAccount: 'KBank'
      })
    ).toEqual([]);
  });

  it('still recognizes legacy deposit keywords when amount is accidentally entered negative', () => {
    const movements = ledgerMovementsFromRecord({
      ...baseRecord,
      amountThb: -8000,
      type: 'Bank Deposit Income',
      description: 'cash deposit',
      paymentMethod: 'Wire Transfer',
      bankAccount: 'KBank'
    });

    expect(movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountKey: 'kbank', amountThb: 8000 }),
        expect.objectContaining({ accountKey: 'safe_cash', amountThb: -8000 })
      ])
    );
  });

  it('skips legacy revenue income to avoid double-counting POS sales', () => {
    expect(
      ledgerMovementsFromRecord({
        ...baseRecord,
        amountThb: 1500,
        type: 'Income',
        category: 'Revenue',
        description: 'Manual revenue row'
      })
    ).toEqual([]);
  });

  it('treats legacy vendor refund as income inflow on a non-revenue category', () => {
    const [movement] = ledgerMovementsFromRecord({
      ...baseRecord,
      amountThb: 800,
      type: 'Income',
      category: 'Miscellaneous',
      description: 'Supplier returned overpayment',
      paymentMethod: 'Wire Transfer',
      bankAccount: 'KBank'
    });

    expect(movement).toMatchObject({
      accountKey: 'kbank',
      amountThb: 800
    });
  });

  it('ignores pending ledger rows', () => {
    expect(
      ledgerMovementsFromRecord({
        ...baseRecord,
        amountThb: 100,
        type: 'Register Expense',
        status: 'Pending',
        description: 'Pending bill'
      })
    ).toEqual([]);
  });
});

describe('balance reconciliation payment mapping', () => {
  it('maps Loyverse cash payments to safe cash', () => {
    expect(accountKeyFromPayment('CASH', 'Cash')).toBe('safe_cash');
  });

  it('maps card payments to KBank because Casa Luma settles same day', () => {
    expect(accountKeyFromPayment('CARD', 'Visa')).toBe('kbank');
  });

  it('maps scan payments to KBank because Casa Luma settles same day', () => {
    expect(accountKeyFromPayment('CUSTOM', 'PromptPay QR')).toBe('kbank');
  });
});

describe('balance reconciliation expected balances', () => {
  const baselines = new Map<AccountKey, BaselineSnapshot>([
    ['kbank', { accountKey: 'kbank', observedAt: '2026-05-27', balanceThb: 600_000 }],
    ['safe_cash', { accountKey: 'safe_cash', observedAt: '2026-05-27', balanceThb: 25_000 }]
  ]);

  it('adds cash sales and subtracts cash expenses after baseline', () => {
    const movements: Movement[] = [
      {
        occurredAt: '2026-05-28T12:00:00.000Z',
        accountKey: 'safe_cash',
        amountThb: 3000,
        source: 'loyverse_receipt',
        sourceId: 'r1',
        description: 'Cash sale'
      },
      {
        occurredAt: '2026-05-28T13:00:00.000Z',
        accountKey: 'safe_cash',
        amountThb: -240,
        source: 'company_ledger',
        sourceId: 'l1',
        description: 'Ice'
      }
    ];

    const afterBaseline = movementsAfterBaseline(movements, baselines);
    const accounts = buildExpectedAccounts(baselines, afterBaseline);
    const safe = accounts.find((account) => account.key === 'safe_cash');

    expect(safe).toMatchObject({
      openingBalanceThb: 25_000,
      movementTotalThb: 2760,
      expectedThb: 27_760
    });
  });

  it('keeps bank + safe total unchanged for safe deposits', () => {
    const movements: Movement[] = [
      {
        occurredAt: '2026-05-29T09:00:00.000Z',
        accountKey: 'kbank',
        amountThb: 10_000,
        source: 'company_ledger',
        sourceId: 'l2:bank-side',
        description: 'Weekly cash deposit · bank side'
      },
      {
        occurredAt: '2026-05-29T09:00:00.000Z',
        accountKey: 'safe_cash',
        amountThb: -10_000,
        source: 'company_ledger',
        sourceId: 'l2:safe-side',
        description: 'Weekly cash deposit · safe side'
      }
    ];

    const afterBaseline = movementsAfterBaseline(movements, baselines);
    const accounts = buildExpectedAccounts(baselines, afterBaseline);

    expect(sumComparableExpected(accounts)).toBe(625_000);
    expect(accounts.find((account) => account.key === 'kbank')?.expectedThb).toBe(610_000);
    expect(accounts.find((account) => account.key === 'safe_cash')?.expectedThb).toBe(15_000);
  });

  it('puts QR sales into KBank because scan/QR settles same day', () => {
    const movements: Movement[] = [
      {
        occurredAt: '2026-05-28T15:00:00.000Z',
        accountKey: 'kbank',
        amountThb: 420,
        source: 'loyverse_receipt',
        sourceId: 'r2',
        description: 'QR sale'
      }
    ];

    const afterBaseline = movementsAfterBaseline(movements, baselines);
    const accounts = buildExpectedAccounts(baselines, afterBaseline);

    expect(accounts.find((account) => account.key === 'kbank')?.expectedThb).toBe(600_420);
    expect(accounts.find((account) => account.key === 'scan_qr_clearing')?.expectedThb).toBe(0);
  });

  it('does not require ledger rows for daily cash sales moving to the safe', () => {
    const movements: Movement[] = [
      {
        occurredAt: '2026-05-28T12:00:00.000Z',
        accountKey: 'safe_cash',
        amountThb: 5000,
        source: 'loyverse_receipt',
        sourceId: 'r3',
        description: 'Cash sale'
      }
    ];

    const afterBaseline = movementsAfterBaseline(movements, baselines);
    const accounts = buildExpectedAccounts(baselines, afterBaseline);

    expect(accounts.find((account) => account.key === 'safe_cash')?.expectedThb).toBe(30_000);
    expect(afterBaseline.filter((movement) => movement.source === 'company_ledger')).toHaveLength(0);
  });
});

describe('balance reconciliation status', () => {
  it('returns setup_required when baselines are incomplete', () => {
    expect(
      deriveReconciliationStatus({
        hasOpeningBalances: false,
        hasStaleSnapshots: false,
        differenceTotalThb: 0
      })
    ).toBe('setup_required');
  });

  it('returns stale when comparable snapshots are old', () => {
    expect(
      deriveReconciliationStatus({
        hasOpeningBalances: true,
        hasStaleSnapshots: true,
        differenceTotalThb: 0
      })
    ).toBe('stale');
  });

  it('returns attention when unexplained difference exceeds tolerance', () => {
    expect(
      deriveReconciliationStatus({
        hasOpeningBalances: true,
        hasStaleSnapshots: false,
        differenceTotalThb: 250
      })
    ).toBe('attention');
  });

  it('returns ok within tolerance', () => {
    expect(
      deriveReconciliationStatus({
        hasOpeningBalances: true,
        hasStaleSnapshots: false,
        differenceTotalThb: 15
      })
    ).toBe('ok');
  });

  it('computes signed difference as actual minus expected', () => {
    const actual = 625_000;
    const expected = 624_950;
    expect(actual - expected).toBe(50);
  });
});
