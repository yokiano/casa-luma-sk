import { db } from './client';
import {
  createReceiptWebhookDedupeKey,
  getReceiptKey,
  ingestReceiptWebhookWithDb,
  recordWebhookProcessingError,
  type LoyverseReceiptWebhookPayload,
  type ReceiptWebhookIngestionResult
} from './ingest-receipt-core';

export type { LoyverseReceiptWebhookPayload, ReceiptWebhookIngestionResult };
export { createReceiptWebhookDedupeKey, getReceiptKey, recordWebhookProcessingError };

export const ingestReceiptWebhook = async (
  payload: LoyverseReceiptWebhookPayload
): Promise<ReceiptWebhookIngestionResult> => {
  return ingestReceiptWebhookWithDb(db, payload);
};
