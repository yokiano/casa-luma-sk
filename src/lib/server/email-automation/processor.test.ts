import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db/client', () => ({ db: {} }));
vi.mock('$lib/server/db/schema', () => ({ emailAttentionReviews: {}, emailEvents: {} }));
vi.mock('./store', () => ({ claimDueAction: vi.fn(), claimDueNotification: vi.fn(), deferNotificationUntil: vi.fn(), markActionFailure: vi.fn(), markActionResult: vi.fn(), markNotificationResult: vi.fn(), releaseStaleClaims: vi.fn() }));
vi.mock('./handlers/registry', () => ({ getEmailAutomationHandler: vi.fn() }));
vi.mock('./notifications', () => ({ sendEmailAutomationNotification: vi.fn() }));

describe('processor module', () => {
  it('loads as a bounded durable-work module', async () => {
    const processor = await import('./processor');
    expect(processor.processOneEmailAutomationItem).toBeTypeOf('function');
  });
});
