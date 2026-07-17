import { emailAutomationAuditLog } from '$lib/server/db/schema';

export const auditEmailAutomation = async (
  tx: { insert: Function },
  entry: { eventId?: number; actionId?: number; actor?: string; action: string; reason?: string; before?: unknown; after?: unknown }
) => tx.insert(emailAutomationAuditLog).values({
  eventId: entry.eventId, actionId: entry.actionId, actor: entry.actor ?? 'manager', action: entry.action,
  reason: entry.reason, before: entry.before ?? {}, after: entry.after ?? {}
});
