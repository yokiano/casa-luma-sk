import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/client';
import {
  ingestReceiptWebhookWithDb,
  type LoyverseReceiptWebhookPayload
} from '$lib/server/db/ingest-receipt-core';
import { reportedErrors, webhookEvents, webhookReplayRuns } from '$lib/server/db/schema';
import {
  getReceiptWebhookPayloads,
  processReceiptWebhook,
  type ReceiptReplayMode,
  type ReceiptReplayStage,
  type ReceiptWebhookProcessResult
} from './process-receipt-webhook';
import { formatSafeErrorSummary } from '$lib/server/errors/safe-error';
import { incidentReporter } from '$lib/server/incidents';

export const RECEIPT_REPLAY_MAX_BATCH_SIZE = 10;
export const RECEIPT_REPLAY_LIVE_CONFIRMATION = 'REPLAY';
export const RECEIPT_REPLAY_STAGES: ReceiptReplayStage[] = ['ingestion', 'automations', 'validation'];

export type ReceiptReplaySourceType = 'webhook_event' | 'processing_incident';

export interface ReceiptReplaySource {
  sourceType: ReceiptReplaySourceType;
  sourceId: number;
}

export interface ReceiptReplayRequest {
  sources: ReceiptReplaySource[];
  mode?: ReceiptReplayMode;
  notify?: boolean;
  confirmation?: string;
  targets?: ReceiptReplayStage[];
}

export interface ParsedReceiptReplayRequest {
  sources: ReceiptReplaySource[];
  mode: ReceiptReplayMode;
  notify: boolean;
  confirmation?: string;
  targets: ReceiptReplayStage[];
}

export interface ReceiptReplayRunResult {
  runId: number;
  sourceType: ReceiptReplaySourceType;
  sourceId: number;
  mode: ReceiptReplayMode;
  status: string;
  selectedStages: ReceiptReplayStage[];
  notify: boolean;
  resultSummary: Record<string, unknown>;
  errorSummary: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asPositiveInteger = (value: unknown): number | null => {
  const number = typeof value === 'number' && Number.isInteger(value)
    ? value
    : typeof value === 'string' && /^\d+$/.test(value)
      ? Number(value)
      : null;
  return number !== null && Number.isSafeInteger(number) && number > 0 ? number : null;
};

const asIdList = (value: unknown): number[] | null => {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  const ids = values.map(asPositiveInteger);
  return ids.every((id): id is number => id !== null) ? ids : null;
};

const parseTargets = (value: unknown): ReceiptReplayStage[] | null => {
  if (value === undefined) return [...RECEIPT_REPLAY_STAGES];
  if (!Array.isArray(value) || !value.length) return null;
  const targets = [...new Set(value)].filter(
    (target): target is ReceiptReplayStage => RECEIPT_REPLAY_STAGES.includes(target as ReceiptReplayStage)
  );
  return targets.length === value.length ? targets : null;
};

/** Parse selector-only input. There is deliberately no payload field in this contract. */
export const parseReceiptReplayRequest = (
  input: unknown
): { value: ParsedReceiptReplayRequest } | { error: string } => {
  if (!isRecord(input)) return { error: 'Replay request must be a JSON object.' };
  if ('payload' in input || 'webhookPayload' in input) {
    return { error: 'Arbitrary replay payloads are not accepted. Select a stored event or incident ID.' };
  }

  const eventIds = asIdList(input.eventIds ?? input.eventId);
  const incidentIds = asIdList(input.incidentIds ?? input.incidentId);
  if (!eventIds || !incidentIds) return { error: 'Event and incident IDs must be positive integers.' };

  const sources: ReceiptReplaySource[] = [
    ...eventIds.map((sourceId) => ({ sourceType: 'webhook_event' as const, sourceId })),
    ...incidentIds.map((sourceId) => ({ sourceType: 'processing_incident' as const, sourceId }))
  ];
  if (!sources.length) return { error: 'Provide at least one eventId or incidentId.' };
  if (sources.length > RECEIPT_REPLAY_MAX_BATCH_SIZE) {
    return { error: `A replay batch may contain at most ${RECEIPT_REPLAY_MAX_BATCH_SIZE} sources.` };
  }

  const mode = input.mode === undefined ? (input.dryRun === false ? 'live' : 'dry_run') : input.mode;
  if (mode !== 'dry_run' && mode !== 'live') return { error: 'Replay mode must be dry_run or live.' };
  if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') {
    return { error: 'dryRun must be a boolean when provided.' };
  }
  if ((input.dryRun === true && mode === 'live') || (input.dryRun === false && mode === 'dry_run')) {
    return { error: 'dryRun conflicts with the requested replay mode.' };
  }
  if (input.notify !== undefined && typeof input.notify !== 'boolean') {
    return { error: 'notify must be a boolean when provided.' };
  }

