export type TelegramInlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: TelegramInlineKeyboardButton[][];
};

export interface AlertPublishPayload {
  title: string;
  body: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  replyMarkup?: TelegramInlineKeyboardMarkup;
}

export interface AlertPublisher {
  publish: (payload: AlertPublishPayload) => Promise<void>;
}
