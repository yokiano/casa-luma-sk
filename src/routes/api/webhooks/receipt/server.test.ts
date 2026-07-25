import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/incidents', () => ({
  incidentReporter: { report: vi.fn().mockResolvedValue({ incidentId: null, persisted: false, notified: false }) }
}));

import { POST } from './+server';

describe('receipt webhook HTTP input handling', () => {
  it('returns 400 for malformed JSON', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/webhooks/receipt', {
        method: 'POST',
        body: '{not-json'
      })
    } as any);

    expect(response.status).toBe(400);
  });
});
