import { env } from '$env/dynamic/private';
import type { AlertPublishPayload, AlertPublisher } from './types';

export interface TelegramAlertPublisherOptions {
  botToken: string;
  chatId: string;
  messageThreadId?: string;
  timeoutMs?: number;
}

const withTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const createTelegramAlertPublisher = (
  options: TelegramAlertPublisherOptions
): AlertPublisher => {
  const timeoutMs = options.timeoutMs ?? 3000;

  return {
    publish: async (payload: AlertPublishPayload) => {
      const endpoint = `https://api.telegram.org/bot${options.botToken}/sendMessage`;
      const body = {
        chat_id: options.chatId,
        text: `${payload.title}\n\n${payload.body}`,
        parse_mode: payload.parseMode,
        disable_web_page_preview: true,
        message_thread_id: options.messageThreadId ? Number(options.messageThreadId) : undefined
      };

      const response = await withTimeout(
        endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        },
        timeoutMs
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Telegram sendMessage failed (${response.status}): ${errorText}`);
      }
    }
  };
};

export const createTelegramAlertPublisherFromEnv = (): AlertPublisher | null => {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return null;
  }

  return createTelegramAlertPublisher({
    botToken,
    chatId,
    messageThreadId: env.TELEGRAM_MESSAGE_THREAD_ID,
    timeoutMs: Number(env.TELEGRAM_ALERT_TIMEOUT_MS || 3000)
  });
};
