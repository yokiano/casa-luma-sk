import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db/client', () => ({ db: {} }));
vi.mock('$lib/server/db/schema', () => ({ emailAttentionReviews: {}, emailAutomationActions: {}, emailAutomationAttempts: {}, emailAutomationAuditLog: {}, emailAutomationSettings: {}, emailClassificationRules: {}, emailEvents: {}, emailNotificationOutbox: {} }));
vi.mock('./reconcile', () => ({ reconcileEmailAutomationAction: vi.fn() }));
vi.mock('./processor', () => ({ processEmailAutomationActionById: vi.fn(), processEmailAutomationNotificationById: vi.fn() }));
vi.mock('./store', () => ({ releaseStaleClaims: vi.fn() }));
vi.mock('./settings', () => ({
  automationSettingsFromRow: vi.fn(),
  DEFAULT_SETTINGS: { automationEnabled: true, ledgerEnabled: false, notificationsEnabled: true, ignoredSenders: [], ledgerAllowedSenders: [], ledgerMaxAmountThb: 5000 },
  loadAutomationSettings: vi.fn(),
  normalizeExactSenderEmail: vi.fn((value: string) => value.includes('@') ? value : null),
  normalizeIgnoredSenders: vi.fn((values: string[]) => values),
  normalizeLedgerAllowedSenders: vi.fn((values: string[]) => values),
  saveAutomationSettings: vi.fn(),
  toAutomationSettingsJson: vi.fn()
}));
vi.mock('./notifications', () => ({ BUILTIN_CLASSIFIERS: [], renderEmailAutomationNotification: vi.fn(), sendEmailAutomationTestNotification: vi.fn() }));

describe('dashboard module', () => {
  it('loads event detail and manager command helpers', async () => {
    const dashboard = await import('./dashboard');
    expect(dashboard.getEmailAutomationEventDetail).toBeTypeOf('function');
    expect(dashboard.getPendingEmailAutomationReviewBundle).toBeTypeOf('function');
    expect(dashboard.dismissEmailAutomationReviewAsIrrelevant).toBeTypeOf('function');
    expect(dashboard.addEmailAutomationReviewSenderToIgnoredList).toBeTypeOf('function');
    expect(dashboard.retryEmailAutomationAction).toBeTypeOf('function');
    expect(dashboard.EMAIL_AUTOMATION_REVIEW_DETAIL_FIELDS).toEqual([
      'id', 'eventId', 'status', 'reasonCode', 'reason', 'evidenceSnapshot',
      'classifierDiagnostics', 'analysis', 'summary', 'analysisProvenance',
      'createdAt', 'updatedAt', 'completedAt'
    ]);
    expect(dashboard.EMAIL_AUTOMATION_REVIEW_DETAIL_FIELDS).not.toContain('lastActor');
    expect(dashboard.EMAIL_AUTOMATION_REVIEW_DETAIL_FIELDS).not.toContain('startedAt');
    expect(dashboard.EMAIL_AUTOMATION_RECENT_EVENT_FIELDS).toEqual([
      'id', 'receivedAt', 'fromAddress', 'subject', 'subtype', 'processingState', 'notificationState'
    ]);
    expect(dashboard.EMAIL_AUTOMATION_RECENT_EVENT_FIELDS).not.toContain('metadata');
    expect(dashboard.EMAIL_AUTOMATION_RECENT_EVENT_FIELDS).not.toContain('decisionSnapshot');
  });
});
