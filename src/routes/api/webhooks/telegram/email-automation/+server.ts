import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { performEmailAutomationTelegramAction } from '$lib/server/email-automation/telegram-actions';
import { parseEmailAutomationCallbackData } from '$lib/server/email-automation/notifications/telegram-buttons';
import {
  activateEmailReceiptUploadSession,
  failEmailReceiptUploadSession,
  processEmailReceiptUpload,
  startEmailReceiptUploadSession,
  TELEGRAM_RECEIPT_MAX_BYTES
} from '$lib/server/email-automation/telegram-receipt-upload';

const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token';

type TelegramCallbackQuery = {
  id?: string;
  from?: { id?: number };
  data?: string;
  message?: {
    message_id?: number;
    message_thread_id?: number;
    chat?: { id?: number };
  };
};

type TelegramMessage = {
  message_id?: number;
  message_thread_id?: number;
  from?: { id?: number };
  chat?: { id?: number };
  reply_to_message?: { message_id?: number };
  photo?: Array<{ file_id?: string; file_unique_id?: string; file_size?: number; width?: number; height?: number }>;
  document?: { file_id?: string; file_unique_id?: string; file_size?: number; file_name?: string; mime_type?: string };
};

type TelegramUpdate = { callback_query?: TelegramCallbackQuery; message?: TelegramMessage };

const sameSecret = (actual: string | null, expected: string | undefined) => {
  if (!actual || !expected || !/^[A-Za-z0-9_-]{32,256}$/.test(expected)) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
};

const parseAllowedUserIds = (value: string | undefined) => new Set(
  (value ?? '').split(/[\s,]+/).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0)
);

