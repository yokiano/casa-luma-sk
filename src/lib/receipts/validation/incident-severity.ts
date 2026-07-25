import type { IncidentSeverity } from '$lib/server/incidents/types';
import type { ReceiptValidationFinding } from './types';

const SEVERITY_RANK: Record<IncidentSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2
};

/** Keep the incident severity aligned with the findings that caused it. */
export const getReceiptValidationIncidentSeverity = (
  findings: ReceiptValidationFinding[]
): IncidentSeverity => {
  if (findings.some((finding) => finding.code.startsWith('RULE_EXECUTION_ERROR:'))) {
    return 'critical';
  }

  return findings.reduce<IncidentSeverity>(
    (highest, finding) =>
      SEVERITY_RANK[finding.severity] > SEVERITY_RANK[highest] ? finding.severity : highest,
    'info'
  );
};

export const getHighestReceiptValidationFinding = <T extends { severity: IncidentSeverity }>(
  findings: T[]
): T | null => {
  return findings.reduce<T | null>((highest, finding) => {
    if (!highest || SEVERITY_RANK[finding.severity] > SEVERITY_RANK[highest.severity]) return finding;
    return highest;
  }, null);
};
