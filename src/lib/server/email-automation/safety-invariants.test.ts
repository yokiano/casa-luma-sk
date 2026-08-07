import { describe, expect, it } from 'vitest';
import { isCurrentLease, redactAutomationError } from './store';
import { canReconcileActionState } from './reconcile';
import { renderDurableEmailAutomationNotification } from './notifications/render';
import { applyEmailAutomationSafetyPolicy, evaluateLedgerAutomationPolicy, LEDGER_AMOUNT_LIMIT_REASON, LEDGER_AUTOMATION_NOT_ENABLED_REASON, LEDGER_MIME_INCOMPLETE_REASON, LEDGER_REQUIRED_FIELDS_REASON, LEDGER_SENDER_NOT_ALLOWED_REASON } from './ledger-safety';

const input = { receivedAt: '2026-07-11T00:00:00Z', from: 'Bank <bank@example.test>', to: 'automation@example.test', subject: 'Transfer', attachmentCount: 0, mime: { completeness: 'complete' as const } };
const kshopInput = {
  receivedAt: '2026-08-07T03:30:00.000Z',
  from: 'Surisa Surisa <surisa0737@gmail.com>',
  to: 'automations@casalumakpg.com',
  subject: 'Fwd: K SHOP Daily Settlement Summary',
  attachmentCount: 0,
  textBody: [
    '---------- Forwarded message ---------',
    'From: KSHOP <KPLUSSHOP@kasikornbank.com>',
    'Date: Fri, 07 Aug 2026 09:00:00 +0700',
    'Subject: K SHOP Daily Settlement Summary',
    'To: surisa0737@gmail.com',
    '',
    'K SHOP daily settlement summary was completed successfully for CASA LUMA KPG.',
    'Merchant Code: SHOP',
    'ยอดเงินจำนวน(บาท): 99.99'
  ].join('\n'),
  mime: { completeness: 'complete' as const }
};
const classification = { classification: 'expense' as const, subtype: 'transfer_success', processingState: 'ready' as const, notify: true, handlerKey: 'company_ledger_expense', externalRef: 'ABC123456', amountMinor: 9999, currency: 'THB' };
const incomeClassification = { classification: 'income' as const, subtype: 'kshop_daily_settlement', processingState: 'ready' as const, notify: true, handlerKey: 'financial_ledger_income', externalRef: 'kshop:SHOP:2026-08-07', amountMinor: 9999, currency: 'THB' };

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
    const blocked = renderDurableEmailAutomationNotification(input, classification, { actionStatus: 'failed', actionMessage: LEDGER_AUTOMATION_NOT_ENABLED_REASON });
    expect(blocked).toContain('safety-blocked');
    expect(blocked).toContain('before any external change');
  });

  it('keeps expense automation gated by the dashboard switch and sender allowlist', () => {
    const policyResult = applyEmailAutomationSafetyPolicy(input, classification, false);
    expect(policyResult.processingState).toBe('review');
    expect(policyResult.reviewReason).toBe(LEDGER_AUTOMATION_NOT_ENABLED_REASON);

    const missingSender = evaluateLedgerAutomationPolicy(input, classification, true, [], 100);
    expect(missingSender.allowed).toBe(false);
    expect(missingSender.reason).toBe(LEDGER_AUTOMATION_NOT_ENABLED_REASON);
  });

  it('allows exact K SHOP income without the dashboard switch or sender allowlist', () => {
    const policy = evaluateLedgerAutomationPolicy(kshopInput, incomeClassification, false, [], 100);
    expect(policy.allowed).toBe(true);
    expect(applyEmailAutomationSafetyPolicy(kshopInput, incomeClassification, false, [])).toMatchObject({
      processingState: 'ready'
    });

    const malformed = evaluateLedgerAutomationPolicy({ ...kshopInput, textBody: kshopInput.textBody.replace('CASA LUMA KPG', 'Other Merchant') }, incomeClassification, false, [], 100);
    expect(malformed.allowed).toBe(false);
    expect(malformed.reason).toBe(LEDGER_REQUIRED_FIELDS_REASON);
  });

  it('keeps MIME, positive amount, and amount-limit safeguards on K SHOP income', () => {
    expect(evaluateLedgerAutomationPolicy({ ...kshopInput, mime: { completeness: 'partial' as const } }, incomeClassification, false, [], 100).reason).toBe(LEDGER_MIME_INCOMPLETE_REASON);
    expect(evaluateLedgerAutomationPolicy(kshopInput, { ...incomeClassification, amountMinor: 0 }, false, [], 100).reason).toBe(LEDGER_REQUIRED_FIELDS_REASON);
    expect(evaluateLedgerAutomationPolicy(kshopInput, incomeClassification, false, [], 50).reason).toContain(LEDGER_AMOUNT_LIMIT_REASON);
  });

  it('allows production automation only for configured senders within the amount and MIME safeguards', () => {
    const allowed = evaluateLedgerAutomationPolicy({ ...input, from: 'Bank <bank@example.test>' }, { ...classification, externalRef: 'ABC123456', amountMinor: 9999, currency: 'THB' }, true, ['example.test'], 100);
    expect(allowed.allowed).toBe(true);
    const blocked = evaluateLedgerAutomationPolicy({ ...input, from: 'Bank <bank@evil.test>' }, { ...classification, externalRef: 'ABC123456', amountMinor: 9999, currency: 'THB' }, true, ['example.test'], 100);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe(LEDGER_SENDER_NOT_ALLOWED_REASON);
    const allowedIncome = evaluateLedgerAutomationPolicy(kshopInput, incomeClassification, false, [], 100);
    expect(allowedIncome.allowed).toBe(true);
    const mismatchedHandler = evaluateLedgerAutomationPolicy(input, { ...incomeClassification, classification: 'expense', handlerKey: 'financial_ledger_income' }, true, ['example.test'], 100);
    expect(mismatchedHandler.allowed).toBe(false);
  });
});