  const targets = parseTargets(input.targets);
  if (!targets) return { error: 'targets must contain one or more known replay stages.' };

  return {
    value: {
      sources,
      mode,
      notify: mode === 'live' && input.notify === true,
      confirmation: typeof input.confirmation === 'string' ? input.confirmation : undefined,
      targets
    }
  };
};

type LoadedReplaySource = {
  source: ReceiptReplaySource;
  payloads: LoyverseReceiptWebhookPayload[];
};

/** Validate an envelope read from storage. Operators never supply this payload. */
export const parseStoredReplayEnvelope = (
  payload: unknown,
  sourceType: ReceiptReplaySourceType
): LoyverseReceiptWebhookPayload[] | null => {
  const payloads = getReceiptWebhookPayloads(payload);
  if (!payloads?.length) return null;
  if (sourceType === 'webhook_event' && payloads.length !== 1) return null;
  if (payloads.length > RECEIPT_REPLAY_MAX_BATCH_SIZE) return null;
  return payloads as LoyverseReceiptWebhookPayload[];
};

const loadReplaySource = async (database: any, source: ReceiptReplaySource): Promise<LoadedReplaySource> => {
  if (source.sourceType === 'webhook_event') {
    const rows = await database
      .select({ id: webhookEvents.id, payload: webhookEvents.payload })
      .from(webhookEvents)
      .where(eq(webhookEvents.id, source.sourceId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new Error(`Webhook event ${source.sourceId} was not found.`);
    const payloads = parseStoredReplayEnvelope(row.payload, source.sourceType);
    if (!payloads || payloads.length !== 1) {
      throw new Error(`Stored webhook event ${source.sourceId} does not contain a valid receipt envelope.`);
    }
    return { source, payloads: payloads as LoyverseReceiptWebhookPayload[] };
  }

  const rows = await database
    .select({ id: reportedErrors.id, source: reportedErrors.source, code: reportedErrors.code, payload: reportedErrors.payload })
    .from(reportedErrors)
    .where(and(eq(reportedErrors.id, source.sourceId), eq(reportedErrors.source, 'receipt-webhook')))
    .limit(1);
  const row = rows[0];
  if (!row || row.code !== 'RECEIPT_WEBHOOK_PROCESSING_FAILED') {
    throw new Error(`Processing incident ${source.sourceId} is not an eligible receipt-webhook processing failure.`);
  }

  const payloads = parseStoredReplayEnvelope(row.payload, source.sourceType);
  if (!payloads?.length) {
    throw new Error(`Processing incident ${source.sourceId} does not contain the original receipt envelope.`);
  }
  if (payloads.length > RECEIPT_REPLAY_MAX_BATCH_SIZE) {
    throw new Error(`Processing incident ${source.sourceId} contains too many receipts to replay safely.`);
  }
  return { source, payloads: payloads as LoyverseReceiptWebhookPayload[] };
};

const summarizeProcessResult = (result: ReceiptWebhookProcessResult): Record<string, unknown> => ({
  receiptNumber: result.receiptNumber,
  receiptKey: result.receiptKey,
  stages: result.stages,
  automationResults: result.automationResults.map((automation) => ({
    code: automation.code,
    status: automation.status,
    incidentCode: automation.details?.incidentCode
  })),
  validation: result.validationReport
    ? {
        hasFailures: result.validationReport.hasFailures,
        findingCount: result.validationReport.findings.length,
        findingCodes: result.validationReport.findings.slice(0, 10).map((finding) => finding.code)
      }
    : null
});

const toRunResult = (row: any): ReceiptReplayRunResult => ({
  runId: row.id,
  sourceType: row.sourceType,
  sourceId: row.sourceId,
  mode: row.mode,
  status: row.status,
  selectedStages: Array.isArray(row.selectedStages) ? row.selectedStages : [],
  notify: row.notify,
  resultSummary: isRecord(row.resultSummary) ? row.resultSummary : {},
  errorSummary: typeof row.errorSummary === 'string' ? row.errorSummary : null
});

const updateRun = async (
  database: any,
  runId: number,
  values: Record<string, unknown>
): Promise<ReceiptReplayRunResult> => {
  const rows = await database
    .update(webhookReplayRuns)
    .set(values)
    .where(eq(webhookReplayRuns.id, runId))
    .returning();
  return toRunResult(rows[0]);
};

export const getReceiptReplayRun = async (database: any, runId: number) => {
  const rows = await database
    .select()
    .from(webhookReplayRuns)
    .where(eq(webhookReplayRuns.id, runId))
    .limit(1);
  return rows[0] ? toRunResult(rows[0]) : null;
};

export const replayReceiptWebhook = async (
  request: ParsedReceiptReplayRequest,
  options: { database?: any; replayEnabled?: boolean } = {}
): Promise<ReceiptReplayRunResult[]> => {
  if (!request.sources.length || request.sources.length > RECEIPT_REPLAY_MAX_BATCH_SIZE) {
    throw new Error(`A replay batch may contain at most ${RECEIPT_REPLAY_MAX_BATCH_SIZE} sources.`);
  }
  if (!request.targets.length || request.targets.some((target) => !RECEIPT_REPLAY_STAGES.includes(target))) {
    throw new Error('Replay targets are invalid.');
  }

  const database = options.database ?? db;
  const replayEnabled = options.replayEnabled ?? env.RECEIPT_REPLAY_ENABLED === '1';
  if (request.mode === 'live') {
    if (!replayEnabled) throw new Error('Live receipt replay is disabled. Set RECEIPT_REPLAY_ENABLED=1.');
    if (request.confirmation !== RECEIPT_REPLAY_LIVE_CONFIRMATION) {
      throw new Error(`Live receipt replay requires confirmation=${RECEIPT_REPLAY_LIVE_CONFIRMATION}.`);
    }
  }

  const notify = request.mode === 'live' && request.notify;
  const runs: ReceiptReplayRunResult[] = [];

  for (const source of request.sources) {
    const inserted = await database
      .insert(webhookReplayRuns)
      .values({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        mode: request.mode,
        status: 'running',
        selectedStages: request.targets,
        notify,
        startedAt: new Date()
      })
      .returning({ id: webhookReplayRuns.id });
    const runId = inserted[0]?.id;
    if (!runId) throw new Error('Could not create replay audit record.');

    let loaded: LoadedReplaySource | null = null;
    try {
      loaded = await loadReplaySource(database, source);
      const summaries: Record<string, unknown>[] = [];
      for (const payload of loaded.payloads) {
        const result = await processReceiptWebhook(payload, {
          mode: request.mode,
          notify,
          targets: request.targets,
          replayRunId: runId,
          replaySourceType: source.sourceType,
          replaySourceId: source.sourceId,
          database,
          ingest: (input) => ingestReceiptWebhookWithDb(database, input)
        });
        summaries.push(summarizeProcessResult(result));
      }

      const summary = {
        sourceReceiptCount: loaded.payloads.length,
        receipts: summaries
      };
      runs.push(await updateRun(database, runId, {
        status: 'completed',
        completedAt: new Date(),
        resultSummary: summary,
        errorSummary: null
      }));
    } catch (error) {
      const errorSummary = formatSafeErrorSummary(error);
      if (loaded && request.mode === 'live') {
        try {
          await incidentReporter.report({
            source: 'receipt-webhook',
            code: 'RECEIPT_WEBHOOK_PROCESSING_FAILED',
            severity: 'critical',
            message: 'Receipt webhook replay failed while processing a stored envelope.',
            notify,
            context: {
              replayRunId: runId,
              replaySourceType: source.sourceType,
              replaySourceId: source.sourceId,
              receiptCount: loaded.payloads.length
            },
            payload: loaded.payloads.length === 1 ? loaded.payloads[0] : { receipts: loaded.payloads },
            error
          });
        } catch (reportError) {
          console.error('[receipt-replay] failed to report replay incident', formatSafeErrorSummary(reportError));
        }
      }
      runs.push(await updateRun(database, runId, {
        status: 'failed',
        completedAt: new Date(),
        resultSummary: {},
        errorSummary
      }));
    }
  }

  return runs;
};

export const validateReplayRunId = (value: unknown): number | null => asPositiveInteger(value);
