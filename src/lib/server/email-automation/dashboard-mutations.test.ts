import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  review: {
    id: 7,
    eventId: 42,
    status: 'in_progress',
    analysis: null,
    summary: null,
    analysisProvenance: {},
    startedAt: null,
    updatedAt: new Date('2026-07-19T06:00:00.000Z')
  },
  updateSucceeds: true,
  selectResults: [] as unknown[][],
  updatedTables: [] as string[],
  updatedValues: [] as Record<string, unknown>[],
  inserted: [] as Array<{ table: string; values: Record<string, unknown> }>
}));

vi.mock('$lib/server/db/schema', () => {
  const table = (name: string, columns: string[]) => Object.assign({ __name: name }, Object.fromEntries(columns.map((column) => [column, column])));
  return {
    emailAttentionReviews: table('reviews', ['id', 'eventId', 'status', 'analysisProvenance']),
    emailAutomationActions: table('actions', ['id']),
    emailAutomationAttempts: table('attempts', ['id']),
    emailAutomationAuditLog: table('audit', ['id']),
    emailAutomationSettings: table('settings', ['id', 'automationEnabled', 'ledgerEnabled', 'notificationsEnabled', 'settings']),
    emailClassificationRules: table('rules', ['id']),
    emailEvents: table('events', ['id', 'fromAddress']),
    emailNotificationOutbox: table('outbox', ['id'])
  };
});

vi.mock('$lib/server/db/client', () => {
  const selectTail = () => ({ where: vi.fn(() => ({ limit: vi.fn(async () => state.selectResults.shift() ?? []) })) });
  const tx = {
    select: vi.fn(() => ({ from: vi.fn(() => ({ ...selectTail(), innerJoin: vi.fn(() => selectTail()) })) })),
    update: vi.fn((target: { __name: string }) => {
      state.updatedTables.push(target.__name);
      return {
        set: vi.fn((values: Record<string, unknown>) => {
          state.updatedValues.push(values);
          return { where: vi.fn(() => ({ returning: vi.fn(async () => state.updateSucceeds ? [{ id: state.review.id }] : []) })) };
        })
      };
    }),
    insert: vi.fn((target: { __name: string }) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        state.inserted.push({ table: target.__name, values });
        return { onConflictDoNothing: vi.fn(async () => undefined), onConflictDoUpdate: vi.fn(async () => undefined) };
      })
    })),
    execute: vi.fn(async () => undefined)
  };
  return { db: { transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)) } };
});

