import { env } from '$env/dynamic/private';
import { createTelegramAlertPublisher } from '$lib/server/alerts/telegram';
import { loadAutomationSettings } from '../settings';
import type { EmailAutomationInput, EmailClassification } from '../classifier';
import { renderEmailAutomationNotification, renderTestEmailAutomationNotification } from './render';

export type NotificationSendResult = 'sent' | 'not_configured';

const publish = async (body: string) => {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.EMAIL_AUTOMATION_TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return 'not_configured' as const;
  await createTelegramAlertPublisher({
    botToken,
    chatId,
    messageThreadId: env.EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID,
    timeoutMs: Number(env.TELEGRAM_ALERT_TIMEOUT_MS || 3000)
  }).publish({ title: '', body, parseMode: 'HTML' });
  return 'sent' as const;
};

/** Sends the production notification for a classified email event. */
export const sendEmailAutomationNotification = async (
  input: EmailAutomationInput,
  classification: EmailClassification,
  _eventId: number,
  notionPageId?: string
): Promise<NotificationSendResult> => {
  const body = renderEmailAutomationNotification(input, classification, notionPageId);
  return publish(body);
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
  return publish(body);
};
