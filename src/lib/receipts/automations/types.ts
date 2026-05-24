import type { LoyverseReceipt } from '$lib/receipts/types';

export type ReceiptAutomationStatus = 'skipped' | 'completed' | 'failed';

export type ReceiptAutomationResult = {
  code: string;
  status: ReceiptAutomationStatus;
  message: string;
  details?: Record<string, unknown>;
};

export type ReceiptAutomationContext = {
  merchantId?: string;
  receiptKey?: string;
  eventType?: string;
  eventCreatedAt?: string;
  receiptUrl?: string;
};

export type ReceiptAutomation = {
  code: string;
  description: string;
  run(input: {
    receipt: LoyverseReceipt;
    context: ReceiptAutomationContext;
  }): Promise<ReceiptAutomationResult | ReceiptAutomationResult[]>;
};

export type ReceiptAutomationReport = {
  results: ReceiptAutomationResult[];
  statusCounts: Record<ReceiptAutomationStatus, number>;
  hasFailures: boolean;
};
