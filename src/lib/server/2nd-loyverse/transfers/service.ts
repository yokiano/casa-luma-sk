import type { LoyverseReceipt } from '$lib/receipts/types';
import type { MirrorDatabase } from '../db/types';
import type { ReportIncidentInput, ReportIncidentResult } from '$lib/server/incidents/types';
import { sanitizeErrorMessage, toSafeMirrorError, isAmbiguousPostError, SecondLoyverseError } from '../errors';
import {
  buildSourceFingerprint,
  buildSourceReceiptKey,
  buildTargetOrderMarker,
  classifyReceiptPayment,
  computeCohortDecision,
  buildRequestFingerprint
} from '../cohort';
import { createSecondLoyverseClients, type SecondLoyverseClients } from '../clients';
import { loadSecondLoyverseConfig, type SecondLoyverseConfigInput } from '../config';
import { EntityInventoryCache } from '../entities/inventory';
import { evaluateReceiptEligibility } from '../receipts/eligibility';
import { buildWritableSalePayload } from '../receipts/builder';
import { assertCompatibleExistingReceipt, reconcileTargetMarker } from '../receipts/reconcile';
import {
  claimTransfer,
  finalizeAttempt,
  getTransferByKey,
  insertAttemptStart,
  upsertTransferDiscovery
} from './store';
import type {
  ConsiderMirrorOptions,
  MirrorAttemptResult,
  SourceReceiptContext,
  TransferStatus
} from '../types';

export interface MirrorRuntime {
  db: MirrorDatabase;
  clients?: SecondLoyverseClients;
  env?: SecondLoyverseConfigInput & { LOYVERSE_ACCESS_TOKEN?: string };
  inventoryCache?: EntityInventoryCache;
  reportIncident?: (input: ReportIncidentInput) => Promise<ReportIncidentResult | unknown>;
}

const toDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildSourceContext = (input: {
  merchantId: string;
  receipt: LoyverseReceipt;
  eventType?: string;
  eventId?: number | null;
}): SourceReceiptContext => {
  const sourceReceiptKey = buildSourceReceiptKey(input.merchantId, input.receipt.receipt_number);
  return {
    sourceReceiptKey,
    merchantId: input.merchantId,
    receiptNumber: input.receipt.receipt_number,
    eventType: input.eventType,
    eventId: input.eventId ?? null,
    receipt: input.receipt,
    sourceFingerprint: buildSourceFingerprint({
      receiptNumber: input.receipt.receipt_number,
      updatedAt: input.receipt.updated_at,
      cancelledAt: input.receipt.cancelled_at,
      totalMoney: input.receipt.total_money,
      lineCount: input.receipt.line_items?.length ?? 0
    }),
    sourceUpdatedAt: input.receipt.updated_at ?? input.receipt.receipt_date ?? null
  };
};

const discoverTransfer = async (
  runtime: MirrorRuntime,
  context: SourceReceiptContext,
  status: TransferStatus
) => {
  const cohort = computeCohortDecision(
    context.sourceReceiptKey,
    classifyReceiptPayment(context.receipt)
  );
  return upsertTransferDiscovery(runtime.db, {
    sourceReceiptKey: context.sourceReceiptKey,
    sourceMerchantId: context.merchantId,
    sourceReceiptNumber: context.receiptNumber,
    sourceEventType: context.eventType,
    sourceEventId: context.eventId,
    sourceUpdatedAt: toDate(context.sourceUpdatedAt),
    sourceFingerprint: context.sourceFingerprint,
    cohortAlgorithmVersion: cohort.algorithmVersion,
    cohortBucket: cohort.bucket,
    cohortSelected: cohort.selected,
    status: status === 'queued' && !cohort.selected ? 'not_selected' : status,
    targetOrderMarker: buildTargetOrderMarker(context.sourceReceiptKey)
  });
};

