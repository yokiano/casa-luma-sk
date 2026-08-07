import { describe, expect, it, vi } from 'vitest';
import { processReceiptWebhook } from './process-receipt-webhook';

const payload = {
  merchant_id: 'merchant-1',
  type: 'RECEIPT_CREATED',
  created_at: '2026-08-07T12:00:00.000Z',
  items: {
    receipt_number: 'R-CASHIER',
    receipt_type: 'SALE',
    line_items: []
  }
};

const validationSuite = {
  name: 'cashier-test-suite',
  rules: [{
    code: 'RECEIPT_CLOSED_WITHOUT_CUSTOMER',
    description: 'missing customer',
    validate: () => ({
      code: 'RECEIPT_CLOSED_WITHOUT_CUSTOMER',
      severity: 'warning' as const,
      message: 'manager finding'
    })
  }]
};

const automationSuite = [{
  code: 'cashier-test-automation',
  description: 'missing customer',
  run: async () => ({
    code: 'FLEXI_PASS_USAGE_SKIPPED',
    status: 'skipped' as const,
    message: 'manager automation finding',
    details: {
      incidentCode: 'FLEXI_PASS_USAGE_MISSING_CUSTOMER',
      reason: 'missing_customer'
    }
  })
}];

describe('processReceiptWebhook cashier alerts', () => {
  it('publishes one deduplicated cashier message after both live stages', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const reportIncident = vi.fn().mockResolvedValue({});

    const result = await processReceiptWebhook(payload, {
      ingest: vi.fn().mockResolvedValue({
        status: 'processed',
        receiptKey: 'merchant-1:R-CASHIER',
        eventId: 42
      }),
      automationSuite,
      validationSuite,
      reportIncident,
      cashierAlertPublisher: { publish }
    });

    expect(result.stages.automations).toMatchObject({ status: 'completed', resultCount: 1 });
    expect(result.stages.validation).toMatchObject({ status: 'findings', findingCount: 1 });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({
      title: '⚠️ Cashier action needed',
      body: expect.stringContaining('<code>R-CASHIER</code>')
    }));
    expect(publish.mock.calls[0][0].body).not.toContain('FLEXI_PASS_USAGE_MISSING_CUSTOMER');
  });

  it('keeps cashier notifications suppressed for replay-style notify=false processing', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);

    await processReceiptWebhook(payload, {
      mode: 'live',
      notify: false,
      replayRunId: 8,
      replaySourceType: 'webhook_event',
      replaySourceId: 42,
      ingest: vi.fn().mockResolvedValue({
        status: 'processed',
        receiptKey: 'merchant-1:R-CASHIER',
        eventId: 42
      }),
      automationSuite,
      validationSuite,
      reportIncident: vi.fn().mockResolvedValue({}),
      cashierAlertPublisher: { publish }
    });

    expect(publish).not.toHaveBeenCalled();
  });
});
