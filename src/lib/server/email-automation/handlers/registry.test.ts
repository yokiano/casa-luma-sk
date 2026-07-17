import { describe, expect, it } from 'vitest';
import { getEmailAutomationHandler, validateHandler } from './registry';

describe('email automation handler registry', () => {
  it('builds deterministic ledger idempotency keys', () => {
    const handler = getEmailAutomationHandler('company_ledger_expense');
    expect(handler?.idempotencyKey({} as any, { classification: 'expense', subtype: 'x', processingState: 'ready', externalRef: 'ABC', amountMinor: 100, notify: true, handlerKey: 'company_ledger_expense' })).toBe('ledger-expense:ABC:100');
  });
  it('uses a per-email key for notification-only work', () => {
    const handler = getEmailAutomationHandler('notify_only');
    const classification = { classification: 'review' as const, subtype: 'x', processingState: 'review' as const, notify: true, handlerKey: 'notify_only' };
    const first = handler?.idempotencyKey({ messageId: '<first>', from: 'bank@example.test', to: 'auto@example.test', subject: 'Review', receivedAt: '2026-07-12T00:00:00Z', attachmentCount: 0 }, classification);
    const second = handler?.idempotencyKey({ messageId: '<second>', from: 'bank@example.test', to: 'auto@example.test', subject: 'Review', receivedAt: '2026-07-12T00:00:00Z', attachmentCount: 0 }, classification);
    expect(first).not.toBe(second);
  });
  it('fails closed for an unknown handler', () => {
    expect(validateHandler({ classification: 'expense', subtype: 'x', processingState: 'ready', notify: true, handlerKey: 'missing' }).error).toMatch(/Unknown/);
  });
});
