import 'dotenv/config';

const shouldSend = process.argv.includes('--send');
const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
const body = [
  `🔔 <b>Financials Telegram test · ${localDate}</b>`,
  'This is a delivery test for the dedicated financial operational-reminder destination.',
  'No Notion or balance data was changed.'
].join('\n');

if (!shouldSend) {
  console.log(body.replaceAll(/<[^>]+>/g, ''));
  console.log('Dry run only. Add --send to deliver to EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID.');
  process.exit(0);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID;
if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is missing.');
if (!chatId) throw new Error('EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID is missing.');

const threadId = process.env.EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_MESSAGE_THREAD_ID;
const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: body,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    message_thread_id: threadId ? Number(threadId) : undefined
  })
});

if (!response.ok) {
  const payload = await response.json().catch(() => null) as { description?: string } | null;
  throw new Error(payload?.description || `Telegram returned HTTP ${response.status}.`);
}

console.log('Financial Telegram delivery test sent.');
