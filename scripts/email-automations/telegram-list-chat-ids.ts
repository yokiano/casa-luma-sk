import 'dotenv/config';

type TelegramChat = {
  id?: number;
  type?: string;
};

type TelegramUser = {
  id?: number;
};

type TelegramUpdate = {
  message?: { chat?: TelegramChat; from?: TelegramUser };
  edited_message?: { chat?: TelegramChat };
  channel_post?: { chat?: TelegramChat };
  edited_channel_post?: { chat?: TelegramChat };
  my_chat_member?: { chat?: TelegramChat };
  chat_member?: { chat?: TelegramChat };
  chat_join_request?: { chat?: TelegramChat };
};

type TelegramResponse = {
  ok?: boolean;
  result?: TelegramUpdate[];
  description?: string;
};

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error('TELEGRAM_BOT_TOKEN is missing.');
  process.exit(1);
}

const endpoint = `https://api.telegram.org/bot${botToken}/getUpdates`;
const listUsers = process.argv.includes('--users');

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allowed_updates: ['message', 'my_chat_member'], limit: 100 })
  });
  const payload = (await response.json()) as TelegramResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description || `Telegram returned HTTP ${response.status}.`);
  }

  const ids = new Set<number>();
  const userIds = new Set<number>();
  for (const update of payload.result ?? []) {
    if (typeof update.message?.from?.id === 'number') userIds.add(update.message.from.id);
    const chats = [
      update.message?.chat,
      update.edited_message?.chat,
      update.channel_post?.chat,
      update.edited_channel_post?.chat,
      update.my_chat_member?.chat,
      update.chat_member?.chat,
      update.chat_join_request?.chat
    ];

    for (const chat of chats) {
      if (typeof chat?.id === 'number' && (chat.type === 'group' || chat.type === 'supergroup')) {
        ids.add(chat.id);
      }
    }
  }

  if (listUsers) {
    if (userIds.size === 0) {
      console.error('No user IDs found. Send a message that mentions the bot, then run this command before configuring the webhook.');
      process.exit(2);
    }
    for (const id of userIds) console.log(id);
  } else {
    if (ids.size === 0) {
      console.error('No group IDs found. Send a message mentioning the bot in the test group, then run this script again.');
      process.exit(2);
    }
    for (const id of ids) console.log(id);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown Telegram API error.';
  console.error(`Unable to read Telegram updates: ${message}`);
  process.exit(1);
}
