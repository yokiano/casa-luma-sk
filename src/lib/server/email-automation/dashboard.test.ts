import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db/client', () => ({ db: {} }));
vi.mock('$lib/server/db/schema', () => ({ emailAttentionReviews: {}, emailAutomationActions: {}, emailAutomationAttempts: {}, emailAutomationAuditLog: {}, emailAutomationSettings: {}, emailClassificationRules: {}, emailEvents: {}, emailNotificationOutbox: {} }));
vi.mock('./reconcile', () => ({ reconcileEmailAutomationAction: vi.fn() }));
vi.mock('./processor', () => ({ processOneEmailAutomationItem: vi.fn() }));
vi.mock('./store', () => ({ releaseStaleClaims: vi.fn() }));
vi.mock('./settings', () => ({ loadAutomationSettings: vi.fn(), saveAutomationSettings: vi.fn() }));
vi.mock('./notifications', () => ({ BUILTIN_CLASSIFIERS: [], renderEmailAutomationNotification: vi.fn(), sendEmailAutomationTestNotification: vi.fn() }));

describe('dashboard module', () => {
  it('loads event detail and manager command helpers', async () => {
    const dashboard = await import('./dashboard');
    expect(dashboard.getEmailAutomationEventDetail).toBeTypeOf('function');
    expect(dashboard.retryEmailAutomationAction).toBeTypeOf('function');
  });
});
