import { and, eq } from 'drizzle-orm';
import type { LoyverseReceipt } from '$lib/receipts/types';
import {
  createDefaultReceiptValidationSuite,
  getHighestReceiptValidationFinding,
  getReceiptValidationIncidentSeverity,
  runReceiptValidationSuite,
  type ReceiptValidationFinding,
  type ReceiptValidationRunResult,
  type ReceiptValidationSuite
} from '$lib/receipts/validation';
import {
  createDefaultReceiptAutomationSuite,
  runReceiptAutomationSuite,
  type ReceiptAutomation,
  type ReceiptAutomationResult
} from '$lib/receipts/automations';
import { buildReceiptReportUrl } from '$lib/server/incidents/urls';
import { incidentReporter } from '$lib/server/incidents';
import type { ReportIncidentInput } from '$lib/server/incidents/types';
import { db } from '$lib/server/db/client';
import {
  createReceiptWebhookDedupeKey,
  getReceiptKey,
  ingestReceiptWebhook,
  recordWebhookProcessingError,
  type LoyverseReceiptWebhookPayload,
  type ReceiptWebhookIngestionResult
} from '$lib/server/db/ingest-receipt-webhook';
import { receipts, webhookEvents } from '$lib/server/db/schema';
import { getSafeErrorSummary } from '$lib/server/errors/safe-error';

export type ReceiptWebhookItemPayload = LoyverseReceiptWebhookPayload;
export type ReceiptReplayStage = 'ingestion' | 'automations' | 'validation';
export type ReceiptReplayMode = 'live' | 'dry_run';

export interface ReceiptWebhookProcessOptions {
  mode?: ReceiptReplayMode;
  notify?: boolean;
  targets?: ReceiptReplayStage[];
  replayRunId?: number;
  replaySourceType?: 'webhook_event' | 'processing_incident';
  replaySourceId?: number;
  database?: any;
  ingest?: (payload: LoyverseReceiptWebhookPayload) => Promise<ReceiptWebhookIngestionResult>;
  automationSuite?: ReceiptAutomation[];
  validationSuite?: ReceiptValidationSuite;
  reportIncident?: (input: ReportIncidentInput) => Promise<unknown>;
}

export interface ReceiptWebhookProcessResult {
  receiptKey: string;
  receiptNumber: string;
  mode: ReceiptReplayMode;
  stages: Record<string, Record<string, unknown>>;
  automationResults: ReceiptAutomationResult[];
  validationReport: ReceiptValidationRunResult | null;
}

const DEFAULT_TARGETS: ReceiptReplayStage[] = ['ingestion', 'automations', 'validation'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isReceiptLike = (value: unknown): value is LoyverseReceipt =>
  isObject(value) && typeof value.receipt_number === 'string' && value.receipt_number.trim().length > 0;

/** Parse only the two Loyverse envelope shapes accepted by the live webhook. */
export const getReceiptWebhookPayloads = (payload: unknown): ReceiptWebhookItemPayload[] | null => {
  if (!isObject(payload)) return null;
  const { merchant_id, type, created_at } = payload;
  if (typeof merchant_id !== 'string' || typeof type !== 'string' || typeof created_at !== 'string') return null;

  if (isReceiptLike(payload.items)) {
    return [{
      merchant_id,
      type,
      created_at,
      items: payload.items
    }];
  }

  if (!Array.isArray(payload.receipts)) return null;
  const receipts = payload.receipts.filter(isReceiptLike);
  if (!receipts.length) return [];

  return receipts.map((receipt) => ({ merchant_id, type, created_at, items: receipt }));
};

export const isReceiptWebhookPayload = (payload: unknown): payload is LoyverseReceiptWebhookPayload =>
  getReceiptWebhookPayloads(payload)?.length === 1;

const safeReport = async (
  report: (input: ReportIncidentInput) => Promise<unknown>,
  input: ReportIncidentInput
) => {
  try {
    await report(input);
  } catch (reportError) {
    // Incident persistence/notification is secondary. Never replace the
    // original receipt processing result with a reporter failure.
    console.error('[receipt-webhook] incident reporter failed', getSafeErrorSummary(reportError));
  }
};

const getReplayContext = (options: ReceiptWebhookProcessOptions) => ({
  ...(options.replayRunId !== undefined ? { replayRunId: options.replayRunId } : {}),
  ...(options.replaySourceType ? { replaySourceType: options.replaySourceType } : {}),
  ...(options.replaySourceId !== undefined ? { replaySourceId: options.replaySourceId } : {})
});

const pickKeys = (value: unknown, keys: string[]): Record<string, unknown> | undefined => {
  if (!isObject(value)) return undefined;
  const picked = Object.fromEntries(
    keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]])
  );
  return Object.keys(picked).length ? picked : undefined;
};