vi.mock('./reconcile', () => ({ reconcileEmailAutomationAction: vi.fn() }));
vi.mock('./processor', () => ({ processEmailAutomationActionById: vi.fn(), processEmailAutomationNotificationById: vi.fn() }));
vi.mock('./store', () => ({ releaseStaleClaims: vi.fn() }));
vi.mock('./settings', () => ({
  automationSettingsFromRow: vi.fn((row?: Record<string, unknown>) => row ? {
    automationEnabled: row.automationEnabled,
    ledgerEnabled: row.ledgerEnabled,
    notificationsEnabled: row.notificationsEnabled,
    ignoredSenders: (row.settings as { ignoredSenders?: string[] })?.ignoredSenders ?? [],
    ledgerAllowedSenders: [],
    ledgerMaxAmountThb: 5000
  } : undefined),
  DEFAULT_SETTINGS: { automationEnabled: true, ledgerEnabled: false, notificationsEnabled: true, ignoredSenders: [], ledgerAllowedSenders: [], ledgerMaxAmountThb: 5000 },
  loadAutomationSettings: vi.fn(),
  normalizeExactSenderEmail: vi.fn((value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? value.toLowerCase() : null),
  normalizeIgnoredSenders: vi.fn((values: string[]) => Array.from(new Set(values.filter((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)).map((value) => value.toLowerCase())))),
  normalizeLedgerAllowedSenders: vi.fn((values: string[]) => values),
  toAutomationSettingsJson: vi.fn((values: Record<string, unknown>) => values)
}));
vi.mock('./notifications', () => ({ BUILTIN_CLASSIFIERS: [], renderEmailAutomationNotification: vi.fn(), notionPageUrl: vi.fn(), sendEmailAutomationTestNotification: vi.fn() }));

describe('email attention review mutations', () => {
  beforeEach(() => {
    state.updateSucceeds = true;
    state.selectResults = [[state.review]];
    state.updatedTables.length = 0;
    state.updatedValues.length = 0;
    state.inserted.length = 0;
  });

  it('dismisses only the review and appends an explicit irrelevant audit entry', async () => {
    const { dismissEmailAutomationReviewAsIrrelevant } = await import('./dashboard');
    await dismissEmailAutomationReviewAsIrrelevant({ reviewId: state.review.id, analysis: 'Bounded evidence checked.', summary: '', needsFullBody: false, expectedRevision: 0 });

    expect(state.updatedTables).toEqual(['reviews']);
    expect(state.updatedValues[0]).toMatchObject({ status: 'done', summary: 'Dismissed as irrelevant.', analysisProvenance: { disposition: 'dismissed_irrelevant', needsFullBody: false, revision: 1 } });
    expect(state.updatedTables).not.toContain('actions');
    expect(state.updatedTables).not.toContain('outbox');
    expect(state.inserted).toContainEqual(expect.objectContaining({ table: 'audit', values: expect.objectContaining({ action: 'review_dismissed_irrelevant' }) }));
  });

  it('requires server-validated confirmation before adding a review sender', async () => {
    const { addEmailAutomationReviewSenderToIgnoredList } = await import('./dashboard');
    await expect(addEmailAutomationReviewSenderToIgnoredList(state.review.id, false)).rejects.toThrow('Confirm the visible-sender spoofing');
    expect(state.inserted).toEqual([]);
  });

  it('rejects ambiguous visible senders before changing settings', async () => {
    state.selectResults = [[{ eventId: 42, fromAddress: 'first@example.test, second@example.test' }]];
    const { addEmailAutomationReviewSenderToIgnoredList } = await import('./dashboard');
    await expect(addEmailAutomationReviewSenderToIgnoredList(state.review.id, true)).rejects.toThrow('one unambiguous valid exact email address');
    expect(state.inserted).toEqual([]);
  });

  it('adds a confirmed exact sender and appends an event-scoped audit entry', async () => {
    state.selectResults = [
      [{ eventId: 42, fromAddress: 'Notices <notices@example.test>' }],
      [{ automationEnabled: true, ledgerEnabled: false, notificationsEnabled: true, settings: { ignoredSenders: [] } }]
    ];
    const { addEmailAutomationReviewSenderToIgnoredList } = await import('./dashboard');
    await addEmailAutomationReviewSenderToIgnoredList(state.review.id, true);
    expect(state.inserted).toContainEqual(expect.objectContaining({ table: 'audit', values: expect.objectContaining({ action: 'review_sender_added_to_ignored_list', eventId: 42 }) }));
  });

  it('rejects a settings save when any locked base setting is stale', async () => {
    state.selectResults = [[{ automationEnabled: true, ledgerEnabled: true, notificationsEnabled: true, settings: { ignoredSenders: [], ledgerAllowedSenders: [], ledgerMaxAmountThb: 5000 } }]];
    const { updateSettings } = await import('./dashboard');
    await expect(updateSettings({
      automationEnabled: true,
      ledgerEnabled: false,
      notificationsEnabled: true,
      ignoredSenders: [],
      ledgerAllowedSenders: [],
      ledgerMaxAmountThb: 5000,
      baseSettings: { automationEnabled: true, ledgerEnabled: false, notificationsEnabled: true, ignoredSenders: [], ledgerAllowedSenders: [], ledgerMaxAmountThb: 5000 },
      confirmIgnoredSenderBypassRisk: false
    })).rejects.toThrow('Automation settings changed');
    expect(state.inserted.filter((entry) => entry.table === 'settings')).toHaveLength(1);
    expect(state.inserted.some((entry) => entry.table === 'audit')).toBe(false);
  });

  it('does not append an audit entry when the optimistic review update loses a race', async () => {
    state.updateSucceeds = false;
    const { dismissEmailAutomationReviewAsIrrelevant } = await import('./dashboard');
    await expect(dismissEmailAutomationReviewAsIrrelevant({ reviewId: state.review.id, analysis: '', summary: '', needsFullBody: false, expectedRevision: 0 })).rejects.toThrow('Only an open review can be dismissed');
    expect(state.inserted).toEqual([]);
  });
});
