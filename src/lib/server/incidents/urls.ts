import { env } from '$env/dynamic/private';

/**
 * Normalizes INCIDENT_REPORT_BASE_URL to the site root.
 * Production has sometimes been configured with a `/tools/incidents` suffix,
 * which would otherwise produce duplicated path segments in generated links.
 */
export const normalizeSiteBaseUrl = (raw: string | undefined | null): string | null => {
  const base = raw?.trim().replace(/\/$/, '');
  if (!base) return null;
  return base.replace(/\/tools\/incidents$/, '');
};

export const getSiteBaseUrl = (): string | null => normalizeSiteBaseUrl(env.INCIDENT_REPORT_BASE_URL);

export const buildIncidentReportUrl = (incidentId: number): string | null => {
  const base = getSiteBaseUrl();
  if (!base) return null;
  return `${base}/tools/incidents/${incidentId}`;
};

export const buildReceiptReportUrl = (receiptNumber: string): string | null => {
  const base = getSiteBaseUrl();
  if (!base) return null;
  return `${base}/tools/receipts/${encodeURIComponent(receiptNumber)}`;
};