export const getCompactFindingDetails = (finding: { code: string; details?: Record<string, unknown> }) => {
  switch (finding.code) {
    case 'DISCOUNT_100_PRESENT':
      return pickKeys(finding.details, ['thresholdPercentage', 'receiptLevelDiscounts', 'lineLevelDiscounts']);
    case 'DISCOUNT_TOTAL_OVER_THRESHOLD':
      return pickKeys(finding.details, [
        'thresholdAmount',
        'discountTotal',
        'comparableDiscountTotal',
        'currency',
        'discountNames'
      ]);
    case 'ONE_HOUR_NOT_CONVERTED':
      return pickKeys(finding.details, [
        'orderStartTime',
        'checkoutAt',
        'durationMinutes',
        'baseDurationMinutes',
        'gracePeriodMinutes',
        'thresholdMinutes',
        'timeZone',
        'exceedsUnconvertedThreshold',
        'lineNotes'
      ]);
    case 'MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP':
      return pickKeys(finding.details, [
        'reason',
        'checkedDate',
        'customerId',
        'memberEntryQuantity',
        'matchedFamily',
        'activeMembershipCount'
      ]);
    case 'FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS':
      return pickKeys(finding.details, [
        'reason',
        'checkedDate',
        'customerId',
        'currentReceiptEntries',
        'cardsPurchased',
        'entriesPurchased',
        'entriesUsedIncludingCurrent',
        'remainingBeforeCurrentReceipt',
        'remainingAfterCurrentReceipt'
      ]);
    case 'RECEIPT_CLOSED_WITHOUT_CUSTOMER':
      return pickKeys(finding.details, ['receiptType', 'totalMoney', 'itemCount', 'items']);
    default:
      return undefined;
  }
};

const getAutomationIncidentSeverity = (result: ReceiptAutomationResult) => {
  if (result.status === 'completed' && typeof result.details?.incidentCode === 'string') return 'warning' as const;
  if (
    result.status === 'completed' &&
    (result.code === 'MEMBERSHIP_CREATED' || result.code === 'FLEXI_PASSES_CREATED')
  ) return 'info' as const;
  if (result.status === 'failed') return 'critical' as const;
  if (result.status === 'skipped' && typeof result.details?.incidentCode === 'string') return 'warning' as const;
  return null;
};

const getAutomationIncidentCode = (result: ReceiptAutomationResult) => {
  if (result.code === 'MEMBERSHIP_CREATED' || result.code === 'FLEXI_PASSES_CREATED') return result.code;
  return typeof result.details?.incidentCode === 'string'
    ? result.details.incidentCode
    : 'RECEIPT_WEBHOOK_AUTOMATION_FAILED';
};

const getPrimaryFinding = (findings: ReceiptValidationFinding[]) =>
  getHighestReceiptValidationFinding(findings) ?? findings[0] ?? null;

