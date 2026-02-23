import type { ReceiptValidationRule } from '../types';

export interface AlwaysFailRuleOptions {
  message?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export const createAlwaysFailValidationRule = (
  options: AlwaysFailRuleOptions = {}
): ReceiptValidationRule => {
  return {
    code: 'FORCED_TEST_FAILURE',
    description: 'Always fails; useful for alert pipeline verification',
    validate: () => ({
      code: 'FORCED_TEST_FAILURE',
      severity: options.severity ?? 'warning',
      message: options.message ?? 'Forced failure for receipt validation alert testing.',
      details: {
        testingOnly: true
      }
    })
  };
};
