import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAutomationSettings } from '$lib/server/db/schema';

export type EmailAutomationSettings = {
  automationEnabled: boolean;
  ledgerEnabled: boolean;
  notificationsEnabled: boolean;
};

export const DEFAULT_SETTINGS: EmailAutomationSettings = {
  automationEnabled: true,
  // DB settings are the runtime control. The env var is kept only as a pre-migration fallback.
  ledgerEnabled: env.EMAIL_AUTOMATION_LEDGER_ENABLED === 'true',
  notificationsEnabled: true
};

/**
 * Loads the singleton automation-settings row from Neon, falling back to env
 * defaults when the table is unreachable (e.g. pre-migration or local dev).
 */
export const loadAutomationSettings = async (): Promise<EmailAutomationSettings> => {
  try {
    const [settings] = await db.select({
      automationEnabled: emailAutomationSettings.automationEnabled,
      ledgerEnabled: emailAutomationSettings.ledgerEnabled,
      notificationsEnabled: emailAutomationSettings.notificationsEnabled
    }).from(emailAutomationSettings).where(eq(emailAutomationSettings.id, 1)).limit(1);
    return settings ?? DEFAULT_SETTINGS;
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
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: emailAutomationSettings.id,
    set: {
      automationEnabled: values.automationEnabled,
      ledgerEnabled: values.ledgerEnabled,
      notificationsEnabled: values.notificationsEnabled,
      updatedAt: new Date()
    }
  });
};