const notifyLiveFailure = async (
  runtime: MirrorRuntime,
  input: {
    trigger: ConsiderMirrorOptions['trigger'];
    context: SourceReceiptContext;
    attemptId: number;
    error: ReturnType<typeof toSafeMirrorError>;
    status: TransferStatus;
  }
) => {
  if (input.trigger !== 'webhook') return { notified: false, incidentId: null as number | null };

  let report = runtime.reportIncident;
  if (!report) {
    const { incidentReporter } = await import('$lib/server/incidents');
    report = (payload) => incidentReporter.report(payload);
  }
  try {
    const result = await report({
      source: '2nd-loyverse',
      code: 'SECOND_LOYVERSE_LIVE_TRANSFER_FAILED',
      severity: input.status === 'ambiguous' ? 'warning' : 'critical',
      message: `Second Loyverse live transfer ${input.status}: ${input.context.sourceReceiptKey}`,
      merchantId: input.context.merchantId,
      receiptKey: input.context.sourceReceiptKey,
      notify: true,
      context: {
        attemptId: input.attemptId,
        stage: input.error.stage,
        errorCode: input.error.code,
        httpStatus: input.error.httpStatus,
        status: input.status,
        nextAction:
          input.status === 'ambiguous'
            ? 'Run pnpm 2nd-loyverse:backfill -- --ambiguous-only --reconcile'
            : 'Inspect error, fix entities/code, rerun --failed-only'
      },
      error: new Error(input.error.message)
    });
    const incidentId =
      result && typeof result === 'object' && 'incidentId' in result
        ? ((result as { incidentId: number | null }).incidentId ?? null)
        : null;
    const notified =
      result && typeof result === 'object' && 'notified' in result
        ? Boolean((result as { notified: boolean }).notified)
        : true;
    return { notified, incidentId };
  } catch (notifyError) {
    console.error('[2nd-loyverse] telegram notify failed', sanitizeErrorMessage(String(notifyError)));
    return { notified: false, incidentId: null };
  }
};

