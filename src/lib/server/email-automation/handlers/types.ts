import type { EmailAutomationInput, EmailClassification } from '../classifier';

export type HandlerExecutionContext = { input: EmailAutomationInput; classification: EmailClassification; eventId: number; actionId: number };
export type HandlerResult = { state: 'succeeded' | 'reconciled' | 'review'; externalObjectId?: string; externalUrl?: string; message: string };
export type EmailAutomationHandler = {
  key: string;
  version: string;
  supportedClassifications: readonly EmailClassification['classification'][];
  sideEffectRisk: 'none' | 'external_write';
  validate: (classification: EmailClassification) => string | null;
  idempotencyKey: (input: EmailAutomationInput, classification: EmailClassification) => string;
  execute: (context: HandlerExecutionContext) => Promise<HandlerResult>;
  reconcile: (context: HandlerExecutionContext) => Promise<HandlerResult>;
};
