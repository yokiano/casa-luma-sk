import type { EmailAutomationHandler } from './types';
export const noneHandler: EmailAutomationHandler = {
  key: 'none', version: '1', supportedClassifications: ['ignore', 'review'], sideEffectRisk: 'none',
  validate: () => null,
  idempotencyKey: (_input, classification) => `none:${classification.subtype}`,
  execute: async () => ({ state: 'succeeded', message: 'No external action is configured.' }),
  reconcile: async () => ({ state: 'reconciled', message: 'No external record is needed.' })
};
