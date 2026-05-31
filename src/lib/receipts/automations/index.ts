import type {
  ReceiptAutomation,
  ReceiptAutomationContext,
  ReceiptAutomationReport,
  ReceiptAutomationResult,
  ReceiptAutomationStatus
} from './types';
import type { LoyverseReceipt } from '$lib/receipts/types';

export * from './types';
export * from './membership-items';
export * from './membership-creation';
export * from './flexi-pass-purchase';

const automationErrorResult = (automation: ReceiptAutomation, error: unknown): ReceiptAutomationResult => ({
  code: `AUTOMATION_EXECUTION_ERROR:${automation.code}`,
  status: 'failed',
  message: `Receipt automation ${automation.code} failed while running.`,
  details: {
    automationCode: automation.code,
    errorMessage: error instanceof Error ? error.message : String(error)
  }
});

export const runReceiptAutomationSuite = async (
  automations: ReceiptAutomation[],
  receipt: LoyverseReceipt,
  context: ReceiptAutomationContext = {}
): Promise<ReceiptAutomationReport> => {
  const results: ReceiptAutomationResult[] = [];

  for (const automation of automations) {
    try {
      const result = await automation.run({ receipt, context });
      results.push(...(Array.isArray(result) ? result : [result]));
    } catch (error) {
      results.push(automationErrorResult(automation, error));
    }
  }

  const statusCounts = results.reduce<Record<ReceiptAutomationStatus, number>>(
    (acc, result) => {
      acc[result.status] = (acc[result.status] ?? 0) + 1;
      return acc;
    },
    { skipped: 0, completed: 0, failed: 0 }
  );

  return {
    results,
    statusCounts,
    hasFailures: statusCounts.failed > 0
  };
};
