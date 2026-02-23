import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { ingestReceiptWebhook } from '$lib/server/db/ingest-receipt-webhook';
import {
    createAlwaysFailValidationRule,
    createDefaultReceiptValidationSuite,
    runReceiptValidationSuite
} from '$lib/receipts/validation';
import { incidentReporter } from '$lib/server/incidents';

const getReceiptValidationSuite = () => {
    const forceFail = env.RECEIPT_VALIDATION_FORCE_FAIL === '1';

    return createDefaultReceiptValidationSuite({
        extraRules: forceFail
            ? [
                  createAlwaysFailValidationRule({
                      message: 'Forced test failure is enabled (RECEIPT_VALIDATION_FORCE_FAIL=1).'
                  })
              ]
            : []
    });
};

const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const isReceiptLike = (value: unknown): value is { receipt_number: string } & Record<string, unknown> => {
    return isObject(value) && typeof value.receipt_number === 'string';
};

type ReceiptWebhookItemPayload = {
    merchant_id: string;
    type: string;
    created_at: string;
    items: { receipt_number: string } & Record<string, unknown>;
};

const getReceiptWebhookPayloads = (payload: unknown): ReceiptWebhookItemPayload[] | null => {
    if (!isObject(payload)) return null;
    const { merchant_id, type, created_at } = payload;
    if (typeof merchant_id !== 'string' || typeof type !== 'string' || typeof created_at !== 'string') {
        return null;
    }

    if (isReceiptLike(payload.items)) {
        return [
            {
                merchant_id,
                type,
                created_at,
                items: payload.items
            }
        ];
    }

    if (!Array.isArray(payload.receipts)) return null;

    const receipts = payload.receipts.filter(isReceiptLike);
    if (!receipts.length) return [];

    return receipts.map((receipt) => ({
        merchant_id,
        type,
        created_at,
        items: receipt
    }));
};

const hasErrorCode = (error: unknown, code: string): boolean => {
    if (!isObject(error)) return false;
    if (error.code === code) return true;
    return hasErrorCode(error.cause, code);
};

export const POST: RequestHandler = async ({ request }) => {
    let rawPayload: unknown;

    try {
        const secret = env.LOYVERSE_WEBHOOK_SECRET;
        if (secret) {
            const incomingToken = request.headers.get('x-webhook-token');
            if (incomingToken !== secret) {
                return json({ error: 'Unauthorized webhook request' }, { status: 401 });
            }
        }

        const payload = await request.json();
        rawPayload = payload;
        const receiptPayloads = getReceiptWebhookPayloads(payload);
        if (receiptPayloads === null) {
            await incidentReporter.report({
                source: 'receipt-webhook',
                code: 'RECEIPT_WEBHOOK_INVALID_PAYLOAD_SHAPE',
                severity: 'warning',
                message: 'Receipt webhook payload did not match expected schema.',
                context: {
                    topLevelKeys: isObject(payload) ? Object.keys(payload) : [],
                    receiptsCount:
                        isObject(payload) && Array.isArray(payload.receipts) ? payload.receipts.length : undefined
                },
                payload
            });

            console.warn('[receipt-webhook] ignored invalid payload shape', {
                topLevelKeys: isObject(payload) ? Object.keys(payload) : [],
                receiptsCount: isObject(payload) && Array.isArray(payload.receipts) ? payload.receipts.length : undefined
            });
            return json({ received: true, status: 'ignored_invalid_payload' });
        }
        if (!receiptPayloads.length) {
            await incidentReporter.report({
                source: 'receipt-webhook',
                code: 'RECEIPT_WEBHOOK_NO_VALID_RECEIPTS',
                severity: 'warning',
                message: 'Receipt webhook payload included no valid receipts to process.',
                context: {
                    topLevelKeys: isObject(payload) ? Object.keys(payload) : []
                },
                payload
            });

            console.warn('[receipt-webhook] ignored payload with no valid receipts', {
                topLevelKeys: isObject(payload) ? Object.keys(payload) : []
            });
            return json({ received: true, status: 'ignored_no_valid_receipts' });
        }

        const results = [];
        for (const receiptPayload of receiptPayloads) {
            const result = await ingestReceiptWebhook(receiptPayload);
            results.push(result);

            if (result.status === 'processed') {
                const validationSuite = getReceiptValidationSuite();
                const validationReport = runReceiptValidationSuite(validationSuite, receiptPayload.items, {
                    merchantId: receiptPayload.merchant_id,
                    receiptKey: result.receiptKey,
                    eventType: receiptPayload.type,
                    eventCreatedAt: receiptPayload.created_at
                });

                if (validationReport.hasFailures) {
                    const failedChecks = [...new Set(validationReport.findings.map((finding) => finding.code))];
                    const hasEngineFailure = failedChecks.some((code) =>
                        code.startsWith('RULE_EXECUTION_ERROR:')
                    );
                    console.warn('[receipt-webhook] validation failures', {
                        receiptKey: result.receiptKey,
                        failedRules: validationReport.failedRules,
                        failedChecks
                    });

                    await incidentReporter.report({
                        source: 'receipt-webhook',
                        code: hasEngineFailure
                            ? 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR'
                            : 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
                        severity: 'critical',
                        message: hasEngineFailure
                            ? 'Validation rule execution failed while evaluating receipt.'
                            : 'Receipt validation checks failed for this webhook event.',
                        merchantId: receiptPayload.merchant_id,
                        receiptKey: result.receiptKey,
                        context: {
                            receiptNumber: receiptPayload.items.receipt_number,
                            failedChecks
                        },
                        payload: {
                            receipt: receiptPayload.items,
                            validationFindings: validationReport.findings
                        }
                    });
                }
            }
        }

        const statusCounts = results.reduce<Record<string, number>>((acc, result) => {
            acc[result.status] = (acc[result.status] ?? 0) + 1;
            return acc;
        }, {});

        console.log('[receipt-webhook] processed', {
            receiptCount: results.length,
            statusCounts,
            receiptKeys: results.map((result) => result.receiptKey)
        });

        // Loyverse expects a 2xx response to confirm receipt
        return json({
            received: true,
            status: results.length === 1 ? results[0].status : 'processed_batch',
            statusCounts
        });
    } catch (err) {
        const isInvalidJson = err instanceof SyntaxError && rawPayload === undefined;
        console.error('Error processing webhook:', err);
        await incidentReporter.report({
            source: 'receipt-webhook',
            code: isInvalidJson ? 'RECEIPT_WEBHOOK_INVALID_JSON' : 'RECEIPT_WEBHOOK_PROCESSING_FAILED',
            severity: isInvalidJson ? 'warning' : 'critical',
            message: isInvalidJson
                ? 'Webhook request body is not valid JSON.'
                : 'Unhandled error while processing receipt webhook request.',
            context: {
                hasPayload: rawPayload !== undefined
            },
            payload: rawPayload,
            error: err
        });

        if (hasErrorCode(err, 'ECONNREFUSED')) {
            return json({ error: 'Database unavailable' }, { status: 503 });
        }
        // Even if processing fails, we might want to return 200 to stop retries if the payload is bad,
        // but for now let's return 400 for bad JSON.
        return json({ error: 'Invalid request body' }, { status: 400 });
    }
};
