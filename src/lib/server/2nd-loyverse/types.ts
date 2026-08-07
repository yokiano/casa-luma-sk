import type { LoyverseReceipt } from '$lib/receipts/types';
import type { CreateLoyverseReceiptPayload } from '$lib/server/loyverse-client';

export const SECOND_LOYVERSE_SOURCE = 'casa-luma-2nd-loyverse';
export const COHORT_ALGORITHM_VERSION = 'v2-payment-aware-sha256-cash-30pct';
export const COHORT_BUCKET_MOD = 10_000;
export const COHORT_SELECT_THRESHOLD = 3_000;

export type ReceiptPaymentCategory = 'scan' | 'credit_card' | 'cash' | 'unsupported';

export type TransferTrigger = 'webhook' | 'backfill' | 'manual' | 'reconcile';

export type TransferStatus =
  | 'not_selected'
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'ambiguous'
  | 'skipped_refund'
  | 'skipped_cancelled'
  | 'unsupported'
  | 'source_changed';

export type AttemptOutcome =
  | 'succeeded'
  | 'failed'
  | 'ambiguous'
  | 'skipped'
  | 'reconciled'
  | 'noop';

export type MirrorStage =
  | 'discover'
  | 'eligibility'
  | 'cohort'
  | 'claim'
  | 'inventory'
  | 'resolve_entities'
  | 'build_payload'
  | 'reconcile_marker'
  | 'post_receipt'
  | 'finalize'
  | 'notify';

export type MirrorErrorCode =
  | 'MIRROR_DISABLED'
  | 'CONFIG_MISSING'
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'SOURCE_FETCH'
  | 'TARGET_FETCH'
  | 'AMBIGUOUS_ENTITY_NAME'
  | 'INCOMPATIBLE_ENTITY'
  | 'ENTITY_NOT_FOUND'
  | 'UNSUPPORTED_RECEIPT'
  | 'UNSUPPORTED_COMPOSITE'
  | 'UNSUPPORTED_POINTS_DISCOUNT'
  | 'INVALID_PAYLOAD'
  | 'TARGET_VALIDATION'
  | 'TARGET_SERVER'
  | 'NETWORK'
  | 'AMBIGUOUS_POST'
  | 'DUPLICATE_TARGET_MARKER'
  | 'SOURCE_CHANGED'
  | 'PAYMENT_TYPE_MISSING'
  | 'CLAIM_FAILED'
  | 'UNKNOWN';

export interface SafeMirrorError {
  code: MirrorErrorCode;
  stage: MirrorStage;
  message: string;
  httpStatus?: number;
  entityType?: string;
  entityName?: string;
}

export interface SourceReceiptContext {
  sourceReceiptKey: string;
  merchantId: string;
  receiptNumber: string;
  eventType?: string;
  eventId?: number | null;
  receipt: LoyverseReceipt;
  sourceFingerprint: string;
  sourceUpdatedAt: string | null;
}

export interface CohortDecision {
  algorithmVersion: string;
  bucket: number;
  selected: boolean;
}

export interface MirrorAttemptResult {
  sourceReceiptKey: string;
  status: TransferStatus;
  outcome: AttemptOutcome;
  attemptNumber?: number;
  targetReceiptNumber?: string | null;
  targetOrderMarker?: string | null;
  error?: SafeMirrorError | null;
  notified?: boolean;
}

export interface ConsiderMirrorOptions {
  trigger: TransferTrigger;
  /** When true, force write path even if LOYVERSE_2_MIRROR_ENABLED is false (CLI --process). */
  forceProcess?: boolean;
  /** Skip target writes: discover/cohort only. */
  discoverOnly?: boolean;
  /** Reconcile ambiguous markers without POSTing. */
  reconcileOnly?: boolean;
  inventoryCache?: import('./entities/inventory').EntityInventoryCache;
}

export type WritableSalePayload = CreateLoyverseReceiptPayload;

export interface ResolvedSaleMapping {
  payload: WritableSalePayload;
  targetOrderMarker: string;
  fidelityNotes: string[];
}
