import type { LoyverseReceipt } from '$lib/receipts/types';
import type {
  ReceiptValidationContext,
  ReceiptValidationFinding,
  ReceiptValidationRule,
  ReceiptValidationRunResult,
  ReceiptValidationSuite
} from './types';

const toFindings = (
  result: ReceiptValidationFinding | ReceiptValidationFinding[] | null
): ReceiptValidationFinding[] => {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
};

export const createReceiptValidationSuite = (
  rules: ReceiptValidationRule[],
  name = 'default'
): ReceiptValidationSuite => ({
  name,
  rules
});

export const runReceiptValidationSuite = (
  suite: ReceiptValidationSuite,
  receipt: LoyverseReceipt,
  context: ReceiptValidationContext = {}
): ReceiptValidationRunResult => {
  const findings = suite.rules.flatMap((rule) => {
    try {
      return toFindings(rule.validate({ receipt, context })).map((finding) => ({
        ...finding,
        code: finding.code || rule.code
      }));
    } catch (error) {
      return [
        {
          code: `RULE_EXECUTION_ERROR:${rule.code}`,
          severity: 'critical' as const,
          message: `Validation rule failed to execute: ${rule.code}`,
          details: {
            error: error instanceof Error ? error.message : String(error)
          }
        }
      ];
    }
  });

  return {
    receiptNumber: receipt.receipt_number,
    receiptKey: context.receiptKey,
    findings,
    totalRules: suite.rules.length,
    failedRules: findings.length,
    hasFailures: findings.length > 0
  };
};
