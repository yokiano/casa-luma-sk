import { describe, expect, it } from 'vitest';
import { getBodyPreview } from '../../../../scripts/cloudflare/process-email-trigger/src/index';

const envelope = (headers: string, body = 'Reference Number: PPFS260712001 Amount (THB): 10.00') => `From: bank@example.test\r\n${headers}\r\n\r\n${body}`;

describe('Worker MIME safety contract', () => {
  it('accepts only complete supported single-part text email', () => {
    expect(getBodyPreview(envelope('Content-Type: text/plain\r\nContent-Transfer-Encoding: 7bit')).completeness).toBe('complete');
  });

  it('decodes quoted-printable UTF-8 Thai text without mojibake', () => {
    const quotedPrintable = [...new TextEncoder().encode('หมายเลขอ้างอิง: BILS260715313032359 บันทึกช่วยจำ: Makto')]
      .map((byte) => `=${byte.toString(16).toUpperCase().padStart(2, '0')}`)
      .join('');
    const preview = getBodyPreview(envelope('Content-Type: text/plain\r\nContent-Transfer-Encoding: quoted-printable', quotedPrintable));

    expect(preview.completeness).toBe('complete');
    expect(preview.text).toContain('หมายเลขอ้างอิง: BILS260715313032359');
    expect(preview.text).toContain('บันทึกช่วยจำ: Makto');
  });

  it.each([
    ['malformed base64', envelope('Content-Type: text/plain\r\nContent-Transfer-Encoding: base64', '!!!not-base64!!!')],
    ['unsupported transfer encoding', envelope('Content-Type: text/plain\r\nContent-Transfer-Encoding: binary')],
    ['multipart email', envelope('Content-Type: multipart/alternative; boundary=abc')],
    ['non-text email', envelope('Content-Type: application/pdf')],
    ['missing content type', envelope('Content-Transfer-Encoding: 7bit')]
  ])('marks %s incomplete', (_label, raw) => {
    expect(getBodyPreview(raw).completeness).toBe('incomplete');
  });
});
