import { describe, expect, it, vi } from 'vitest';
import {
  RECEIPT_REPLAY_MAX_BATCH_SIZE,
  RECEIPT_REPLAY_LIVE_CONFIRMATION,
  parseReceiptReplayRequest,
  parseStoredReplayEnvelope,
  validateReplayRunId
} from './replay-receipt-webhook';
import { processReceiptWebhook } from './process-receipt-webhook';
import { createReceiptValidationSuite } from '$lib/receipts/validation';

describe('receipt webhook replay request', () => {
  it('defaults to a dry run with notifications disabled and all stages', () => {
    const result = parseReceiptReplayRequest({ eventId: '12' });

    expect(result).toEqual({
      value: {
        sources: [{ sourceType: 'webhook_event', sourceId: 12 }],
        mode: 'dry_run',
        notify: false,
        confirmation: undefined,
        targets: ['ingestion', 'automations', 'validation']
      }
    });
  });

  it('accepts a stored processing-incident envelope but not an arbitrary finding payload', () => {
    const envelope = {
      merchant_id: 'merchant-1',
      type: 'RECEIPT_CREATED',
      created_at: '2026-01-12T04:15:00.000Z',
      items: { receipt_number: 'R-INCIDENT', line_items: [] }
    };

    expect(parseStoredReplayEnvelope(envelope, 'processing_incident')).toEqual([envelope]);
    expect(
      parseStoredReplayEnvelope({ receipt: envelope, validationFindings: [{ code: 'secret' }] }, 'processing_incident')
    ).toBeNull();
  });

  it('rejects arbitrary payload injection and oversized batches', () => {
    expect(parseReceiptReplayRequest({ eventId: 1, payload: { merchant_id: 'attacker' } })).toEqual({
      error: expect.stringContaining('Arbitrary replay payloads')
    });

    expect(
      parseReceiptReplayRequest({ eventIds: Array.from({ length: RECEIPT_REPLAY_MAX_BATCH_SIZE + 1 }, (_, i) => i + 1) })
    ).toEqual({ error: expect.stringContaining('at most') });
  });

  it('requires explicit live mode confirmation and supports target selection', () => {
    const result = parseReceiptReplayRequest({
      incidentId: 7,
      mode: 'live',
      notify: true,
      confirmation: RECEIPT_REPLAY_LIVE_CONFIRMATION,
      targets: ['validation']
    });

    expect(result).toEqual({
      value: {
        sources: [{ sourceType: 'processing_incident', sourceId: 7 }],
        mode: 'live',
        notify: true,
        confirmation: RECEIPT_REPLAY_LIVE_CONFIRMATION,
        targets: ['validation']
      }
    });
  });

  it('keeps dry-run read-only and suppresses incident reporting', async () => {
    const report = vi.fn();
    const ingest = vi.fn();
    const database = {
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [] })
        })
      }),
      query: { receipts: { findFirst: vi.fn().mockResolvedValue(null) } }
    };
    const payload = {
      merchant_id: 'merchant-1',
      type: 'RECEIPT_CREATED',
      created_at: '2026-01-12T04:15:00.000Z',
      items: { receipt_number: 'R-DRY', line_items: [] }
    };

    const result = await processReceiptWebhook(payload, {
      mode: 'dry_run',
      database,
      ingest,
      reportIncident: report,
      validationSuite: createReceiptValidationSuite([])
    });

    expect(ingest).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
    expect(result.stages.ingestion).toMatchObject({ status: 'new', wouldCreateReceipt: true });
    expect(result.stages.automations).toMatchObject({ status: 'not_run', wouldRun: true });
    expect(result.validationReport?.hasFailures).toBe(false);
  });

  it('preserves validation severity and replay provenance without notifying', async () => {
    const report = vi.fn().mockResolvedValue({});
    const result = await processReceiptWebhook(
      {
        merchant_id: 'merchant-1',
        type: 'RECEIPT_CREATED',
        created_at: '2026-01-12T04:15:00.000Z',
        items: { receipt_number: 'R-WARNING', line_items: [] }
      },
      {
        mode: 'live',
        notify: false,
        replayRunId: 22,
        replaySourceType: 'processing_incident',
        replaySourceId: 9,
        ingest: vi.fn().mockResolvedValue({ status: 'processed', receiptKey: 'merchant-1:R-WARNING', eventId: 4 }),
        reportIncident: report,
        validationSuite: createReceiptValidationSuite([
          {
            code: 'WARNING_RULE',
            description: 'warning test',
            validate: () => ({ code: 'WARNING_RULE', severity: 'warning', message: 'warning finding' })
          }
        ]),
        targets: ['ingestion', 'validation']
      }
    );

    expect(result.validationReport?.findings[0].severity).toBe('warning');
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'warning',
      notify: false,
      context: expect.objectContaining({ replayRunId: 22, replaySourceId: 9 })
    }));
  });

  it('validates positive run IDs', () => {
    expect(validateReplayRunId('4')).toBe(4);
    expect(validateReplayRunId('0')).toBeNull();
    expect(validateReplayRunId('abc')).toBeNull();
  });
});
