import { env } from '$env/dynamic/private';
import type { AlertPublisher } from './types';
import { createTelegramAlertPublisher } from './telegram';

export type TelegramDestination =
  | 'manager_incidents'
  | 'email_default'
  | 'financial_transactions'
  | 'cashier_receipt_alerts';

export type TelegramRuntimeEnv = Partial<Record<
  | 'TELEGRAM_BOT_TOKEN'
  | 'TELEGRAM_ALERT_TIMEOUT_MS'
  | 'TELEGRAM_CHAT_ID'
  | 'TELEGRAM_MESSAGE_THREAD_ID'
  | 'EMAIL_AUTOMATION_TELEGRAM_CHAT_ID'
  | 'EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID'
  | 'EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID'
  | 'EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_MESSAGE_THREAD_ID'
  | 'RECEIPT_CASHIER_ALERT_TELEGRAM_CHAT_ID'
  | 'RECEIPT_CASHIER_ALERT_TELEGRAM_MESSAGE_THREAD_ID',
  string | undefined
>>;

type DestinationEnvironmentKeys = {
  chatId: keyof TelegramRuntimeEnv;
  messageThreadId: keyof TelegramRuntimeEnv;
};

const destinationEnvironmentKeys: Record<TelegramDestination, DestinationEnvironmentKeys> = {
  manager_incidents: {
    chatId: 'TELEGRAM_CHAT_ID',
    messageThreadId: 'TELEGRAM_MESSAGE_THREAD_ID'
  },
  email_default: {
    chatId: 'EMAIL_AUTOMATION_TELEGRAM_CHAT_ID',
    messageThreadId: 'EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID'
  },
  financial_transactions: {
    chatId: 'EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID',
    messageThreadId: 'EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_MESSAGE_THREAD_ID'
  },
  cashier_receipt_alerts: {
    chatId: 'RECEIPT_CASHIER_ALERT_TELEGRAM_CHAT_ID',
    messageThreadId: 'RECEIPT_CASHIER_ALERT_TELEGRAM_MESSAGE_THREAD_ID'
  }
};

export type TelegramDestinationResolution =
  | {
      status: 'configured';
      destination: TelegramDestination;
      chatId: string;
      messageThreadId?: string;
    }
  | {
      status: 'not_configured';
      destination: TelegramDestination;
    };

const readValue = (source: TelegramRuntimeEnv, key: keyof TelegramRuntimeEnv) => {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

/** Resolves a logical destination without ever substituting another group. */
export const resolveTelegramDestination = (
  destination: TelegramDestination,
  source: TelegramRuntimeEnv = env
): TelegramDestinationResolution => {
  const keys = destinationEnvironmentKeys[destination];
  const chatId = readValue(source, keys.chatId);
  if (!chatId) return { status: 'not_configured', destination };

  return {
    status: 'configured',
    destination,
    chatId,
    messageThreadId: readValue(source, keys.messageThreadId)
  };
};

const readTimeoutMs = (source: TelegramRuntimeEnv) => Number(readValue(source, 'TELEGRAM_ALERT_TIMEOUT_MS') || 3000);

/** Builds the shared Telegram publisher for one logical destination. */
export const createTelegramDestinationPublisher = (
  destination: TelegramDestination,
  source: TelegramRuntimeEnv = env
): AlertPublisher | null => {
  const resolved = resolveTelegramDestination(destination, source);
  const botToken = readValue(source, 'TELEGRAM_BOT_TOKEN');
  if (resolved.status === 'not_configured' || !botToken) return null;

  return createTelegramAlertPublisher({
    botToken,
    chatId: resolved.chatId,
    messageThreadId: resolved.messageThreadId,
    timeoutMs: readTimeoutMs(source)
  });
};
