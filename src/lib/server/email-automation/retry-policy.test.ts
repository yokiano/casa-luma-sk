import { describe, expect, it } from 'vitest';
import { canRetry, MAX_EMAIL_AUTOMATION_ATTEMPTS, nextRetryAt } from './retry-policy';

describe('email retry policy', () => {
  it('backs off and has a terminal maximum', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(nextRetryAt(2, now, 0).getTime()).toBe(now.getTime() + 120_000);
    expect(canRetry(MAX_EMAIL_AUTOMATION_ATTEMPTS - 1)).toBe(true);
    expect(canRetry(MAX_EMAIL_AUTOMATION_ATTEMPTS)).toBe(false);
  });
});
