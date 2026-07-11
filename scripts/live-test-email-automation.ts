import 'dotenv/config';
import postgres from 'postgres';

const PRODUCTION_WEBHOOK_URL = 'https://www.casalumakpg.com/api/webhooks/email';
const args = new Set(process.argv.slice(2));
const webhookUrl = process.env.EMAIL_AUTOMATION_TEST_WEBHOOK_URL ?? (args.has('--production') ? PRODUCTION_WEBHOOK_URL : undefined);
const secret = process.env.EMAIL_WEBHOOK_SECRET;

if (!webhookUrl) {
  throw new Error('Set EMAIL_AUTOMATION_TEST_WEBHOOK_URL, or pass --production to intentionally hit the production webhook.');
}
if (webhookUrl === PRODUCTION_WEBHOOK_URL && !args.has('--production')) {
  throw new Error('Production webhook requires the explicit --production flag.');
}
if (webhookUrl === PRODUCTION_WEBHOOK_URL && !args.has('--allow-ledger-risk')) {
  throw new Error('Production smoke tests can create a Ledger page if EMAIL_AUTOMATION_LEDGER_ENABLED=true remotely. Re-run with --production --allow-ledger-risk after confirming Ledger is disabled or accepting that risk.');
}
if (!secret) throw new Error('EMAIL_WEBHOOK_SECRET is missing');

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING;
const runId = `email-automation-test-${Date.now()}`;
const messageId = `<${runId}@casaluma.test>`;
const subject = `[test] Result of PromptPay Funds Transfer (Success) ${runId}`;
const externalRef = `PPFS${Date.now().toString().slice(-10)}TEST`;

const payload = {
  receivedAt: new Date().toISOString(),
  from: 'K BIZ <KBIZ@kasikornbank.com>',
  to: 'automations@casalumakpg.com',
  subject,
  messageId,
  attachmentCount: 0,
  textBody: `Reference Number: ${externalRef}\nAmount (THB): 123.45\nTemporary email automation test. Run: ${runId}`
};

async function postWebhook() {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-token': secret!
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, ok: response.ok, body };
}

async function findEvent() {
  if (!connectionString) return { lookupSkipped: 'No database connection string in env.' };
  const sql = postgres(connectionString, { max: 1, idle_timeout: 5, connect_timeout: 10, prepare: false });
  try {
    const rows = await sql`
      select id, received_at, subject, classification, subtype, processing_state, notification_state, external_ref, amount_minor, last_error
      from email_events
      where message_id = ${messageId}
      order by id desc
      limit 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    return { lookupError: error instanceof Error ? error.message : String(error) };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const first = await postWebhook();
const firstBody = first.body && typeof first.body === 'object' ? first.body as Record<string, unknown> : {};
const looksLikeNewWebhook = 'duplicate' in firstBody || 'eventId' in firstBody;
const duplicate = looksLikeNewWebhook
  ? await postWebhook()
  : { skipped: 'First response did not look like the email-automation webhook; skipped duplicate post to avoid creating another legacy incident.' };
const dbEvent = await findEvent();

console.log(JSON.stringify({
  ok: first.ok,
  runId,
  webhookUrl,
  messageId,
  subject,
  expected: {
    classification: 'expense',
    subtype: 'promptpay_transfer_success',
    processingState: 'ready',
    notificationState: 'sent or retry_pending/not_configured depending deployed env',
    duplicateSecondPost: true,
    telegramTitle: 'Email automation: expense ready'
  },
  first,
  duplicate,
  dbEvent
}, null, 2));

if (!first.ok) process.exitCode = 1;
