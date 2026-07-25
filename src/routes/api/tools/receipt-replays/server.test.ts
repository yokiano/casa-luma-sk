import { describe, expect, it } from 'vitest';
import { POST } from './+server';

describe('receipt replay endpoint authorization', () => {
  it('rejects requests without a signed manager tools session', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/tools/receipt-replays', {
        method: 'POST',
        body: JSON.stringify({ eventId: 1 })
      }),
      cookies: { get: () => undefined }
    } as any);

    expect(response.status).toBe(403);
  });
});
