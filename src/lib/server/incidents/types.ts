import type { AlertPublisher } from '$lib/server/alerts/types';

export type IncidentSeverity = 'info' | 'warning' | 'critical';

export interface IncidentContext {
  [key: string]: unknown;
}

export interface ReportIncidentInput {
  source: string;
  code: string;
  severity: IncidentSeverity;
  message: string;
  merchantId?: string;
  receiptKey?: string;
  webhookEventId?: number;
  context?: IncidentContext;
  payload?: unknown;
  error?: unknown;
}

export interface ReportIncidentResult {
  incidentId: number | null;
  persisted: boolean;
  notified: boolean;
}

export interface IncidentReporterOptions {
  publisher?: AlertPublisher | null;
  shouldNotify?: (severity: IncidentSeverity) => boolean;
}
