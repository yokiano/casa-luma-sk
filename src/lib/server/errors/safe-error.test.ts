import { describe, expect, it } from 'vitest';
import { formatSafeErrorSummary, getWebhookHttpStatus } from './safe-error';

describe('safe receipt error handling', () => {
  it('keeps nested database diagnostics while redacting secrets', () => {
    const error = Object.assign(new Error('query failed postgres://user:secret@example.test/db'), {
      code: 'ECONNRESET',
      sqlState: '08006',
      retryable: true,
      cause: new Error('password=super-secret')
    });

    const summary = formatSafeErrorSummary(error);

    expect(summary).toContain('ECONNRESET');
    expect(summary).toContain('08006');
    expect(summary).toContain('"retryable":true');
    expect(summary).toContain('[redacted]');
    expect(summary).not.toContain('super-secret');
    expect(summary).not.toContain('user:secret');
    expect(getWebhookHttpStatus(error)).toBe(503);
  });

  it('returns 500 for unexpected non-retryable failures', () => {
    expect(getWebhookHttpStatus(new Error('bad receipt mapping'))).toBe(500);
  });
});
