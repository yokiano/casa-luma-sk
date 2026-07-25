import { env } from '$env/dynamic/private';

/**
 * Normalizes INCIDENT_REPORT_BASE_URL to the site root.
 * Older deployments may include a legacy incident-route suffix, which would
 * otherwise produce duplicated path segments in generated management links.
 */
export const normalizeSiteBaseUrl = (raw: string | undefined | null): string | null => {
  const base = raw?.trim().replace(/\/$/, '');
  if (!base) return null;
  return base.replace(/\/(?:tools\/incidents|mgmt-dashboard\/incidents)$/, '');
};

export const getSiteBaseUrl = (): string | null => normalizeSiteBaseUrl(env.INCIDENT_REPORT_BASE_URL);

export const buildIncidentReportUrl = (incidentId: number): string | null => {
  const base = getSiteBaseUrl();
  if (!base) return null;
  return `${base}/mgmt-dashboard/incidents/${incidentId}`;
};

export const buildReceiptReportUrl = (receiptNumber: string): string | null => {
  const base = getSiteBaseUrl();
  if (!base) return null;
  return `${base}/mgmt-dashboard/receipts/${encodeURIComponent(receiptNumber)}`;
};
