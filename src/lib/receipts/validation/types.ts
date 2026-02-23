import type { LoyverseReceipt } from '$lib/server/loyverse';

export type ReceiptValidationSeverity = 'info' | 'warning' | 'critical';

export interface ReceiptValidationContext {
  merchantId?: string;
  receiptKey?: string;
  eventType?: string;
  eventCreatedAt?: string;
}

export interface ReceiptValidationFinding {
  code: string;
  severity: ReceiptValidationSeverity;
  message: string;
  details?: Record<string, unknown>;
}

export interface ReceiptValidationRule {
  code: string;
  description: string;
  validate: (args: {
    receipt: LoyverseReceipt;
    context: ReceiptValidationContext;
  }) => ReceiptValidationFinding | ReceiptValidationFinding[] | null;
}

export interface ReceiptValidationRunResult {
  receiptNumber: string;
  receiptKey?: string;
  findings: ReceiptValidationFinding[];
  totalRules: number;
  failedRules: number;
  hasFailures: boolean;
}

export interface ReceiptValidationSuite {
  name: string;
  rules: ReceiptValidationRule[];
}
