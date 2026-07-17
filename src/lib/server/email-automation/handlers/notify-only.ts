import { createHash } from 'node:crypto';
import type { EmailAutomationHandler } from './types';

/** Notification-only work is per received event, not per subtype. */
const notificationEventKey = (input: Parameters<EmailAutomationHandler['idempotencyKey']>[0]) =>
  createHash('sha256').update([
    input.messageId?.trim() ?? '', input.from.trim().toLowerCase(), input.to.trim().toLowerCase(), input.subject.trim(), input.receivedAt
  ].join('\n')).digest('hex');

export const notifyOnlyHandler: EmailAutomationHandler = {
  key: 'notify_only', version: '1', supportedClassifications: ['review', 'income', 'expense'], sideEffectRisk: 'none',
  validate: () => null,
  idempotencyKey: (input) => `notify:${notificationEventKey(input)}`,
  execute: async () => ({ state: 'succeeded', message: 'No external action is configured; notification is handled separately.' }),
  reconcile: async () => ({ state: 'reconciled', message: 'No external record is needed.' })
};
