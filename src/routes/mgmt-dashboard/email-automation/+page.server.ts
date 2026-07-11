import { asc, desc, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { emailAutomationSettings, emailClassificationRules, emailEvents } from '$lib/server/db/schema';
import { renderEmailAutomationNotification, type EmailAutomationInput, type EmailClassification } from '$lib/server/email-automation';

export const load: PageServerLoad = async () => {
  const sampleEmail: EmailAutomationInput = {
    receivedAt: new Date().toISOString(),
    from: 'K BIZ <KBIZ@kasikornbank.com>',
    to: 'automations@casalumakpg.com',
    subject: 'Result of PromptPay Funds Transfer (Success)',
    messageId: '<dashboard-preview@example.test>',
    attachmentCount: 0,
    textBody: 'Reference Number: PPFS260711TEST01 Amount (THB): 123.45'
  };
  const sampleClassification: EmailClassification = {
    classification: 'expense', subtype: 'promptpay_transfer_success', processingState: 'ready', externalRef: 'PPFS260711TEST01', amountMinor: 12345, currency: 'THB', notify: true, handlerKey: 'company_ledger_expense'
  };

  const [settings, totals, recent, rules, subtypes, handlers] = await Promise.all([
    db.select().from(emailAutomationSettings).limit(1).catch(() => []),
    db.select({
      total: sql<number>`count(*)::int`,
      ready: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'ready')::int`,
      review: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'review')::int`,
      ignored: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'ignored')::int`,
      ledgerCreated: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'ledger_created')::int`,
      failedNotification: sql<number>`count(*) filter (where ${emailEvents.notificationState} = 'retry_pending')::int`
    }).from(emailEvents),
    db.select().from(emailEvents).orderBy(desc(emailEvents.receivedAt)).limit(12),
    db.select({
      id: emailClassificationRules.id,
      enabled: emailClassificationRules.enabled,
      priority: emailClassificationRules.priority,
      name: emailClassificationRules.name,
      classification: emailClassificationRules.classification,
      subtype: emailClassificationRules.subtype,
      senderPattern: emailClassificationRules.senderPattern,
      subjectPattern: emailClassificationRules.subjectPattern,
      bodyPatterns: emailClassificationRules.bodyPatterns,
      handlerKey: emailClassificationRules.handlerKey,
      notifyPolicy: emailClassificationRules.notifyPolicy
    }).from(emailClassificationRules).orderBy(desc(emailClassificationRules.enabled), asc(emailClassificationRules.priority), asc(emailClassificationRules.id)),
    db.select({
      classification: emailEvents.classification,
      subtype: emailEvents.subtype,
      processingState: emailEvents.processingState,
      count: sql<number>`count(*)::int`,
      latestReceivedAt: sql<Date>`max(${emailEvents.receivedAt})`
    }).from(emailEvents).groupBy(emailEvents.classification, emailEvents.subtype, emailEvents.processingState).orderBy(desc(sql`count(*)`)).limit(12),
    db.select({
      handlerKey: sql<string | null>`${emailEvents.metadata}->>'handlerKey'`,
      matchedRuleName: sql<string | null>`${emailEvents.metadata}->>'matchedRuleName'`,
      count: sql<number>`count(*)::int`,
      latestReceivedAt: sql<Date>`max(${emailEvents.receivedAt})`
    }).from(emailEvents).groupBy(sql`${emailEvents.metadata}->>'handlerKey'`, sql`${emailEvents.metadata}->>'matchedRuleName'`).orderBy(desc(sql`count(*)`)).limit(12)
  ]);

  return {
    totals: totals[0] ?? { total: 0, ready: 0, review: 0, ignored: 0, ledgerCreated: 0, failedNotification: 0 },
    recent,
    rules,
    subtypes,
    handlers,
    settings: settings[0] ?? { automationEnabled: true, ledgerEnabled: false, notificationsEnabled: true, settings: {}, updatedAt: new Date() },
    notificationPreview: renderEmailAutomationNotification(sampleEmail, sampleClassification)
  };
};

export const actions: Actions = {
  settings: async ({ request }) => {
    const form = await request.formData();
    const values = {
      id: 1,
      automationEnabled: form.get('automationEnabled') === 'on',
      ledgerEnabled: form.get('ledgerEnabled') === 'on',
      notificationsEnabled: form.get('notificationsEnabled') === 'on',
      updatedAt: new Date()
    };

    await db.insert(emailAutomationSettings).values(values)
      .onConflictDoUpdate({
        target: emailAutomationSettings.id,
        set: {
          automationEnabled: values.automationEnabled,
          ledgerEnabled: values.ledgerEnabled,
          notificationsEnabled: values.notificationsEnabled,
          updatedAt: values.updatedAt
        }
      });

    return { ok: true };
  }
};
