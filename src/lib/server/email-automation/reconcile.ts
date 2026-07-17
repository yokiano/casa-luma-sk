import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAutomationActions, emailAutomationAuditLog, emailEvents } from '$lib/server/db/schema';
import { getEmailAutomationHandler } from './handlers/registry';
import type { EmailAutomationInput, EmailClassification } from './classifier';
import { evaluateLedgerAutomationPolicy, isCompanyLedgerHandler } from './ledger-safety';
import { loadAutomationSettings } from './settings';

const ELIGIBLE_RECONCILIATION_STATES = ['failed', 'retry_scheduled'] as const;
export const canReconcileActionState = (state: string) => (ELIGIBLE_RECONCILIATION_STATES as readonly string[]).includes(state);

export const reconcileEmailAutomationAction = async (actionId: number, reason: string) => {
  if (!reason.trim()) throw new Error('A reconciliation reason is required.');
  const leaseToken = `reconcile-${randomUUID()}`;
  const now = new Date();
  const [action] = await db.update(emailAutomationActions).set({ status: 'claimed', leaseToken, leaseExpiresAt: new Date(now.getTime() + 5 * 60_000), updatedAt: now }).where(and(eq(emailAutomationActions.id, actionId), inArray(emailAutomationActions.status, [...ELIGIBLE_RECONCILIATION_STATES]))).returning();
  if (!action) throw new Error('Only failed or retry-scheduled actions can be reconciled. Refresh the event first.');
  const handler = getEmailAutomationHandler(action.handlerKey);
  if (!handler) throw new Error(`Unknown handler ${action.handlerKey}.`);
  const snapshot = action.payloadSnapshot as { input: EmailAutomationInput; classification: EmailClassification };
  let result;
  try {
    if (isCompanyLedgerHandler(action.handlerKey)) {
      const settings = await loadAutomationSettings();
      const policy = evaluateLedgerAutomationPolicy(snapshot.input, snapshot.classification, settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
      if (!policy.allowed) {
        result = { state: 'review' as const, message: policy.reason ?? policy.status.nextAction };
      } else {
        result = await handler.reconcile({ ...snapshot, actionId });
      }
    } else {
      result = await handler.reconcile({ ...snapshot, actionId });
    }
  } catch (error) {
    await db.update(emailAutomationActions).set({ status: 'failed', leaseToken: null, leaseExpiresAt: null, updatedAt: new Date() }).where(and(eq(emailAutomationActions.id, actionId), eq(emailAutomationActions.status, 'claimed'), eq(emailAutomationActions.leaseToken, leaseToken)));
    throw error;
  }
  const projectedStatus = result.state === 'reconciled' ? 'reconciled' : 'failed';
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(emailAutomationActions).set({ status: projectedStatus, outcome: result, externalObjectId: result.externalObjectId, leaseToken: null, leaseExpiresAt: null, completedAt: result.state === 'reconciled' ? new Date() : null, updatedAt: new Date() }).where(and(eq(emailAutomationActions.id, actionId), eq(emailAutomationActions.status, 'claimed'), eq(emailAutomationActions.leaseToken, leaseToken))).returning({ id: emailAutomationActions.id });
    if (!updated) throw new Error('Reconciliation lease was lost; the stale result was discarded.');
    await tx.update(emailEvents).set({ processingState: result.state === 'reconciled' ? 'reconciled' : 'review', notionPageId: result.externalObjectId, reviewReason: result.state === 'review' ? result.message : null, processedAt: new Date() }).where(eq(emailEvents.actionId, actionId));
    await tx.insert(emailAutomationAuditLog).values({ eventId: action.eventId, actionId, action: 'reconcile', reason, before: { status: action.status }, after: { status: projectedStatus, message: result.message, externalObjectId: result.externalObjectId } });
  });
  return result;
};
