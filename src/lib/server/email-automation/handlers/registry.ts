import type { EmailClassification } from '../classifier';
import { companyLedgerExpenseHandler } from './company-ledger-expense';
import { noneHandler } from './none';
import { notifyOnlyHandler } from './notify-only';
import type { EmailAutomationHandler } from './types';

const handlers = [companyLedgerExpenseHandler, notifyOnlyHandler, noneHandler] as const;
const byKey = new Map<string, EmailAutomationHandler>();
for (const handler of handlers) {
  if (byKey.has(handler.key)) throw new Error(`Duplicate email automation handler: ${handler.key}`);
  byKey.set(handler.key, handler);
}
export const getEmailAutomationHandler = (key?: string | null) => key ? byKey.get(key) : undefined;
export const validateHandler = (classification: EmailClassification) => {
  const handler = getEmailAutomationHandler(classification.handlerKey);
  if (!handler) return { handler: undefined, error: `Unknown automation handler: ${classification.handlerKey ?? 'none'}.` };
  if (!handler.supportedClassifications.includes(classification.classification)) return { handler, error: `${handler.key} does not support ${classification.classification}.` };
  return { handler, error: handler.validate(classification) };
};
export const emailAutomationHandlers = [...handlers];