const analyzeDryRunIngestion = async (database: any, payload: LoyverseReceiptWebhookPayload) => {
  const dedupeKey = createReceiptWebhookDedupeKey(payload);
  const receiptKey = getReceiptKey(payload.merchant_id, payload.items.receipt_number);
  const eventRows = await database
    .select({ id: webhookEvents.id, processed: webhookEvents.processed })
    .from(webhookEvents)
    .where(eq(webhookEvents.dedupeKey, dedupeKey))
    .limit(1);
  const event = eventRows[0] as { id: number; processed: boolean } | undefined;

  if (event?.processed) {
    return {
      status: 'duplicate',
      eventId: event.id,
      dedupeKey,
      receiptKey,
      wouldCreateReceipt: false,
      wouldUpdateReceipt: false,
      note: 'Stored webhook event is already processed; live replay will not repeat ingestion.'
    };
  }

  const existingReceipt = await database.query.receipts.findFirst({
    where: and(eq(receipts.receiptKey, receiptKey), eq(receipts.merchantId, payload.merchant_id)),
    columns: { updatedFromEventAt: true }
  });
  const eventDate = new Date(payload.created_at);
  const isStale =
    existingReceipt?.updatedFromEventAt instanceof Date &&
    !Number.isNaN(eventDate.getTime()) &&
    existingReceipt.updatedFromEventAt > eventDate;

  return {
    status: isStale ? 'stale' : event ? 'retryable_unprocessed' : 'new',
    eventId: event?.id ?? null,
    dedupeKey,
    receiptKey,
    wouldCreateReceipt: !isStale && !existingReceipt,
    wouldUpdateReceipt: !isStale && Boolean(existingReceipt),
    note: isStale
      ? 'Existing receipt is newer; stale-event protection would preserve it.'
      : event
        ? 'Stored webhook event is unprocessed and can be retried.'
        : 'No stored event was found; live replay would insert the envelope before receipt ingestion.'
  };
};

const buildValidationIncident = (
  payload: LoyverseReceiptWebhookPayload,
  receiptKey: string,
  report: ReceiptValidationRunResult,
  options: ReceiptWebhookProcessOptions,
  eventId: number | undefined
): ReportIncidentInput | null => {
  if (!report.hasFailures) return null;

  const failedChecks = [...new Set(report.findings.map((finding) => finding.code))];
  const hasEngineFailure = report.findings.some((finding) => finding.code.startsWith('RULE_EXECUTION_ERROR:'));
  const primaryFinding = getPrimaryFinding(report.findings);

  return {
    source: 'receipt-webhook',
    code: hasEngineFailure
      ? 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR'
      : 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
    severity: getReceiptValidationIncidentSeverity(report.findings),
    message: hasEngineFailure
      ? 'Validation rule execution failed while evaluating receipt.'
      : 'Receipt validation checks failed for this webhook event.',
    merchantId: payload.merchant_id,
    receiptKey,
    ...(eventId !== undefined ? { webhookEventId: eventId } : {}),
    notify: options.notify ?? true,
    context: {
      receiptNumber: payload.items.receipt_number,
      receiptUrl: buildReceiptReportUrl(payload.items.receipt_number) ?? undefined,
      customerId: typeof payload.items.customer_id === 'string' ? payload.items.customer_id : undefined,
      failedChecks,
      primaryFindingCode: primaryFinding?.code,
      primaryFindingMessage: primaryFinding?.message,
      primaryFindingDetails: primaryFinding ? getCompactFindingDetails(primaryFinding) : undefined,
      validationFindingsSummary: report.findings.slice(0, 5).map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        message: finding.message,
        details: getCompactFindingDetails(finding)
      })),
      ...getReplayContext(options)
    },
    payload: {
      receipt: payload.items,
      validationFindings: report.findings
    }
  };
};

