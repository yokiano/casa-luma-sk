import { describe, expect, it } from 'vitest';
import { isCurrentLease, redactAutomationError } from './store';
import { canReconcileActionState } from './reconcile';
import { renderDurableEmailAutomationNotification } from './notifications/render';
import { applyEmailAutomationSafetyPolicy, evaluateLedgerAutomationPolicy, LEDGER_CANARY_NOT_ENABLED_REASON, LEDGER_SENDER_NOT_ALLOWED_REASON } from './ledger-safety';

const input = { receivedAt: '2026-07-11T00:00:00Z', from: 'Bank <bank@example.test>', to: 'automation@example.test', subject: 'Transfer', attachmentCount: 0, mime: { completeness: 'complete' as const } };
const classification = { classification: 'expense' as const, subtype: 'transfer_success', processingState: 'ready' as const, notify: true, handlerKey: 'company_ledger_expense', externalRef: 'ABC123456', amountMinor: 9999, currency: 'THB' };

describe('durable safety invariants', () => {
  it('redacts sensitive provider errors before persistence', () => {
    expect(redactAutomationError('Failure for person@example.com account 123456789012')).toBe('Failure for [email redacted] account [number redacted]');
  });

  it('accepts only the current claimed lease token', () => {
    expect(isCurrentLease('claimed', 'new-token', 'new-token')).toBe(true);
    expect(isCurrentLease('claimed', 'new-token', 'old-token')).toBe(false);
    expect(isCurrentLease('retry_scheduled', 'new-token', 'new-token')).toBe(false);
  });

  it('restricts reconciliation to recoverable terminal states', () => {
    expect(canReconcileActionState('failed')).toBe(true);
    expect(canReconcileActionState('retry_scheduled')).toBe(true);
    expect(canReconcileActionState('succeeded')).toBe(false);
    expect(canReconcileActionState('claimed')).toBe(false);
  });

  it('renders persisted created and reconciled outcomes with external IDs', () => {
    const created = renderDurableEmailAutomationNotification(input, classification, { actionStatus: 'succeeded', externalObjectId: 'ledger-created' });
    const reconciled = renderDurableEmailAutomationNotification(input, classification, { actionStatus: 'reconciled', externalObjectId: 'ledger-existing' });
    expect(created).toContain('Financial Ledger record created');
    expect(created).toContain('ledger-created');
    expect(reconciled).toContain('verified and linked');
    expect(reconciled).toContain('ledger-existing');
    expect(reconciled).not.toContain('No external action was run');
  });

  it('distinguishes retry, external failure, and safety blocking truthfully', () => {
    expect(renderDurableEmailAutomationNotification(input, classification, { actionStatus: 'retry_scheduled' })).toContain('retry was scheduled');
    expect(renderDurableEmailAutomationNotification(input, classification, { actionStatus: 'failed' })).toContain('failed permanently');
    const blocked = renderDurableEmailAutomationNotification(input, classification, { actionStatus: 'failed', actionMessage: LEDGER_CANARY_NOT_ENABLED_REASON });
    expect(blocked).toContain('safety-blocked');
    expect(blocked).toContain('before any external change');
  });

  it('blocks ready Ledger classifications unless the explicit canary gates are satisfied', () => {
    const policyResult = applyEmailAutomationSafetyPolicy(input, classification, false);
    expect(policyResult.processingState).toBe('review');
    expect(policyResult.reviewReason).toBe(LEDGER_CANARY_NOT_ENABLED_REASON);
  });

  it('allows the canary only for configured senders within the amount and MIME safeguards', () => {
    process.env.EMAIL_AUTOMATION_LEDGER_CANARY_ENABLED = 'true';
    const allowed = evaluateLedgerAutomationPolicy({ ...input, from: 'Bank <bank@example.test>' }, { ...classification, externalRef: 'ABC123456', amountMinor: 9999, currency: 'THB' }, true, ['example.test'], 100);
    expect(allowed.allowed).toBe(true);
    const blocked = evaluateLedgerAutomationPolicy({ ...input, from: 'Bank <bank@evil.test>' }, { ...classification, externalRef: 'ABC123456', amountMinor: 9999, currency: 'THB' }, true, ['example.test'], 100);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe(LEDGER_SENDER_NOT_ALLOWED_REASON);
    delete process.env.EMAIL_AUTOMATION_LEDGER_CANARY_ENABLED;
  });
});
