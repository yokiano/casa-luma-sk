import type { TelegramInlineKeyboardMarkup } from '$lib/server/alerts/types';

export const EMAIL_AUTOMATION_CALLBACK_PREFIX = 'email';

export type EmailAutomationTelegramAction =
  | 'handled'
  | 'dismiss'
  | 'ignore'
  | 'confirm_ignore'
  | 'cancel_ignore'
  | 'receipt'
  | 'test';

const callbackData = (action: EmailAutomationTelegramAction, eventId: number) =>
  `${EMAIL_AUTOMATION_CALLBACK_PREFIX}:${action}:${eventId}`;

export const parseEmailAutomationCallbackData = (value: unknown): {
  action: EmailAutomationTelegramAction;
  eventId: number;
  confirmationToken?: string;
} | null => {
  if (typeof value !== 'string' || value.length > 64) return null;
  const match = /^email:(handled|dismiss|ignore|confirm_ignore|cancel_ignore|receipt|test):(\d+)(?::([A-Za-z0-9_-]{16}))?$/.exec(value);
  if (!match) return null;
  const action = match[1] as EmailAutomationTelegramAction;
  const eventId = Number(match[2]);
  const confirmationToken = match[3];
  if (!Number.isSafeInteger(eventId) || eventId < 0) return null;
  if ((action === 'confirm_ignore' || action === 'cancel_ignore') !== Boolean(confirmationToken)) return null;
  return confirmationToken ? { action, eventId, confirmationToken } : { action, eventId };
};

export const buildEmailAutomationKeyboard = ({
  eventId,
  dashboardUrl,
  review,
  canAttachReceipt = false,
  ignoreConfirmationToken
}: {
  eventId: number;
  dashboardUrl: string;
  review: boolean;
  canAttachReceipt?: boolean;
  ignoreConfirmationToken?: string;
}): TelegramInlineKeyboardMarkup => {
  if (!review) {
    return {
      inline_keyboard: [
        ...(canAttachReceipt ? [[{ text: '📎 Attach receipt', callback_data: callbackData('receipt', eventId) }]] : []),
        [{ text: '📋 Open dashboard', url: dashboardUrl }]
      ]
    };
  }

  if (ignoreConfirmationToken) {
    return {
      inline_keyboard: [
        [{ text: '⚠️ Confirm ignoring future emails', callback_data: `${callbackData('confirm_ignore', eventId)}:${ignoreConfirmationToken}` }],
        [{ text: 'Cancel', callback_data: `${callbackData('cancel_ignore', eventId)}:${ignoreConfirmationToken}` }]
      ]
    };
  }

  return {
    inline_keyboard: [
      [
        { text: '✅ Mark handled', callback_data: callbackData('handled', eventId) },
        { text: '🗑 Dismiss', callback_data: callbackData('dismiss', eventId) }
      ],
      [{ text: '🚫 Ignore this sender', callback_data: callbackData('ignore', eventId) }],
      ...(canAttachReceipt ? [[{ text: '📎 Attach receipt', callback_data: callbackData('receipt', eventId) }]] : []),
      [{ text: '📋 Open dashboard', url: dashboardUrl }]
    ]
  };
};

/** Demo buttons never mutate data, even if a test message reaches the webhook. */
export const buildEmailAutomationTestKeyboard = (dashboardUrl: string): TelegramInlineKeyboardMarkup => ({
  inline_keyboard: [
    [
      { text: '✅ Mark handled', callback_data: callbackData('test', 0) },
      { text: '🗑 Dismiss', callback_data: callbackData('test', 0) }
    ],
    [{ text: '🚫 Ignore this sender', callback_data: callbackData('test', 0) }],
    [{ text: '📋 Open dashboard', url: dashboardUrl }]
  ]
});
