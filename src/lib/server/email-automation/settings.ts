import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAutomationSettings } from '$lib/server/db/schema';

export type EmailAutomationSettings = {
  automationEnabled: boolean;
  ledgerEnabled: boolean;
  notificationsEnabled: boolean;
  ignoredSenders: string[];
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
  ignoredSenders: [],
  ledgerAllowedSenders: [],
  ledgerMaxAmountThb: DEFAULT_LEDGER_MAX_AMOUNT_THB
};

const normalizeSender = (value: string) => value.trim().toLowerCase().replace(/^mailto:/, '');
const EXACT_EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export const normalizeExactSenderEmail = (value: string): string | null => {
  const normalized = normalizeSender(value);
  return EXACT_EMAIL_PATTERN.test(normalized) ? normalized : null;
};

export const normalizeLedgerAllowedSenders = (values: string[]): string[] => Array.from(new Set(values.map(normalizeSender).filter(Boolean)));
export const normalizeIgnoredSenders = (values: string[]): string[] => Array.from(new Set(values.map(normalizeExactSenderEmail).filter((value): value is string => value !== null)));

const parseSettingsJson = (value: unknown): Pick<EmailAutomationSettings, 'ignoredSenders' | 'ledgerAllowedSenders' | 'ledgerMaxAmountThb'> => {
  if (!value || typeof value !== 'object') return { ignoredSenders: [], ledgerAllowedSenders: [], ledgerMaxAmountThb: DEFAULT_LEDGER_MAX_AMOUNT_THB };
  const record = value as Record<string, unknown>;
  const ignoredSenders = Array.isArray(record.ignoredSenders)
    ? normalizeIgnoredSenders(record.ignoredSenders.filter((entry): entry is string => typeof entry === 'string'))
    : [];
  const allowedSenders = Array.isArray(record.ledgerAllowedSenders)
    ? normalizeLedgerAllowedSenders(record.ledgerAllowedSenders.filter((entry): entry is string => typeof entry === 'string'))
    : [];
  const maxAmount = Number(record.ledgerMaxAmountThb);
  return {
    ignoredSenders,
    ledgerAllowedSenders: allowedSenders,
    ledgerMaxAmountThb: Number.isFinite(maxAmount) && maxAmount > 0 ? maxAmount : DEFAULT_LEDGER_MAX_AMOUNT_THB
  };
};

export const automationSettingsFromRow = (row?: {
  automationEnabled: boolean;
  ledgerEnabled: boolean;
  notificationsEnabled: boolean;
  settings: unknown;
}): EmailAutomationSettings => row ? {
  automationEnabled: row.automationEnabled,
  ledgerEnabled: row.ledgerEnabled,
  notificationsEnabled: row.notificationsEnabled,
  ...parseSettingsJson(row.settings)
} : { ...DEFAULT_SETTINGS };

export const toAutomationSettingsJson = (values: EmailAutomationSettings) => ({
  ignoredSenders: normalizeIgnoredSenders(values.ignoredSenders),
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
    return automationSettingsFromRow(settings);
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
    settings: toAutomationSettingsJson(values),
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: emailAutomationSettings.id,
    set: {
      automationEnabled: values.automationEnabled,
      ledgerEnabled: values.ledgerEnabled,
      notificationsEnabled: values.notificationsEnabled,
      settings: toAutomationSettingsJson(values),
      updatedAt: new Date()
    }
  });
};
