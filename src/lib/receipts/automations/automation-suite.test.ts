import { describe, expect, it } from 'vitest';
import type { LoyverseReceipt } from '$lib/receipts/types';
import { runReceiptAutomationSuite, type ReceiptAutomation } from '$lib/receipts/automations';

const receipt: LoyverseReceipt = {
  receipt_number: 'R-1000',
  receipt_type: 'SALE'
};

describe('receipt automation suite', () => {
  it('runs all automations and counts statuses', async () => {
    const automations: ReceiptAutomation[] = [
      {
        code: 'one',
        description: 'one',
        async run() {
          return { code: 'ONE_DONE', status: 'completed', message: 'done' };
        }
      },
      {
        code: 'two',
        description: 'two',
        async run() {
          return { code: 'TWO_SKIPPED', status: 'skipped', message: 'skip' };
        }
      }
    ];

    const result = await runReceiptAutomationSuite(automations, receipt, { receiptKey: 'm:R-1000' });

    expect(result.results.map((item) => item.code)).toEqual(['ONE_DONE', 'TWO_SKIPPED']);
    expect(result.statusCounts).toMatchObject({ completed: 1, skipped: 1, failed: 0 });
    expect(result.hasFailures).toBe(false);
  });

  it('converts thrown errors into failed results', async () => {
    const result = await runReceiptAutomationSuite(
      [
        {
          code: 'boom',
          description: 'boom',
          async run() {
            throw new Error('test boom');
          }
        }
      ],
      receipt
    );

    expect(result.hasFailures).toBe(true);
    expect(result.results[0]).toMatchObject({
      code: 'AUTOMATION_EXECUTION_ERROR:boom',
      status: 'failed',
      details: { automationCode: 'boom', errorMessage: 'test boom' }
    });
  });

  it('flattens automations that return multiple results', async () => {
    const result = await runReceiptAutomationSuite(
      [
        {
          code: 'multi',
          description: 'multi',
          async run() {
            return [
              { code: 'A', status: 'completed', message: 'a' },
              { code: 'B', status: 'completed', message: 'b' }
            ];
          }
        }
      ],
      receipt
    );

    expect(result.results.map((item) => item.code)).toEqual(['A', 'B']);
    expect(result.statusCounts.completed).toBe(2);
  });
});
