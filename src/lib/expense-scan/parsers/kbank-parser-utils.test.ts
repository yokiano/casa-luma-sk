import { describe, expect, it } from 'vitest';
import { extractMemo, extractTransactionReference } from './kbank-parser-utils';

describe('KBank memo and reference extraction', () => {
  it('extracts English Memo and Your Note values', () => {
    expect(extractMemo('Memo: Makto\nIssued by: K BIZ')).toBe('Makto');
    expect(extractMemo('Your Note: Makto\nUser: SURISA')).toBe('Makto');
  });

  it('extracts Thai memo labels, including OCR-spaced text', () => {
    expect(extractMemo('บันทึกช่วยจำ: Makto\nผู้ทำรายการ: SURISA')).toBe('Makto');
    expect(extractMemo('บ ั น ท ึ ก ช ่ ว ย จ ํ า : Makto\nผู้ทำรายการ: SURISA')).toBe('Makto');
  });

  it('extracts Thai and English reference labels', () => {
    expect(extractTransactionReference('หมายเลขอ้างอิง: BILS260715313032359')).toBe('BILS260715313032359');
    expect(extractTransactionReference('Reference Number: BILS260715313032359')).toBe('BILS260715313032359');
  });
});
