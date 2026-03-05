import { db } from './client';
import {
  ingestReceiptWebhookWithDb,
  type LoyverseReceiptWebhookPayload
} from './ingest-receipt-core';

export type { LoyverseReceiptWebhookPayload };

export const ingestReceiptWebhook = async (payload: LoyverseReceiptWebhookPayload) => {
  return ingestReceiptWebhookWithDb(db, payload);
};