const runMirrorAttempt = async (
  runtime: MirrorRuntime,
  context: SourceReceiptContext,
  options: ConsiderMirrorOptions
): Promise<MirrorAttemptResult> => {
  const clients =
    runtime.clients ??
    createSecondLoyverseClients({
      env: runtime.env
    });

  const claim = await claimTransfer(
    runtime.db,
    context.sourceReceiptKey,
    options.reconcileOnly ? ['ambiguous'] : ['queued', 'failed']
  );
  if (!claim) {
    const current = await getTransferByKey(runtime.db, context.sourceReceiptKey);
    return {
      sourceReceiptKey: context.sourceReceiptKey,
      status: (current?.status as TransferStatus) ?? 'queued',
      outcome: 'noop'
    };
  }

  const attempt = await insertAttemptStart(runtime.db, {
    sourceReceiptKey: context.sourceReceiptKey,
    attemptNumber: claim.attemptNumber,
    trigger: options.trigger,
    stage: 'inventory'
  });

  try {
    if (options.reconcileOnly) {
      const marker = claim.transfer.targetOrderMarker ?? buildTargetOrderMarker(context.sourceReceiptKey);
      const reconciled = await reconcileTargetMarker({
        targetClient: clients.target,
        orderMarker: marker
      });
      if (reconciled.action === 'already_exists' && reconciled.receipt) {
        assertCompatibleExistingReceipt(reconciled.receipt, marker);
        await finalizeAttempt(runtime.db, {
          attemptId: attempt.id,
          sourceReceiptKey: context.sourceReceiptKey,
          processingToken: claim.processingToken,
          status: 'succeeded',
          outcome: 'reconciled',
          stage: 'reconcile_marker',
          targetReceiptNumber: reconciled.receipt.receipt_number,
          targetReceiptDate: toDate(reconciled.receipt.receipt_date),
          targetOrderMarker: marker
        });
        return {
          sourceReceiptKey: context.sourceReceiptKey,
          status: 'succeeded',
          outcome: 'reconciled',
          attemptNumber: claim.attemptNumber,
          targetReceiptNumber: reconciled.receipt.receipt_number,
          targetOrderMarker: marker
        };
      }
      if (reconciled.action === 'duplicate') {
        throw new SecondLoyverseError({
          code: 'DUPLICATE_TARGET_MARKER',
          stage: 'reconcile_marker',
          message: `Multiple target receipts for marker ${marker}`
        });
      }
      await finalizeAttempt(runtime.db, {
        attemptId: attempt.id,
        sourceReceiptKey: context.sourceReceiptKey,
        processingToken: claim.processingToken,
        status: 'ambiguous',
        outcome: 'ambiguous',
        stage: 'reconcile_marker',
        error: {
          code: 'AMBIGUOUS_POST',
          stage: 'reconcile_marker',
          message: 'No target receipt found during reconcile; remains ambiguous'
        },
        targetOrderMarker: marker
      });
      return {
        sourceReceiptKey: context.sourceReceiptKey,
        status: 'ambiguous',
        outcome: 'ambiguous',
        attemptNumber: claim.attemptNumber,
        targetOrderMarker: marker
      };
    }

    const cache = options.inventoryCache ?? runtime.inventoryCache ?? new EntityInventoryCache();
    const inventories = await cache.ensure(clients.source, clients.target);

    const eligibility = evaluateReceiptEligibility(context.receipt, inventories.source);
    if (!eligibility.eligible) {
      const status = eligibility.status ?? 'unsupported';
      await finalizeAttempt(runtime.db, {
        attemptId: attempt.id,
        sourceReceiptKey: context.sourceReceiptKey,
        processingToken: claim.processingToken,
        status,
        outcome: 'skipped',
        stage: 'eligibility',
        error: {
          code: status === 'unsupported' ? 'UNSUPPORTED_RECEIPT' : 'UNSUPPORTED_RECEIPT',
          stage: 'eligibility',
          message: eligibility.reason ?? status
        }
      });
      return {
        sourceReceiptKey: context.sourceReceiptKey,
        status,
        outcome: 'skipped',
        attemptNumber: claim.attemptNumber
      };
    }

    const mapped = await buildWritableSalePayload({
      sourceReceiptKey: context.sourceReceiptKey,
      receipt: context.receipt,
      clients,
      sourceInventory: inventories.source,
      targetInventory: inventories.target
    });

    const requestFingerprint = buildRequestFingerprint(mapped.payload);
    const markerResult = await reconcileTargetMarker({
      targetClient: clients.target,
      orderMarker: mapped.targetOrderMarker
    });

    if (markerResult.action === 'already_exists' && markerResult.receipt) {
      assertCompatibleExistingReceipt(markerResult.receipt, mapped.targetOrderMarker);
      await finalizeAttempt(runtime.db, {
        attemptId: attempt.id,
        sourceReceiptKey: context.sourceReceiptKey,
        processingToken: claim.processingToken,
        status: 'succeeded',
        outcome: 'reconciled',
        stage: 'reconcile_marker',
        requestFingerprint,
        targetReceiptNumber: markerResult.receipt.receipt_number,
        targetReceiptDate: toDate(markerResult.receipt.receipt_date),
        targetOrderMarker: mapped.targetOrderMarker,
        responseSummary: `fidelity=${mapped.fidelityNotes.join('; ')}`
      });
      return {
        sourceReceiptKey: context.sourceReceiptKey,
        status: 'succeeded',
        outcome: 'reconciled',
        attemptNumber: claim.attemptNumber,
        targetReceiptNumber: markerResult.receipt.receipt_number,
        targetOrderMarker: mapped.targetOrderMarker
      };
    }

    if (markerResult.action === 'duplicate') {
      throw new SecondLoyverseError({
        code: 'DUPLICATE_TARGET_MARKER',
        stage: 'reconcile_marker',
        message: `Multiple target receipts for marker ${mapped.targetOrderMarker}`
      });
    }

    let created;
    try {
      created = await clients.target.createReceipt(mapped.payload);
    } catch (postError) {
      if (isAmbiguousPostError(postError)) {
        const after = await reconcileTargetMarker({
          targetClient: clients.target,
          orderMarker: mapped.targetOrderMarker
        });
        if (after.action === 'already_exists' && after.receipt) {
          created = after.receipt;
        } else {
          const safeError = toSafeMirrorError(postError, { code: 'AMBIGUOUS_POST', stage: 'post_receipt' });
          await finalizeAttempt(runtime.db, {
            attemptId: attempt.id,
            sourceReceiptKey: context.sourceReceiptKey,
            processingToken: claim.processingToken,
            status: 'ambiguous',
            outcome: 'ambiguous',
            stage: 'post_receipt',
            requestFingerprint,
            error: safeError,
            targetOrderMarker: mapped.targetOrderMarker
          });
          const notify = await notifyLiveFailure(runtime, {
            trigger: options.trigger,
            context,
            attemptId: attempt.id,
            error: safeError,
            status: 'ambiguous'
          });
          return {
            sourceReceiptKey: context.sourceReceiptKey,
            status: 'ambiguous',
            outcome: 'ambiguous',
            attemptNumber: claim.attemptNumber,
            error: safeError,
            notified: notify.notified,
            targetOrderMarker: mapped.targetOrderMarker
          };
        }
      } else {
        throw postError;
      }
    }

    await finalizeAttempt(runtime.db, {
      attemptId: attempt.id,
      sourceReceiptKey: context.sourceReceiptKey,
      processingToken: claim.processingToken,
      status: 'succeeded',
      outcome: 'succeeded',
      stage: 'finalize',
      requestFingerprint,
      targetReceiptNumber: created.receipt_number,
      targetReceiptDate: toDate(created.receipt_date),
      targetOrderMarker: mapped.targetOrderMarker,
      responseSummary: `fidelity=${mapped.fidelityNotes.join('; ')}`
    });

    return {
      sourceReceiptKey: context.sourceReceiptKey,
      status: 'succeeded',
      outcome: 'succeeded',
      attemptNumber: claim.attemptNumber,
      targetReceiptNumber: created.receipt_number,
      targetOrderMarker: mapped.targetOrderMarker
    };
  } catch (error) {
    const safeError = toSafeMirrorError(error, { code: 'UNKNOWN', stage: 'finalize' });
    const status: TransferStatus =
      safeError.code === 'DUPLICATE_TARGET_MARKER' || safeError.code === 'AMBIGUOUS_POST'
        ? 'ambiguous'
        : safeError.code === 'UNSUPPORTED_COMPOSITE' ||
            safeError.code === 'UNSUPPORTED_POINTS_DISCOUNT' ||
            safeError.code === 'UNSUPPORTED_RECEIPT'
          ? 'unsupported'
          : 'failed';

    await finalizeAttempt(runtime.db, {
      attemptId: attempt.id,
      sourceReceiptKey: context.sourceReceiptKey,
      processingToken: claim.processingToken,
      status,
      outcome: status === 'unsupported' ? 'skipped' : status === 'ambiguous' ? 'ambiguous' : 'failed',
      stage: safeError.stage,
      error: safeError,
      httpStatus: safeError.httpStatus
    });

    const notify = await notifyLiveFailure(runtime, {
      trigger: options.trigger,
      context,
      attemptId: attempt.id,
      error: safeError,
      status
    });

    return {
      sourceReceiptKey: context.sourceReceiptKey,
      status,
      outcome: status === 'unsupported' ? 'skipped' : status === 'ambiguous' ? 'ambiguous' : 'failed',
      attemptNumber: claim.attemptNumber,
      error: safeError,
      notified: notify.notified
    };
  }
};