export const processReceiptWebhook = async (
  payload: LoyverseReceiptWebhookPayload,
  options: ReceiptWebhookProcessOptions = {}
): Promise<ReceiptWebhookProcessResult> => {
  const mode = options.mode ?? 'live';
  const targets = [...new Set(options.targets ?? DEFAULT_TARGETS)];
  const database = options.database ?? db;
  const report = options.reportIncident ?? ((input: ReportIncidentInput) => incidentReporter.report(input));
  const receiptKey = getReceiptKey(payload.merchant_id, payload.items.receipt_number);
  const stages: Record<string, Record<string, unknown>> = {};
  const automationResults: ReceiptAutomationResult[] = [];
  let validationReport: ReceiptValidationRunResult | null = null;
  let ingestionResult: ReceiptWebhookIngestionResult | null = null;
  let eventId: number | undefined;

  try {
    if (targets.includes('ingestion')) {
    if (mode === 'dry_run') {
      stages.ingestion = await analyzeDryRunIngestion(database, payload);
    } else {
      const ingest = options.ingest ?? ((input) => ingestReceiptWebhook(input));
      try {
        ingestionResult = await ingest(payload);
        eventId = ingestionResult.eventId > 0 ? ingestionResult.eventId : undefined;
        stages.ingestion = { ...ingestionResult };
      } catch (error) {
        const maybeEventId = isObject(error) && typeof error.webhookEventId === 'number' ? error.webhookEventId : null;
        if (maybeEventId) eventId = maybeEventId;
        throw error;
      }

      if (ingestionResult.status === 'in_progress') {
        const retryable = new Error('A concurrent receipt webhook attempt is still processing this event.');
        (retryable as Error & { retryable?: boolean; webhookEventId?: number }).retryable = true;
        (retryable as Error & { webhookEventId?: number }).webhookEventId = ingestionResult.eventId;
        throw retryable;
      }
    }
  } else {
    stages.ingestion = { status: 'not_requested', receiptKey };
  }

  const canRunPostIngestion =
    mode === 'dry_run' ||
    !ingestionResult ||
    ingestionResult.status === 'processed';

  if (targets.includes('automations')) {
    if (mode === 'dry_run') {
      stages.automations = {
        status: 'not_run',
        wouldRun: true,
        limitation: 'Receipt automations can create or update Notion records and are not executed in dry-run mode.'
      };
    } else if (!canRunPostIngestion) {
      stages.automations = { status: 'skipped', reason: `ingestion_${ingestionResult?.status ?? 'not_processed'}` };
    } else {
      const automationSuite = options.automationSuite ?? createDefaultReceiptAutomationSuite();
      const receiptUrl = buildReceiptReportUrl(payload.items.receipt_number) ?? undefined;
      const automationReport = await runReceiptAutomationSuite(automationSuite, payload.items, {
        merchantId: payload.merchant_id,
        receiptKey,
        eventType: payload.type,
        eventCreatedAt: payload.created_at,
        receiptUrl
      });
      automationResults.push(...automationReport.results);
      stages.automations = {
        status: 'completed',
        statusCounts: automationReport.statusCounts,
        resultCount: automationReport.results.length
      };

      for (const automationResult of automationReport.results) {
        const severity = getAutomationIncidentSeverity(automationResult);
        if (!severity) continue;

        const automationIncident: ReportIncidentInput = {
          source: 'receipt-webhook',
          code: getAutomationIncidentCode(automationResult),
          severity,
          message: automationResult.message,
          merchantId: payload.merchant_id,
          receiptKey,
          ...(eventId !== undefined ? { webhookEventId: eventId } : {}),
          notify: options.notify ?? true,
          context: {
            automationCode: automationResult.code,
            receiptNumber: payload.items.receipt_number,
            receiptUrl,
            customerId: typeof payload.items.customer_id === 'string' ? payload.items.customer_id : undefined,
            ...automationResult.details,
            ...getReplayContext(options)
          },
          payload: { receipt: payload.items, automationResult }
        };
        await safeReport(report, automationIncident);
      }
    }
  } else {
    stages.automations = { status: 'not_requested' };
  }

  if (targets.includes('validation')) {
    if (mode === 'live' && !canRunPostIngestion) {
      stages.validation = { status: 'skipped', reason: `ingestion_${ingestionResult?.status ?? 'not_processed'}` };
    } else {
      const validationSuite = options.validationSuite ?? createDefaultReceiptValidationSuite();
      validationReport = await runReceiptValidationSuite(validationSuite, payload.items, {
        merchantId: payload.merchant_id,
        receiptKey,
        eventType: payload.type,
        eventCreatedAt: payload.created_at
      });
      stages.validation = {
        status: validationReport.hasFailures ? 'findings' : 'passed',
        findingCount: validationReport.findings.length,
        failedRules: validationReport.failedRules
      };

      const validationIncident = buildValidationIncident(
        payload,
        receiptKey,
        validationReport,
        options,
        eventId
      );
      if (validationIncident && mode === 'live') await safeReport(report, validationIncident);
    }
  } else {
    stages.validation = { status: 'not_requested' };
  }

    return {
      receiptKey,
      receiptNumber: payload.items.receipt_number,
      mode,
      stages,
      automationResults,
      validationReport
    };
  } catch (error) {
    if (eventId !== undefined && mode === 'live' && ingestionResult?.status !== 'in_progress') {
      await recordWebhookProcessingError(database, eventId, error);
    }
    throw error;
  }
};
