import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  perform: vi.fn(),
  startReceipt: vi.fn(),
  activateReceipt: vi.fn(),
  failReceipt: vi.fn(),
  processReceipt: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({
  env: {
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    EMAIL_AUTOMATION_TELEGRAM_WEBHOOK_SECRET: 'test_webhook_secret_32_chars_long_',
    EMAIL_AUTOMATION_TELEGRAM_ALLOWED_USER_IDS: '99,100',
    EMAIL_AUTOMATION_TELEGRAM_CHAT_ID: '-1234',
    EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID: '55',
    EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID: '-5678',
    EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_MESSAGE_THREAD_ID: '66'
  }
}));
vi.mock('$lib/server/email-automation/telegram-actions', () => ({
  performEmailAutomationTelegramAction: mocks.perform
}));
vi.mock('$lib/server/email-automation/telegram-receipt-upload', () => ({
  TELEGRAM_RECEIPT_MAX_BYTES: 10 * 1024 * 1024,
  startEmailReceiptUploadSession: mocks.startReceipt,
  activateEmailReceiptUploadSession: mocks.activateReceipt,
  failEmailReceiptUploadSession: mocks.failReceipt,
  processEmailReceiptUpload: mocks.processReceipt
}));

import { POST } from './+server';

const requestForUpdate = (update: Record<string, unknown>, secret = 'test_webhook_secret_32_chars_long_') => new Request(
  'https://example.test/api/webhooks/telegram/email-automation',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-bot-api-secret-token': secret
    },
    body: JSON.stringify(update)
  }
);

const callbackRequest = ({ secret = 'test_webhook_secret_32_chars_long_', userId = 99, data = 'email:dismiss:42' } = {}) => requestForUpdate({
  callback_query: {
    id: 'callback-1',
    from: { id: userId },
    data,
    message: { message_id: 8, message_thread_id: 55, chat: { id: -1234 } }
  }
}, secret);

const financialCallbackRequest = ({ userId = 101, data = 'email:dismiss:42', threadId = 66 } = {}) => requestForUpdate({
  callback_query: {
    id: 'financial-callback-1',
    from: { id: userId },
    data,
    message: { message_id: 9, message_thread_id: threadId, chat: { id: -5678 } }
  }
});

describe('email automation Telegram webhook', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    mocks.perform.mockReset().mockResolvedValue({
      message: 'Review dismissed as irrelevant.',
      replyMarkup: { inline_keyboard: [[{ text: 'Open', url: 'https://example.test/events/42' }]] }
    });
    mocks.startReceipt.mockReset().mockResolvedValue({ id: 7, created: true, status: 'awaiting_prompt', promptMessageId: null, expiresAt: new Date('2026-08-25T00:00:00Z') });
    mocks.activateReceipt.mockReset().mockResolvedValue(undefined);
    mocks.failReceipt.mockReset().mockResolvedValue(undefined);
    mocks.processReceipt.mockReset().mockResolvedValue({ matched: true, attached: true, eventId: 42, fileName: 'receipt.jpg' });
  });

  it('rejects updates without the configured Telegram webhook secret', async () => {
    const response = await POST({ request: callbackRequest({ secret: 'wrong' }) } as never);
    expect(response.status).toBe(401);
    expect(mocks.perform).not.toHaveBeenCalled();
  });

  it('does not authorize a user merely because they are in the configured chat', async () => {
    const response = await POST({ request: callbackRequest({ userId: 101 }) } as never);
    expect(response.status).toBe(200);
    expect(mocks.perform).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('executes an allowlisted command and updates the inline controls', async () => {
    const response = await POST({ request: callbackRequest() } as never);
    expect(response.status).toBe(200);
    expect(mocks.perform).toHaveBeenCalledWith({ action: 'dismiss', eventId: 42, telegramUserId: 99, confirmationToken: undefined });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('/answerCallbackQuery');
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toContain('/editMessageReplyMarkup');
  });

  it('trusts callbacks from the exact financial group without the legacy user allowlist', async () => {
    const response = await POST({ request: financialCallbackRequest() } as never);
    expect(response.status).toBe(200);
    expect(mocks.perform).toHaveBeenCalledWith({ action: 'dismiss', eventId: 42, telegramUserId: 101, confirmationToken: undefined });
  });

  it('does not trust another topic in the financial group', async () => {
    const response = await POST({ request: financialCallbackRequest({ threadId: 67 }) } as never);
    expect(response.status).toBe(200);
    expect(mocks.perform).not.toHaveBeenCalled();
  });

  it('starts a user-bound receipt upload session from the Ledger button', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => new Response(
      JSON.stringify(url.includes('/sendMessage') ? { ok: true, result: { message_id: 77 } } : { ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
    const response = await POST({ request: callbackRequest({ data: 'email:receipt:42' }) } as never);
    expect(response.status).toBe(200);
    expect(mocks.startReceipt).toHaveBeenCalledWith({
      eventId: 42,
      callbackQueryId: 'callback-1',
      telegramUserId: 99,
      telegramChatId: -1234,
      telegramThreadId: 55,
      sourceMessageId: 8
    });
    expect(mocks.activateReceipt).toHaveBeenCalledWith(7, 77);
    expect(mocks.perform).not.toHaveBeenCalled();
  });

  it('does not create another prompt when Telegram replays a callback', async () => {
    mocks.startReceipt.mockResolvedValue({
      id: 7,
      created: false,
      status: 'awaiting_photo',
      promptMessageId: 77,
      expiresAt: new Date('2026-08-25T00:00:00Z')
    });
    const response = await POST({ request: callbackRequest({ data: 'email:receipt:42' }) } as never);
    expect(response.status).toBe(200);
    expect(mocks.activateReceipt).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('/answerCallbackQuery');
  });

  it('processes an allowlisted image reply for the matching prompt', async () => {
    const request = requestForUpdate({
      message: {
        message_id: 90,
        message_thread_id: 55,
        from: { id: 99 },
        chat: { id: -1234 },
        reply_to_message: { message_id: 77 },
        photo: [
          { file_id: 'small', file_unique_id: 'same-photo' },
          { file_id: 'large', file_unique_id: 'same-photo', file_size: 1234 }
        ]
      }
    });
    const response = await POST({ request } as never);
    expect(response.status).toBe(200);
    expect(mocks.processReceipt).toHaveBeenCalledWith({
      promptMessageId: 77,
      telegramUserId: 99,
      telegramChatId: -1234,
      telegramThreadId: 55,
      candidate: { fileId: 'large', fileUniqueId: 'same-photo', declaredSize: 1234 }
    });
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('/sendMessage');
  });
});
