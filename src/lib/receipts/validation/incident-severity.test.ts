import { describe, expect, it } from 'vitest';
import { getReceiptValidationIncidentSeverity } from './incident-severity';

describe('receipt validation incident severity', () => {
  it('preserves warning severity for warning-only findings', () => {
    expect(
      getReceiptValidationIncidentSeverity([
        { code: 'RECEIPT_CLOSED_WITHOUT_CUSTOMER', severity: 'warning', message: 'missing customer' },
        { code: 'DISCOUNT_TOTAL_OVER_THRESHOLD', severity: 'warning', message: 'discount' }
      ])
    ).toBe('warning');
  });

  it('preserves critical severity when any critical finding exists', () => {
    expect(
      getReceiptValidationIncidentSeverity([
        { code: 'RECEIPT_CLOSED_WITHOUT_CUSTOMER', severity: 'warning', message: 'missing customer' },
        { code: 'ONE_HOUR_NOT_CONVERTED', severity: 'critical', message: 'not converted' }
      ])
    ).toBe('critical');
  });

  it('treats validation engine errors as critical', () => {
    expect(
      getReceiptValidationIncidentSeverity([
        { code: 'RULE_EXECUTION_ERROR:foo', severity: 'critical', message: 'engine error' }
      ])
    ).toBe('critical');
  });
});
