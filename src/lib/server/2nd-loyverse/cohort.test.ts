import { describe, expect, it } from 'vitest';
import { classifyReceiptPayment, computeCohortDecision } from './cohort';

describe('second Loyverse payment-aware selection', () => {
  it('selects scan and credit card receipts unconditionally', () => {
    expect(classifyReceiptPayment({ payments: [{ name: 'Scan' }] })).toBe('scan');
    expect(classifyReceiptPayment({ payments: [{ name: 'Credit Card' }] })).toBe('credit_card');
    expect(classifyReceiptPayment({ payments: [{ type: 'CREDIT_CARD' }] })).toBe('credit_card');
    expect(computeCohortDecision('merchant:scan-1', 'scan').selected).toBe(true);
    expect(computeCohortDecision('merchant:card-1', 'credit_card').selected).toBe(true);
  });

  it('uses the deterministic cash cohort and excludes other payment types', () => {
    const first = computeCohortDecision('merchant:cash-1', 'cash');
    const second = computeCohortDecision('merchant:cash-1', 'cash');

    expect(second).toEqual(first);
    expect(first.selected).toBe(first.bucket < 3_000);
    expect(computeCohortDecision('merchant:wire-1', 'unsupported').selected).toBe(false);
    expect(classifyReceiptPayment({ payments: [] })).toBe('unsupported');
  });
});
