import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseInboundEmail } from '../cloudflare/process-email-trigger/src/parser';
import { classifyEmail, type EmailAutomationInput } from '../../src/lib/server/email-automation/classifier';
import { renderTestEmailAutomationNotification } from '../../src/lib/server/email-automation/notifications/render';
import { SEED_CLASSIFICATION_RULES } from '../../src/lib/server/email-automation/seed-rules';

const args = process.argv.slice(2);
const shouldSend = args.includes('--send');
const ledgerEnabled = args.includes('--ledger-enabled');
const paths = args.filter((arg) => !arg.startsWith('--'));

if (paths.length === 0) {
  console.error('Usage: pnpm exec tsx scripts/email-automations/test-email-automation-eml-telegram.ts <file.eml> [...] [--send] [--ledger-enabled]');
  process.exit(1);
}

const parseEml = async (path: string): Promise<EmailAutomationInput> => {
  const parsed = await parseInboundEmail(await readFile(path));
  const parsedDate = parsed.date ? Date.parse(parsed.date) : Number.NaN;
  const attachmentCount = parsed.bodyExtractionMetadata.attachmentCount;

  return {
    receivedAt: Number.isNaN(parsedDate) ? new Date().toISOString() : new Date(parsedDate).toISOString(),
    from: parsed.from ?? 'unknown sender',
    to: parsed.to ?? 'automations@casalumakpg.com',
    subject: parsed.subject ?? '(no subject)',
    messageId: parsed.messageId,
    attachmentCount,
    extractedBody: parsed.extractedBody,
    extractedBodySource: parsed.extractedBodySource,
    extractedBodyTruncated: parsed.extractedBodyTruncated,
    bodyExtractionMetadata: parsed.bodyExtractionMetadata,
    // Keep the local runner's input shape compatible with older classifier code.
    textBody: parsed.extractedBody,
    mime: {
      parserVersion: parsed.bodyExtractionMetadata.parserVersion,
      mimeType: parsed.mimeType,
      completeness: parsed.bodyExtractionMetadata.bodyCompleteness,
      textTruncated: parsed.extractedBodyTruncated,
      decodeWarnings: parsed.bodyExtractionMetadata.decodeWarnings,
      attachmentCount
    }
  };
};

const publishToTestGroup = async (body: string): Promise<void> => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const testChatId = process.env.EMAIL_AUTOMATION_TELEGRAM_TEST_CHAT_ID;

  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is missing.');
  if (!testChatId) throw new Error('EMAIL_AUTOMATION_TELEGRAM_TEST_CHAT_ID is missing.');
  if (testChatId === process.env.EMAIL_AUTOMATION_TELEGRAM_CHAT_ID) {
    throw new Error('The test chat ID must differ from the production email-automation chat ID.');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: testChatId,
      text: body,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { description?: string } | null;
    throw new Error(payload?.description || `Telegram returned HTTP ${response.status}.`);
  }
};

for (const path of paths) {
  const input = await parseEml(path);
  const classification = classifyEmail(input, SEED_CLASSIFICATION_RULES);
  const message = renderTestEmailAutomationNotification(input, classification, ledgerEnabled);

  if (shouldSend) await publishToTestGroup(message);

  console.log(JSON.stringify({
    file: basename(path),
    classification: classification.classification,
    subtype: classification.subtype,
    processingState: classification.processingState,
    bodySource: input.extractedBodySource,
    bodyCompleteness: input.bodyExtractionMetadata?.bodyCompleteness,
    threadStrippingApplied: input.bodyExtractionMetadata?.threadStrippingApplied,
    threadStrippingMarker: input.bodyExtractionMetadata?.threadStrippingMarker,
    extractedBodyChars: input.extractedBody?.length ?? 0,
    attachmentCount: input.attachmentCount,
    templateMode: ledgerEnabled ? 'ledger-enabled simulation' : 'ledger-disabled simulation',
    sent: shouldSend
  }));
}