const callTelegram = async <T = unknown>(method: string, body: Record<string, unknown>): Promise<T | undefined> => {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error('Telegram bot is not configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(env.TELEGRAM_ALERT_TIMEOUT_MS || 3000));
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Telegram ${method} failed with HTTP ${response.status}.`);
    const payload = await response.json().catch(() => null) as { ok?: boolean; result?: T; description?: string } | null;
    if (payload?.ok === false) throw new Error(`Telegram ${method} failed: ${payload.description || 'unknown error'}.`);
    return payload?.result;
  } finally {
    clearTimeout(timeout);
  }
};

const isAuthorizedLocation = (userId: number, chatId: number, threadId: number | undefined) => {
  const allowedUserIds = parseAllowedUserIds(env.EMAIL_AUTOMATION_TELEGRAM_ALLOWED_USER_IDS);
  const expectedChatId = env.EMAIL_AUTOMATION_TELEGRAM_CHAT_ID;
  const expectedThreadId = env.EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID;
  return Boolean(expectedChatId && String(chatId) === expectedChatId)
    && (!expectedThreadId || String(threadId) === expectedThreadId)
    && allowedUserIds.has(userId);
};

const sendReceiptPrompt = async (chatId: number, threadId: number | undefined, sourceMessageId: number) => {
  const result = await callTelegram<{ message_id?: number }>('sendMessage', {
    chat_id: chatId,
    message_thread_id: threadId,
    text: '📎 Reply to this message with one receipt image (JPG, PNG, or WebP, up to 10 MB). This one-time request remains available for one month.',
    reply_parameters: { message_id: sourceMessageId },
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Send the receipt image'
    }
  });
  if (!Number.isSafeInteger(result?.message_id)) throw new Error('Telegram did not return the receipt prompt message ID.');
  return result!.message_id!;
};

const handleReceiptCallback = async ({
  callbackId,
  eventId,
  telegramUserId,
  chatId,
  threadId,
  sourceMessageId
}: {
  callbackId: string;
  eventId: number;
  telegramUserId: number;
  chatId: number;
  threadId?: number;
  sourceMessageId: number;
}) => {
  let sessionId: number | undefined;
  try {
    const session = await startEmailReceiptUploadSession({
      eventId,
      callbackQueryId: callbackId,
      telegramUserId,
      telegramChatId: chatId,
      telegramThreadId: threadId,
      sourceMessageId
    });
    sessionId = session.id;
    if (!session.created) {
      await callTelegram('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: session.status === 'processing'
          ? 'This receipt is already being processed.'
          : 'A receipt prompt is already active for this Ledger record.'
      });
      return;
    }
    const promptMessageId = await sendReceiptPrompt(chatId, threadId, sourceMessageId);
    await activateEmailReceiptUploadSession(session.id, promptMessageId);
    await callTelegram('answerCallbackQuery', {
      callback_query_id: callbackId,
      text: 'Reply to the new prompt with the receipt image.'
    });
  } catch (error) {
    if (sessionId) await failEmailReceiptUploadSession(sessionId, error).catch(() => undefined);
    console.error('Could not start Telegram receipt upload.', error);
    await callTelegram('answerCallbackQuery', {
      callback_query_id: callbackId,
      text: 'A receipt upload could not be started. Please try again.',
      show_alert: true
    }).catch(() => undefined);
  }
};

const handleReceiptMessage = async (message: TelegramMessage) => {
  const userId = message.from?.id;
  const chatId = message.chat?.id;
  const messageId = message.message_id;
  const promptMessageId = message.reply_to_message?.message_id;
  if (
    !Number.isSafeInteger(userId)
    || !Number.isSafeInteger(chatId)
    || !Number.isSafeInteger(messageId)
    || !Number.isSafeInteger(promptMessageId)
    || !isAuthorizedLocation(userId!, chatId!, message.message_thread_id)
  ) return;

  const largestPhoto = message.photo?.filter((photo) => typeof photo.file_id === 'string').at(-1);
  const document = message.document;
  const acceptedDocumentMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const candidate = largestPhoto?.file_id && largestPhoto.file_unique_id
    ? { fileId: largestPhoto.file_id, fileUniqueId: largestPhoto.file_unique_id, declaredSize: largestPhoto.file_size }
    : document?.file_id && document.file_unique_id && document.mime_type && acceptedDocumentMimeTypes.has(document.mime_type)
      ? { fileId: document.file_id, fileUniqueId: document.file_unique_id, declaredSize: document.file_size }
      : null;
  if (!candidate) return;

  if (candidate.declaredSize && candidate.declaredSize > TELEGRAM_RECEIPT_MAX_BYTES) {
    await callTelegram('sendMessage', {
      chat_id: chatId,
      message_thread_id: message.message_thread_id,
      text: 'That image is larger than 10 MB. Please send a smaller JPG, PNG, or WebP image.',
      reply_parameters: { message_id: messageId }
    }).catch(() => undefined);
    return;
  }

  try {
    const result = await processEmailReceiptUpload({
      promptMessageId: promptMessageId!,
      telegramUserId: userId!,
      telegramChatId: chatId!,
      telegramThreadId: message.message_thread_id,
      candidate
    });
    if (!result.matched) return;
    await callTelegram('sendMessage', {
      chat_id: chatId,
      message_thread_id: message.message_thread_id,
      text: '✅ Receipt attached to the Financial Ledger record.',
      reply_parameters: { message_id: messageId }
    });
  } catch (error) {
    console.error('Telegram receipt upload failed.', error);
    await callTelegram('sendMessage', {
      chat_id: chatId,
      message_thread_id: message.message_thread_id,
      text: 'The receipt could not be attached. Tap “Attach receipt” on the original notification to try again.',
      reply_parameters: { message_id: messageId }
    }).catch(() => undefined);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  if (!sameSecret(request.headers.get(TELEGRAM_SECRET_HEADER), env.EMAIL_AUTOMATION_TELEGRAM_WEBHOOK_SECRET)) {
    return json({ ok: false }, { status: 401 });
  }

  const update = await request.json().catch(() => null) as TelegramUpdate | null;
  if (update?.message) {
    await handleReceiptMessage(update.message);
    return json({ ok: true });
  }

  const callback = update?.callback_query;
  const callbackId = callback?.id;
  const userId = callback?.from?.id;
  const chatId = callback?.message?.chat?.id;
  const messageId = callback?.message?.message_id;
  const command = parseEmailAutomationCallbackData(callback?.data);

  if (!callbackId || !Number.isSafeInteger(userId) || !Number.isSafeInteger(chatId) || !Number.isSafeInteger(messageId) || !command) {
    return json({ ok: true });
  }

  // A valid Telegram webhook secret proves the update came from Telegram. The
  // separate user allowlist is still required because group membership is not a manager role.
  if (!isAuthorizedLocation(userId!, chatId!, callback.message?.message_thread_id)) {
    await callTelegram('answerCallbackQuery', {
      callback_query_id: callbackId,
      text: 'This command is restricted to configured email-automation managers.',
      show_alert: true
    }).catch(() => undefined);
    return json({ ok: true });
  }

  if (command.action === 'receipt') {
    await handleReceiptCallback({
      callbackId,
      eventId: command.eventId,
      telegramUserId: userId!,
      chatId: chatId!,
      threadId: callback.message?.message_thread_id,
      sourceMessageId: messageId!
    });
    return json({ ok: true });
  }

  try {
    const result = await performEmailAutomationTelegramAction({
      action: command.action,
      eventId: command.eventId,
      telegramUserId: userId!,
      confirmationToken: command.confirmationToken
    });

    // The database command has already committed at this point. Telegram UI
    // failures must not be reported as command failures or trigger the mutation again.
    const telegramUpdates = [
      callTelegram('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: result.message.slice(0, 200),
        show_alert: result.showAlert ?? false
      })
    ];
    if (result.replyMarkup) {
      telegramUpdates.push(callTelegram('editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: result.replyMarkup
      }));
    }
    const updateResults = await Promise.allSettled(telegramUpdates);
    if (updateResults.some((result) => result.status === 'rejected')) {
      console.error('Email automation command succeeded, but Telegram UI feedback failed.');
    }
    return json({ ok: true });
  } catch (error) {
    console.error('Email automation Telegram command failed.', error);
    await callTelegram('answerCallbackQuery', {
      callback_query_id: callbackId,
      text: 'The command could not be completed. Please open the dashboard or try again.',
      show_alert: true
    }).catch(() => undefined);
    return json({ ok: true });
  }
};