/**
 * Public orchestration entry used by webhook and backfill.
 * Never throws for webhook isolation — callers still wrap defensively.
 */
export const considerAndMirrorReceipt = async (
  input: {
    merchantId: string;
    receipt: LoyverseReceipt;
    eventType?: string;
    eventId?: number | null;
  },
  runtime: MirrorRuntime,
  options: ConsiderMirrorOptions
): Promise<MirrorAttemptResult> => {
  const context = buildSourceContext(input);

  try {
    const config = loadSecondLoyverseConfig(runtime.env, { requireCredentials: false });
    const writesAllowed = options.forceProcess || config.mirrorEnabled;

    if (!writesAllowed && !options.discoverOnly) {
      // Live path with flag off: no-op without discovery writes unless discover-only requested.
      return {
        sourceReceiptKey: context.sourceReceiptKey,
        status: 'queued',
        outcome: 'noop'
      };
    }

    if (!config.accessToken || !config.storeId) {
      if (options.discoverOnly) {
        // Still allow cohort discovery against Neon without target credentials.
      } else if (writesAllowed) {
        throw new SecondLoyverseError({
          code: 'CONFIG_MISSING',
          stage: 'discover',
          message: 'LOYVERSE_2_ACCESS_TOKEN and LOYVERSE_2_STORE_ID are required'
        });
      }
    }

    const earlyEligibility = evaluateReceiptEligibility(input.receipt);
    let discoveryStatus: TransferStatus = 'queued';
    if (!earlyEligibility.eligible) {
      discoveryStatus = earlyEligibility.status ?? 'unsupported';
    }

    const transfer = await discoverTransfer(runtime, context, discoveryStatus);

    if (
      transfer.status === 'not_selected' ||
      transfer.status === 'skipped_refund' ||
      transfer.status === 'skipped_cancelled' ||
      transfer.status === 'unsupported' ||
      transfer.status === 'succeeded' ||
      transfer.status === 'source_changed'
    ) {
      return {
        sourceReceiptKey: context.sourceReceiptKey,
        status: transfer.status as TransferStatus,
        outcome: transfer.status === 'succeeded' ? 'noop' : 'skipped',
        targetReceiptNumber: transfer.targetReceiptNumber,
        targetOrderMarker: transfer.targetOrderMarker
      };
    }

    if (options.discoverOnly) {
      return {
        sourceReceiptKey: context.sourceReceiptKey,
        status: transfer.status as TransferStatus,
        outcome: 'noop',
        targetOrderMarker: transfer.targetOrderMarker
      };
    }

    if (transfer.status === 'ambiguous' && !options.reconcileOnly) {
      return {
        sourceReceiptKey: context.sourceReceiptKey,
        status: 'ambiguous',
        outcome: 'noop',
        targetOrderMarker: transfer.targetOrderMarker
      };
    }

    if (transfer.status === 'processing') {
      return {
        sourceReceiptKey: context.sourceReceiptKey,
        status: 'processing',
        outcome: 'noop'
      };
    }

    return await runMirrorAttempt(runtime, context, options);
  } catch (error) {
    const safeError = toSafeMirrorError(error, { code: 'UNKNOWN', stage: 'discover' });
    console.error('[2nd-loyverse] considerAndMirrorReceipt failed', safeError);
    return {
      sourceReceiptKey: context.sourceReceiptKey,
      status: 'failed',
      outcome: 'failed',
      error: safeError
    };
  }
};
