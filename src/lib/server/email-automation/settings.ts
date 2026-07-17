import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAutomationSettings } from '$lib/server/db/schema';

export type EmailAutomationSettings = {
  automationEnabled: boolean;
  ledgerEnabled: boolean;
  notificationsEnabled: boolean;
  ledgerAllowedSenders: string[];
  ledgerMaxAmountThb: number;
};

const DEFAULT_LEDGER_MAX_AMOUNT_THB = 5_000;

export const DEFAULT_SETTINGS: EmailAutomationSettings = {
  automationEnabled: true,
  // Default closed. The dashboard switch can enable the guarded canary only when
  // deployment env also opts in.
  ledgerEnabled: false,
  notificationsEnabled: true,
  ledgerAllowedSenders: [],
  ledgerMaxAmountThb: DEFAULT_LEDGER_MAX_AMOUNT_THB
};

const normalizeSender = (value: string) => value.trim().toLowerCase().replace(/^mailto:/, '');

export const normalizeLedgerAllowedSenders = (values: string[]): string[] => Array.from(new Set(values.map(normalizeSender).filter(Boolean)));

const parseSettingsJson = (value: unknown): Pick<EmailAutomationSettings, 'ledgerAllowedSenders' | 'ledgerMaxAmountThb'> => {
  if (!value || typeof value !== 'object') return { ledgerAllowedSenders: [], ledgerMaxAmountThb: DEFAULT_LEDGER_MAX_AMOUNT_THB };
  const record = value as Record<string, unknown>;
  const allowedSenders = Array.isArray(record.ledgerAllowedSenders)
    ? normalizeLedgerAllowedSenders(record.ledgerAllowedSenders.filter((entry): entry is string => typeof entry === 'string'))
    : [];
  const maxAmount = Number(record.ledgerMaxAmountThb);
  return {
    ledgerAllowedSenders: allowedSenders,
    ledgerMaxAmountThb: Number.isFinite(maxAmount) && maxAmount > 0 ? maxAmount : DEFAULT_LEDGER_MAX_AMOUNT_THB
  };
};

const toSettingsJson = (values: EmailAutomationSettings) => ({
  ledgerAllowedSenders: normalizeLedgerAllowedSenders(values.ledgerAllowedSenders),
  ledgerMaxAmountThb: values.ledgerMaxAmountThb
});

/**
 * Loads the singleton automation-settings row from Neon, falling back to env
 * defaults when the table is unreachable (e.g. pre-migration or local dev).
 */
export const loadAutomationSettings = async (): Promise<EmailAutomationSettings> => {
  try {
    const [settings] = await db.select({
      automationEnabled: emailAutomationSettings.automationEnabled,
      ledgerEnabled: emailAutomationSettings.ledgerEnabled,
      notificationsEnabled: emailAutomationSettings.notificationsEnabled,
      settings: emailAutomationSettings.settings
    }).from(emailAutomationSettings).where(eq(emailAutomationSettings.id, 1)).limit(1);
    if (!settings) return DEFAULT_SETTINGS;
    const parsed = parseSettingsJson(settings.settings);
    return {
      automationEnabled: settings.automationEnabled,
      ledgerEnabled: settings.ledgerEnabled,
      notificationsEnabled: settings.notificationsEnabled,
      ...parsed
    };
  } catch (error) {
    console.warn('Email automation settings unavailable; falling back to env defaults.', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveAutomationSettings = async (values: EmailAutomationSettings): Promise<void> => {
  await db.insert(emailAutomationSettings).values({
    id: 1,
    automationEnabled: values.automationEnabled,
    ledgerEnabled: values.ledgerEnabled,
    notificationsEnabled: values.notificationsEnabled,
    settings: toSettingsJson(values),
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: emailAutomationSettings.id,
    set: {
      automationEnabled: values.automationEnabled,
      ledgerEnabled: values.ledgerEnabled,
      notificationsEnabled: values.notificationsEnabled,
      settings: toSettingsJson(values),
      updatedAt: new Date()
    }
  });
};
