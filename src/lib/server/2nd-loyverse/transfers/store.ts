import { and, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { MirrorDatabase } from '../db/types';
import {
  secondLoyverseReceiptAttempts,
  secondLoyverseReceiptTransfers
} from '../db/schema';
import type { AttemptOutcome, SafeMirrorError, TransferStatus, TransferTrigger } from '../types';

export type TransferRow = typeof secondLoyverseReceiptTransfers.$inferSelect;

export const getTransferByKey = async (db: MirrorDatabase, sourceReceiptKey: string) => {
  const rows = await db
    .select()
    .from(secondLoyverseReceiptTransfers)
    .where(eq(secondLoyverseReceiptTransfers.sourceReceiptKey, sourceReceiptKey))
    .limit(1);
  return rows[0] ?? null;
};

export const upsertTransferDiscovery = async (
  db: MirrorDatabase,
  input: {
    sourceReceiptKey: string;
    sourceMerchantId: string;
    sourceReceiptNumber: string;
    sourceEventType?: string | null;
    sourceEventId?: number | null;
    sourceUpdatedAt?: Date | null;
    sourceFingerprint: string;
    cohortAlgorithmVersion: string;
    cohortBucket: number;
    cohortSelected: boolean;
    status: TransferStatus;
    targetOrderMarker: string;
  }
): Promise<TransferRow> => {
  const existing = await getTransferByKey(db, input.sourceReceiptKey);
  const now = new Date();

  if (!existing) {
    const inserted = await db
      .insert(secondLoyverseReceiptTransfers)
      .values({
        sourceReceiptKey: input.sourceReceiptKey,
        sourceMerchantId: input.sourceMerchantId,
        sourceReceiptNumber: input.sourceReceiptNumber,
        sourceEventType: input.sourceEventType ?? null,
        sourceEventId: input.sourceEventId ?? null,
        sourceUpdatedAt: input.sourceUpdatedAt ?? null,
        sourceFingerprint: input.sourceFingerprint,
        cohortAlgorithmVersion: input.cohortAlgorithmVersion,
        cohortBucket: input.cohortBucket,
        cohortSelected: input.cohortSelected,
        status: input.status,
        targetOrderMarker: input.targetOrderMarker,
        firstSeenAt: now,
        lastSeenAt: now,
        updatedAt: now
      })
      .returning();
    return inserted[0];
  }

  const isTerminal = existing.status === 'succeeded' || existing.status === 'ambiguous';
  const algorithmChanged = existing.cohortAlgorithmVersion !== input.cohortAlgorithmVersion;

  // Cohort decisions stay fixed within an algorithm version. A version change is
  // an intentional policy migration, so reclassify non-terminal rows once.
  let nextStatus = existing.status as TransferStatus;
  if (isTerminal) {
    nextStatus = existing.sourceFingerprint !== input.sourceFingerprint ? 'source_changed' : (existing.status as TransferStatus);
  } else if (
    existing.status === 'skipped_refund' ||
    existing.status === 'skipped_cancelled' ||
    existing.status === 'unsupported'
  ) {
    nextStatus = existing.status as TransferStatus;
  } else if (algorithmChanged) {
    nextStatus = input.status === 'queued' && !input.cohortSelected ? 'not_selected' : input.status;
  } else if (existing.status === 'not_selected' && existing.sourceFingerprint === input.sourceFingerprint) {
    nextStatus = existing.status as TransferStatus;
  } else if (existing.status === 'not_selected') {
    // A changed source receipt may have a new payment type, so apply the
    // current selection policy instead of preserving the stale decision.
    nextStatus = input.status === 'queued' && !input.cohortSelected ? 'not_selected' : input.status;
  } else if (input.status === 'queued' && (existing.status === 'failed' || existing.status === 'queued')) {
    nextStatus = existing.status as TransferStatus;
  } else {
    nextStatus = input.status;
  }

  // Refresh marker for non-terminal rows so algorithm fixes (e.g. max length) apply.
  const nextMarker = isTerminal ? (existing.targetOrderMarker ?? input.targetOrderMarker) : input.targetOrderMarker;
  const cohortUpdate = algorithmChanged && !isTerminal
    ? {
        cohortAlgorithmVersion: input.cohortAlgorithmVersion,
        cohortBucket: input.cohortBucket,
        cohortSelected: input.cohortSelected
      }
    : {};

  const updated = await db
    .update(secondLoyverseReceiptTransfers)
    .set({
      sourceEventType: input.sourceEventType ?? existing.sourceEventType,
      sourceEventId: input.sourceEventId ?? existing.sourceEventId,
      sourceUpdatedAt: input.sourceUpdatedAt ?? existing.sourceUpdatedAt,
      sourceFingerprint: input.sourceFingerprint,
      status: nextStatus,
      targetOrderMarker: nextMarker,
      ...cohortUpdate,
      lastSeenAt: now,
      updatedAt: now
    })
    .where(eq(secondLoyverseReceiptTransfers.sourceReceiptKey, input.sourceReceiptKey))
    .returning();

  return updated[0];
};

export const claimTransfer = async (
  db: MirrorDatabase,
  sourceReceiptKey: string,
  eligibleStatuses: TransferStatus[] = ['queued', 'failed']
): Promise<{ transfer: TransferRow; attemptNumber: number; processingToken: string } | null> => {
  const processingToken = randomUUID();
  const now = new Date();

  const claimed = await db
    .update(secondLoyverseReceiptTransfers)
    .set({
      status: 'processing',
      processingToken,
      processingStartedAt: now,
      startedAt: now,
      attemptCount: sql`${secondLoyverseReceiptTransfers.attemptCount} + 1`,
      updatedAt: now
    })
    .where(
      and(
        eq(secondLoyverseReceiptTransfers.sourceReceiptKey, sourceReceiptKey),
        inArray(secondLoyverseReceiptTransfers.status, eligibleStatuses)
      )
    )
    .returning();

  if (!claimed[0]) return null;

  return {
    transfer: claimed[0],
    attemptNumber: claimed[0].attemptCount,
    processingToken
  };
};

export const insertAttemptStart = async (
  db: MirrorDatabase,
  input: {
    sourceReceiptKey: string;
    attemptNumber: number;
    trigger: TransferTrigger;
    stage: string;
  }
) => {
  const rows = await db
    .insert(secondLoyverseReceiptAttempts)
    .values({
      sourceReceiptKey: input.sourceReceiptKey,
      attemptNumber: input.attemptNumber,
      trigger: input.trigger,
      stage: input.stage,
      outcome: 'noop'
    })
    .returning();
  return rows[0];
};

export const finalizeAttempt = async (
  db: MirrorDatabase,
  input: {
    attemptId: number;
    sourceReceiptKey: string;
    processingToken: string;
    status: TransferStatus;
    outcome: AttemptOutcome;
    stage: string;
    requestFingerprint?: string | null;
    httpStatus?: number | null;
    responseSummary?: string | null;
    error?: SafeMirrorError | null;
    targetReceiptNumber?: string | null;
    targetReceiptDate?: Date | null;
    targetOrderMarker?: string | null;
    incidentId?: number | null;
    notified?: boolean;
  }
) => {
  const now = new Date();

  await db
    .update(secondLoyverseReceiptAttempts)
    .set({
      stage: input.stage,
      outcome: input.outcome,
      finishedAt: now,
      requestFingerprint: input.requestFingerprint ?? null,
      httpStatus: input.httpStatus ?? null,
      responseSummary: input.responseSummary ?? null,
      errorCode: input.error?.code ?? null,
      errorMessage: input.error?.message ?? null,
      targetReceiptNumber: input.targetReceiptNumber ?? null,
      incidentId: input.incidentId ?? null,
      notified: input.notified ?? false
    })
    .where(eq(secondLoyverseReceiptAttempts.id, input.attemptId));

  await db
    .update(secondLoyverseReceiptTransfers)
    .set({
      status: input.status,
      processingToken: null,
      processingStartedAt: null,
      targetReceiptNumber: input.targetReceiptNumber ?? undefined,
      targetReceiptDate: input.targetReceiptDate ?? undefined,
      targetOrderMarker: input.targetOrderMarker ?? undefined,
      lastErrorCode: input.error?.code ?? null,
      lastErrorStage: input.error?.stage ?? null,
      lastErrorMessage: input.error?.message ?? null,
      lastErrorHttpStatus: input.error?.httpStatus ?? null,
      succeededAt: input.status === 'succeeded' ? now : undefined,
      updatedAt: now
    })
    .where(
      and(
        eq(secondLoyverseReceiptTransfers.sourceReceiptKey, input.sourceReceiptKey),
        eq(secondLoyverseReceiptTransfers.processingToken, input.processingToken)
      )
    );
};
