import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db/client', () => ({ db: {} }));
vi.mock('$lib/server/db/schema', () => ({ emailAutomationSettings: {} }));

describe('email automation settings', () => {
  it('normalizes ignored senders from the settings JSON', async () => {
    const { automationSettingsFromRow } = await import('./settings');
    expect(automationSettingsFromRow({
      automationEnabled: true,
      ledgerEnabled: false,
      notificationsEnabled: true,
      settings: {
        ignoredSenders: [' MAILTO:Example@Example.test ', 'example@example.test'],
        ledgerAllowedSenders: [],
        ledgerMaxAmountThb: 5000
      }
    }).ignoredSenders).toEqual(['example@example.test']);
  });

  it('rejects malformed or ambiguous ignored-sender entries', async () => {
    const { normalizeExactSenderEmail, normalizeIgnoredSenders } = await import('./settings');
    expect(normalizeExactSenderEmail('Display Name <sender@example.test>')).toBeNull();
    expect(normalizeExactSenderEmail('example.test')).toBeNull();
    expect(normalizeIgnoredSenders(['valid@example.test', 'invalid', 'second@example.test, third@example.test'])).toEqual(['valid@example.test']);
  });

  it('preserves every setting while serializing the ignored list', async () => {
    const { toAutomationSettingsJson } = await import('./settings');
    expect(toAutomationSettingsJson({
      automationEnabled: false,
      ledgerEnabled: false,
      notificationsEnabled: false,
      ignoredSenders: [' Notices@Example.test '],
      ledgerAllowedSenders: ['Bank.Example'],
      ledgerMaxAmountThb: 2500
    })).toEqual({
      ignoredSenders: ['notices@example.test'],
      ledgerAllowedSenders: ['bank.example'],
      ledgerMaxAmountThb: 2500
    });
  });
});
