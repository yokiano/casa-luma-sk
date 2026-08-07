import { describe, expect, it } from 'vitest';
import { parseKShopDailySettlement } from './kshop';

const forwardedBody = (overrides: string[] = []) => [
  '---------- Forwarded message ---------',
  'From: KSHOP <KPLUSSHOP@kasikornbank.com>',
  'Date: Fri, 07 Aug 2026 09:00:00 +0700',
  'Subject: K SHOP Daily Settlement Summary',
  'To: surisa0737@gmail.com',
  '',
  'K SHOP daily settlement summary was completed successfully for CASA LUMA KPG.',
  'Merchant Code: 123456789',
  'ยอดเงินจำนวน(บาท): 12,345.67',
  ...overrides
].join('\n');

const validInput = (overrides: Record<string, unknown> = {}) => ({
  receivedAt: '2026-08-07T03:30:00.000Z',
  from: 'Surisa Surisa <surisa0737@gmail.com>',
  to: 'automations@casalumakpg.com',
  subject: 'Fwd: K SHOP Daily Settlement Summary',
  messageId: '<kshop-parser@example.test>',
  attachmentCount: 0,
  textBody: forwardedBody(),
  mime: { parserVersion: 'test', completeness: 'complete' as const, attachmentCount: 0 },
  ...overrides
});

describe('K SHOP daily settlement parser', () => {
  it('extracts the exact forwarded sender, merchant, Thai amount, date, and reference', () => {
    const result = parseKShopDailySettlement(validInput());

    expect(result).toMatchObject({
      ready: true,
      embeddedOriginalSender: 'kplusshop@kasikornbank.com',
      successWordingMatched: true,
      companyMarkerMatched: true,
      merchantCode: '123456789',
      amountMinor: 1_234_567,
      settlementDate: '2026-08-07',
      settlementDateSource: 'forwarded_header',
      externalRef: 'kshop:123456789:2026-08-07',
      mimeComplete: true,
      issues: []
    });
  });

  it('parses the Thai flattened forwarded header used by stored K SHOP events', () => {
    const result = parseKShopDailySettlement(validInput({
      subject: 'Fwd: เรียน ร้านค้า K SHOP CASA LUMA KPG',
      textBody: [
        'จาก: KSHOP <KPLUSSHOP@kasikornbank.com>',
        'เรื่อง: เรียน ร้านค้า K SHOP CASA LUMA KPG',
        'ธนาคารกสิกรไทยได้ทำการสรุปยอดประจำวันสำหรับรายการของร้านค้า K SHOP (CASA LUMA KPG) เรียบร้อยแล้ว',
        'ยอดเงินจำนวน(บาท) : 4,595.00',
        '---------- ข้อความที่ส่งต่อ --------- จาก: KSHOP <KPLUSSHOP@kasikornbank.com> วันที่: ศุกร์ 7 ส.ค. 2569 เวลา 04:00 เรื่อง: เรียน ร้านค้า K SHOP CASA LUMA KPG ถึง: <surisa0737@gmail.com>',
        'รหัสร้านค้า : KB000002285279 ยอดเงินจำนวน(บาท) : 4,595.00 นำเข้าบัญชี : xxx (บจก. คาซ่า ลูม่า เคพีจี)'
      ].join('\n')
    }));

    expect(result).toMatchObject({
      ready: true,
      merchantCode: 'KB000002285279',
      amountMinor: 459500,
      settlementDate: '2026-08-07',
      settlementDateSource: 'forwarded_header',
      externalRef: 'kshop:KB000002285279:2026-08-07'
    });
  });

  it('uses the Bangkok receive date only when the proven forwarded sender has no date header', () => {
    const body = forwardedBody().replace('Date: Fri, 07 Aug 2026 09:00:00 +0700\n', '');
    const result = parseKShopDailySettlement(validInput({ textBody: body }));

    expect(result).toMatchObject({
      ready: true,
      settlementDate: '2026-08-07',
      settlementDateSource: 'received_date_fallback',
      externalRef: 'kshop:123456789:2026-08-07'
    });
  });

  it('does not use receive-date fallback when a forwarded date is present but invalid', () => {
    const body = forwardedBody().replace('Date: Fri, 07 Aug 2026 09:00:00 +0700', 'Date: not-a-date');
    const result = parseKShopDailySettlement(validInput({ textBody: body }));

    expect(result.ready).toBe(false);
    expect(result.settlementDate).toBeUndefined();
    expect(result.settlementDateSource).toBeUndefined();
    expect(result.issues.join(' ')).toMatch(/forwarded settlement date is invalid/i);
  });

  it('rejects wrong visible or embedded senders and incomplete MIME evidence', () => {
    const wrongSender = parseKShopDailySettlement(validInput({ from: 'Other Sender <other@example.com>' }));
    expect(wrongSender.ready).toBe(false);
    expect(wrongSender.issues.join(' ')).toMatch(/visible sender/i);

    const wrongEmbedded = parseKShopDailySettlement(validInput({
      textBody: forwardedBody().replace('KPLUSSHOP@kasikornbank.com', 'OTHER@kasikornbank.com')
    }));
    expect(wrongEmbedded.ready).toBe(false);
    expect(wrongEmbedded.issues.join(' ')).toMatch(/embedded original sender/i);

    const incompleteMime = parseKShopDailySettlement(validInput({
      mime: { parserVersion: 'test', completeness: 'incomplete' as const, attachmentCount: 0 }
    }));
    expect(incompleteMime.ready).toBe(false);
    expect(incompleteMime.mimeComplete).toBe(false);
  });

  it('rejects conflicting required values instead of choosing one', () => {
    const result = parseKShopDailySettlement(validInput({
      textBody: `${forwardedBody()}\nยอดเงินจำนวน(บาท): 99.00\nMerchant Code: 999999999`
    }));

    expect(result.ready).toBe(false);
    expect(result.amountMinor).toBeUndefined();
    expect(result.merchantCode).toBeUndefined();
    expect(result.externalRef).toBeUndefined();
    expect(result.issues.join(' ')).toMatch(/conflicting/);
  });
});
