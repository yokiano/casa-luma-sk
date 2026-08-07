import { createHash } from 'node:crypto';
import type { LoyverseReceipt } from '$lib/receipts/types';
import {
  COHORT_ALGORITHM_VERSION,
  COHORT_BUCKET_MOD,
  COHORT_SELECT_THRESHOLD,
  type CohortDecision,
  type ReceiptPaymentCategory
} from './types';
import { normalizeEntityName } from './normalize';

/**
 * The transfer builder collapses multiple source payments to the first payment
 * type, so selection uses that same primary payment.
 */
export const classifyReceiptPayment = (receipt: Pick<LoyverseReceipt, 'payments'>): ReceiptPaymentCategory => {
  const payment = receipt.payments?.[0];
  if (!payment) return 'unsupported';

  const values = [payment.name, payment.type]
    .map((value) => normalizeEntityName(value).replace(/[_-]+/g, ' '))
    .filter(Boolean);
  if (values.some((value) => value === 'cash' || value.startsWith('cash '))) return 'cash';
  if (values.some((value) => value === 'scan' || value.includes('scan') || value.includes('qr'))) return 'scan';
  if (
    values.some(
      (value) => value === 'card' || value === 'credit card' || value.includes('credit card')
    )
  ) {
    return 'credit_card';
  }
  return 'unsupported';
};

/**
 * Scan and credit card receipts are always selected. Cash receipts use a
 * deterministic 30% cohort. Other payment types are excluded.
 */
export const computeCohortDecision = (
  sourceReceiptKey: string,
  paymentCategory: ReceiptPaymentCategory,
  algorithmVersion = COHORT_ALGORITHM_VERSION
): CohortDecision => {
  const digest = createHash('sha256').update(`${algorithmVersion}:${sourceReceiptKey}`).digest();
  const bucket = digest.readUInt32BE(0) % COHORT_BUCKET_MOD;
  const selected =
    paymentCategory === 'scan' || paymentCategory === 'credit_card'
      ? true
      : paymentCategory === 'cash' && bucket < COHORT_SELECT_THRESHOLD;

  return { algorithmVersion, bucket, selected };
};

export const buildSourceReceiptKey = (merchantId: string, receiptNumber: string): string =>
  `${merchantId}:${receiptNumber}`;

export const buildTargetOrderMarker = (sourceReceiptKey: string): string => {
  // Loyverse `order` max length is 20 characters.
  const digest = createHash('sha256').update(`lv2-order:${sourceReceiptKey}`).digest('hex').slice(0, 16);
  return `lv2:${digest}`;
};

export const buildSourceFingerprint = (input: {
  receiptNumber: string;
  updatedAt?: string | null;
  cancelledAt?: string | null;
  totalMoney?: number | null;
  lineCount?: number;
}): string => {
  const payload = [
    input.receiptNumber,
    input.updatedAt ?? '',
    input.cancelledAt ?? '',
    input.totalMoney ?? '',
    input.lineCount ?? 0
  ].join('|');
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
};

export const buildRequestFingerprint = (payload: unknown): string => {
  const json = JSON.stringify(payload);
  return createHash('sha256').update(json).digest('hex').slice(0, 32);
};
