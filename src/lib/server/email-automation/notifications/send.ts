import { env } from '$env/dynamic/private';
import { createTelegramAlertPublisher } from '$lib/server/alerts/telegram';
import { loadAutomationSettings } from '../settings';
import type { EmailAutomationInput, EmailClassification } from '../classifier';
import { renderDurableEmailAutomationNotification, renderEmailAutomationNotification, renderTestEmailAutomationNotification, type DurableNotificationOutcome } from './render';
import { buildEmailAutomationKeyboard, buildEmailAutomationTestKeyboard } from './telegram-buttons';

export type NotificationSendResult = 'sent' | 'not_configured';

export const getEmailAutomationEventUrl = (eventId: number) => {
  const baseUrl = (env.EMAIL_AUTOMATION_PUBLIC_URL || 'https://www.casalumakpg.com').replace(/\/+$/, '');
  return `${baseUrl}/mgmt-dashboard/email-automation/${eventId}`;
};

const publish = async (body: string, replyMarkup?: ReturnType<typeof buildEmailAutomationKeyboard>) => {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.EMAIL_AUTOMATION_TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return 'not_configured' as const;
  await createTelegramAlertPublisher({
    botToken,
    chatId,
    messageThreadId: env.EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID,
    timeoutMs: Number(env.TELEGRAM_ALERT_TIMEOUT_MS || 3000)
  }).publish({ title: '', body, parseMode: 'HTML', replyMarkup });
  return 'sent' as const;
};

/** Sends the production notification for a classified email event. */
export const sendEmailAutomationNotification = async (
  input: EmailAutomationInput,
  classification: EmailClassification,
  eventId: number,
  notionPageId?: string,
  durableOutcome?: DurableNotificationOutcome
): Promise<NotificationSendResult> => {
  const body = durableOutcome
    ? renderDurableEmailAutomationNotification(input, classification, durableOutcome)
    : renderEmailAutomationNotification(input, classification, notionPageId);
  return publish(body, buildEmailAutomationKeyboard({
    eventId,
    dashboardUrl: getEmailAutomationEventUrl(eventId),
    review: durableOutcome?.hasOpenReview === true || classification.processingState === 'review' || classification.classification === 'review',
    canAttachReceipt: classification.handlerKey === 'company_ledger_expense'
      && Boolean(notionPageId)
      && ['succeeded', 'reconciled'].includes(durableOutcome?.actionStatus ?? '')
  }));
};

/**
 * Sends a demo message to the same Telegram chat as production so the dashboard
 * "Send test" button shows exactly what a real notification would look like.
 * Reads the current automation settings so the rendered template matches
 * production behavior (e.g. shows "Expense recorded" when Ledger is enabled).
 * No actual side effects (Ledger pages, DB events) are created. The body is
 * wrapped with a visible TEST banner.
 */
export const sendEmailAutomationTestNotification = async (
  input: EmailAutomationInput,
  classification: EmailClassification
): Promise<NotificationSendResult> => {
  const settings = await loadAutomationSettings();
  const body = renderTestEmailAutomationNotification(input, classification, settings.ledgerEnabled);
  const dashboardUrl = getEmailAutomationEventUrl(0).replace(/\/0$/, '');
  return publish(body, buildEmailAutomationTestKeyboard(dashboardUrl));
};
