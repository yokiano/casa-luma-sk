import { describe, expect, it } from 'vitest';
import { parseInboundEmail } from '../../../../scripts/cloudflare/process-email-trigger/src/parser';

const multipartAlternative = `From: bank@example.test\r\nTo: automations@example.test\r\nSubject: Result of PromptPay Funds Transfer (Success)\r\nMessage-ID: <multipart@example.test>\r\nContent-Type: multipart/alternative; boundary="alt"\r\n\r\n--alt\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\nReference Number: PPFS260712001\nAmount (THB): 10.00\n\nOn Tue, 15 Jul 2026 wrote:\nOlder quoted amount: 999.00\r\n--alt\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<html><body><p>HTML alternative</p></body></html>\r\n--alt--\r\n`;

const htmlOnly = `From: bank@example.test\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<html><body><div>Reference Number: HTML123</div><div>Amount (THB): 20.00</div><div class="gmail_quote">Older quoted body</div></body></html>`;

const quotedPrintableThai = [...new TextEncoder().encode('หมายเลขอ้างอิง: BILS260715313032359 บันทึกช่วยจำ: Makto')]
  .map((byte) => `=${byte.toString(16).toUpperCase().padStart(2, '0')}`)
  .join('');

const encodedHeaders = `From: =?UTF-8?Q?K_BIZ?= <kbiz@example.test>\r\nTo: automations@example.test\r\nSubject: =?UTF-8?Q?PromptPay_=E0=B8=AA=E0=B8=B3=E0=B9=80=E0=B8=A3=E0=B9=87=E0=B8=88?=\r\nMessage-ID: <encoded@example.test>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nReference Number: ENCODED1 Amount (THB): 12.00`;

describe('Worker MIME safety contract', () => {
  it('parses multipart/alternative and strips an older reply before classification', async () => {
    const parsed = await parseInboundEmail(multipartAlternative);

    expect(parsed.bodyExtractionMetadata.bodyCompleteness).toBe('complete');
    expect(parsed.extractedBodySource).toBe('text');
    expect(parsed.extractedBody).toContain('Reference Number: PPFS260712001');
    expect(parsed.extractedBody).not.toContain('Older quoted amount');
    expect(parsed.bodyExtractionMetadata.threadStrippingApplied).toBe(true);
  });

  it('converts HTML-only email to readable visible text and removes Gmail quote containers', async () => {
    const parsed = await parseInboundEmail(htmlOnly);

    expect(parsed.extractedBodySource).toBe('html-fallback');
    expect(parsed.extractedBody).toContain('Reference Number: HTML123');
    expect(parsed.extractedBody).toContain('Amount (THB): 20.00');
    expect(parsed.extractedBody).not.toContain('Older quoted body');
  });

  it('decodes quoted-printable UTF-8 Thai text without mojibake', async () => {
    const parsed = await parseInboundEmail(`From: bank@example.test\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${quotedPrintableThai}`);

    expect(parsed.bodyExtractionMetadata.bodyCompleteness).toBe('complete');
    expect(parsed.extractedBody).toContain('หมายเลขอ้างอิง: BILS260715313032359');
    expect(parsed.extractedBody).toContain('บันทึกช่วยจำ: Makto');
  });

  it('decodes encoded-word headers and keeps message metadata available', async () => {
    const parsed = await parseInboundEmail(encodedHeaders);

    expect(parsed.from).toContain('K BIZ');
    expect(parsed.subject).toContain('PromptPay');
    expect(parsed.messageId).toBe('<encoded@example.test>');
  });

  it('records attachment metadata and makes financial automation incomplete', async () => {
    const raw = `From: bank@example.test\r\nContent-Type: multipart/mixed; boundary="mixed"\r\n\r\n--mixed\r\nContent-Type: text/plain\r\n\r\nReference Number: WITHATTACH Amount (THB): 30.00\r\n--mixed\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename="receipt.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\nJVBERiQ=\r\n--mixed--\r\n`;
    const parsed = await parseInboundEmail(raw);

    expect(parsed.bodyExtractionMetadata.attachmentCount).toBe(1);
    expect(parsed.bodyExtractionMetadata.bodyCompleteness).toBe('incomplete');
    expect(parsed.bodyExtractionMetadata.decodeWarnings.join(' ')).toMatch(/attachment/i);
  });

  it('routes malformed input to incomplete without throwing', async () => {
    const parsed = await parseInboundEmail('this is not a valid RFC822 message');

    expect(parsed.bodyExtractionMetadata.bodyCompleteness).toBe('incomplete');
    expect(parsed.extractedBody).toBe('');
  });
});
