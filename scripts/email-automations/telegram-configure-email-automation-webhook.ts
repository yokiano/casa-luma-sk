import 'dotenv/config';

const apply = process.argv.includes('--apply');
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.EMAIL_AUTOMATION_TELEGRAM_WEBHOOK_SECRET;
const allowedUserIds = (process.env.EMAIL_AUTOMATION_TELEGRAM_ALLOWED_USER_IDS ?? '')
  .split(/[\s,]+/)
  .filter(Boolean);
const baseUrl = (process.env.EMAIL_AUTOMATION_PUBLIC_URL || 'https://www.casalumakpg.com').replace(/\/+$/, '');
const webhookUrl = `${baseUrl}/api/webhooks/telegram/email-automation`;

if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is missing.');
if (!webhookSecret) throw new Error('EMAIL_AUTOMATION_TELEGRAM_WEBHOOK_SECRET is missing.');
if (!/^[A-Za-z0-9_-]{32,256}$/.test(webhookSecret)) {
  throw new Error('EMAIL_AUTOMATION_TELEGRAM_WEBHOOK_SECRET must be a high-entropy 32-256 character value using only A-Z, a-z, 0-9, _ and -.');
}
if (allowedUserIds.length === 0 || allowedUserIds.some((id) => !/^\d+$/.test(id) || Number(id) <= 0)) {
  throw new Error('EMAIL_AUTOMATION_TELEGRAM_ALLOWED_USER_IDS must contain one or more positive Telegram user IDs.');
}
if (!webhookUrl.startsWith('https://')) throw new Error('The Telegram webhook URL must use HTTPS.');

const telegramCall = async (method: string, body?: Record<string, unknown>) => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {})
  });
  const result = await response.json() as { ok?: boolean; description?: string; result?: unknown };
  if (!response.ok || !result.ok) throw new Error(result.description || `Telegram returned HTTP ${response.status}.`);
  return result.result;
};

if (!apply) {
  const current = await telegramCall('getWebhookInfo') as { url?: string; pending_update_count?: number; last_error_message?: string };
  console.log(JSON.stringify({
    mode: 'dry-run',
    targetWebhookUrl: webhookUrl,
    currentWebhookUrl: current.url || null,
    pendingUpdateCount: current.pending_update_count ?? 0,
    hasLastError: Boolean(current.last_error_message),
    allowedManagerCount: allowedUserIds.length,
    next: 'Deploy the callback route and env vars, then rerun with --apply.'
  }, null, 2));
  process.exit(0);
}

await telegramCall('setWebhook', {
  url: webhookUrl,
  secret_token: webhookSecret,
  allowed_updates: ['callback_query', 'message'],
  drop_pending_updates: false
});
console.log(JSON.stringify({ configured: true, webhookUrl, allowedManagerCount: allowedUserIds.length }, null, 2));
