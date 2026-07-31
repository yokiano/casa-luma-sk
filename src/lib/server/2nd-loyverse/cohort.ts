import { createHash } from 'node:crypto';
import {
  COHORT_ALGORITHM_VERSION,
  COHORT_BUCKET_MOD,
  COHORT_SELECT_THRESHOLD,
  type CohortDecision
} from './types';

/**
 * Deterministic ~50% cohort from source receipt key.
 * Bucket is 0..9999; selected when bucket < 5000.
 */
export const computeCohortDecision = (
  sourceReceiptKey: string,
  algorithmVersion = COHORT_ALGORITHM_VERSION
): CohortDecision => {
  const digest = createHash('sha256').update(`${algorithmVersion}:${sourceReceiptKey}`).digest();
  const bucket = digest.readUInt32BE(0) % COHORT_BUCKET_MOD;
  return {
    algorithmVersion,
    bucket,
    selected: bucket < COHORT_SELECT_THRESHOLD
  };
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
