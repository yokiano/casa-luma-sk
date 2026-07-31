import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import {
  getReceiptWebhookPayloads,
  processReceiptWebhook,
  type ReceiptWebhookItemPayload
} from '$lib/server/receipts/process-receipt-webhook';
import { incidentReporter } from '$lib/server/incidents';
import { getWebhookHttpStatus, getSafeErrorSummary } from '$lib/server/errors/safe-error';
import type { ReportIncidentInput } from '$lib/server/incidents/types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getWebhookEventId = (error: unknown): number | undefined => {
  if (!isObject(error) || typeof error.webhookEventId !== 'number' || error.webhookEventId <= 0) return undefined;
  return error.webhookEventId;
};

const reportIncidentSafely = async (input: ReportIncidentInput) => {
  try {
    await incidentReporter.report(input);
  } catch (reportError) {
    // A reporter outage must not turn the original webhook error into a 200 or
    // replace its retryable classification.
    console.error('[receipt-webhook] incident reporter failed', getSafeErrorSummary(reportError));
  }
};

const countBy = (values: string[]) =>
  values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});

export const POST: RequestHandler = async ({ request }) => {
  let rawPayload: unknown;

  try {
    const secret = env.LOYVERSE_WEBHOOK_SECRET;
    if (secret) {
      const incomingToken = request.headers.get('x-webhook-token');
      if (incomingToken !== secret) return json({ error: 'Unauthorized webhook request' }, { status: 401 });
    }

    try {
      rawPayload = await request.json();
    } catch (error) {
      await reportIncidentSafely({
        source: 'receipt-webhook',
        code: 'RECEIPT_WEBHOOK_INVALID_JSON',
        severity: 'warning',
        message: 'Webhook request body is not valid JSON.',
        error,
        notify: false
      });
      return json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const receiptPayloads = getReceiptWebhookPayloads(rawPayload);
    if (receiptPayloads === null) {
      await reportIncidentSafely({
        source: 'receipt-webhook',
        code: 'RECEIPT_WEBHOOK_INVALID_PAYLOAD_SHAPE',
        severity: 'warning',
        message: 'Receipt webhook payload did not match expected schema.',
        context: {
          topLevelKeys: isObject(rawPayload) ? Object.keys(rawPayload) : [],
          receiptsCount: isObject(rawPayload) && Array.isArray(rawPayload.receipts) ? rawPayload.receipts.length : undefined
        },
        payload: rawPayload,
        notify: false
      });
      return json({ error: 'Invalid receipt webhook payload' }, { status: 400 });
    }

    if (!receiptPayloads.length) {
      await reportIncidentSafely({
        source: 'receipt-webhook',
        code: 'RECEIPT_WEBHOOK_NO_VALID_RECEIPTS',
        severity: 'warning',
        message: 'Receipt webhook payload included no valid receipts to process.',
        context: { topLevelKeys: isObject(rawPayload) ? Object.keys(rawPayload) : [] },
        payload: rawPayload,
        notify: false
      });
      return json({ error: 'Receipt webhook contained no valid receipts' }, { status: 400 });
    }

    const results = [];
    const automationStatuses: string[] = [];
    const ingestionStatuses: string[] = [];

    for (const receiptPayload of receiptPayloads as ReceiptWebhookItemPayload[]) {
      const result = await processReceiptWebhook(receiptPayload);
      results.push(result);
      const ingestionStatus = typeof result.stages.ingestion?.status === 'string'
        ? result.stages.ingestion.status
        : 'unknown';
      ingestionStatuses.push(ingestionStatus);
      automationStatuses.push(...result.automationResults.map((automation) => automation.status));

      // Best-effort second-account mirror after primary processing. Failures must never
      // change the production webhook HTTP response.
      try {
        const { considerAndMirrorReceipt } = await import('$lib/server/2nd-loyverse');
        const { env: privateEnv } = await import('$env/dynamic/private');
        const { db } = await import('$lib/server/db/client');
        await considerAndMirrorReceipt(
          {
            merchantId: receiptPayload.merchant_id,
            receipt: receiptPayload.items,
            eventType: receiptPayload.type
          },
          {
            db: db as any,
            env: {
              LOYVERSE_2_ACCESS_TOKEN: privateEnv.LOYVERSE_2_ACCESS_TOKEN,
              LOYVERSE_2_STORE_ID: privateEnv.LOYVERSE_2_STORE_ID,
              LOYVERSE_2_MIRROR_ENABLED: privateEnv.LOYVERSE_2_MIRROR_ENABLED,
              LOYVERSE_ACCESS_TOKEN: privateEnv.LOYVERSE_ACCESS_TOKEN
            }
          },
          { trigger: 'webhook' }
        );
      } catch (mirrorError) {
        console.error('[receipt-webhook] 2nd-loyverse mirror failed', getSafeErrorSummary(mirrorError));
      }
    }

    const statusCounts = countBy(ingestionStatuses);
    const automationStatusCounts = countBy(automationStatuses);

    console.log('[receipt-webhook] processed', {
      receiptCount: results.length,
      statusCounts,
      automationStatusCounts,
      receiptKeys: results.map((result) => result.receiptKey)
    });

    return json({
      received: true,
      status: results.length === 1 ? ingestionStatuses[0] : 'processed_batch',
      statusCounts,
      automationStatusCounts
    });
  } catch (error) {
    console.error('[receipt-webhook] processing failed', getSafeErrorSummary(error));
    await reportIncidentSafely({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_PROCESSING_FAILED',
      severity: 'critical',
      message: 'Unhandled error while processing receipt webhook request.',
      webhookEventId: getWebhookEventId(error),
      context: {
        hasPayload: rawPayload !== undefined
      },
      payload: rawPayload,
      error
    });

    return json(
      { error: getWebhookHttpStatus(error) === 503 ? 'Receipt webhook temporarily unavailable' : 'Receipt webhook processing failed' },
      { status: getWebhookHttpStatus(error) }
    );
  }
};
