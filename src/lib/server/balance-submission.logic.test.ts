import { describe, expect, it } from 'vitest';
import {
  bangkokLocalToUtc,
  formatBangkokDateTimeLocal,
  validateBalanceSubmission
} from './balance-submission.logic';

const validInput = {
  submissionKey: 'submission-1234567890',
  observedAt: '2026-08-07T20:30',
  kbankBalance: '12345.67',
  safeBalance: '890',
  notes: 'Backup bag included'
};

describe('balance submission validation', () => {
  it('accepts required balances and normalizes Bangkok time to UTC', () => {
    const result = validateBalanceSubmission(validInput);
    expect(result).toEqual({
      ok: true,
      value: {
        submissionKey: validInput.submissionKey,
        observedAt: '2026-08-07T13:30:00.000Z',
        kbankBalance: 12345.67,
        safeBalance: 890,
        notes: validInput.notes
      }
    });
  });

  it('rejects missing, negative, over-precision, and invalid-date values', () => {
    const result = validateBalanceSubmission({
      ...validInput,
      submissionKey: 'short',
      observedAt: '2026-02-30T20:30',
      kbankBalance: '-1',
      safeBalance: '1.234'
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.fieldErrors)).toEqual(expect.arrayContaining(['submissionKey', 'observedAt', 'kbankBalance', 'safeBalance']));
  });

  it('uses Bangkok as UTC+07 and formats the default for the form', () => {
    expect(bangkokLocalToUtc('2026-08-07T00:15')).toBe('2026-08-06T17:15:00.000Z');
    expect(formatBangkokDateTimeLocal(new Date('2026-08-07T13:30:00.000Z'))).toBe('2026-08-07T20:30');
  });
});
