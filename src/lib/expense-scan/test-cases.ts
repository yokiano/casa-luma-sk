import type { ParsedExpense } from './types';

export interface OCRTestCase {
  id: string;
  name: string;
  rawText: string;
  expected: ParsedExpense;
}

export const ocrTestCases: OCRTestCase[] = [
  {
    id: 'kbank-bill-payment-comma',
    name: 'K-Bank Bill Payment with Comma',
    rawText: `
KBIZ ธน า ค า ร ก ส ิ ก ร ไท ย
565 KASIKORNBANK
‘a oe &
จ า ย บ ล ส า เร จ ' ด้ ง 0 ๓ ๑
* ว ั น / เว ล า ท ท า ร า ย ก า ร
Bill, Payment Completed Transaction Date
(เล ข ท ี ร า ย ก า ร / Transaction ID : BILS260109721922567) 09/01/2026 09:21 น .
ห ั ว ข้ อ ร า ย ก า ร : ว ั น ท ี ่ พ ั ก บ ั ญ ชี : ว ั น ท ี ่ เง ิ น เข ้ า บ ั ญ ชี : ซอ ง ท า ง ท ํ า ร า ย ก า ร :
Subject: Deducted Date: Received Date: Transaction Chanel:
จ ่ า ย บ ิ ล 09/01/2026 09:21 น . 09/01/2026 09:21 น . K BIZ
Bill Payment
ร า ย ก า ร จ ํ า น ว น เง ิ น (บ า ท )
Item Amount (Baht)
จ า ก / From ไป ย ั ง / To 490.00
ว ๐ ๐ ๓ %=%6683-% เน ส เซ ็ น ไอ ท ี ซิ ส เต ็ ม -00053
wan. ฟา ม ิ เฮ ้ า ++ เน ส เซ ็ น ไอ ท ี ซิ ส เต ็ ม -00053
FAMI HOUSE CO.LTD++ Biller ID: 010753600031501
ธน า ค า ร ก ส ิ ก ร ไท ย ร ห ั ส ร า น ค า / Transaction 1D
Kasikornbank 401017902310001
ร ห ั ส ธุ ร ก ร ร ม / Reference No.2
EDC17679252599358579
ค ่ า ธร ร ม เน ี ย ม / Fee 0.00 บ า ท / Baht
ย อ ด ร ว ม ท ั ้ ง ห ม ด / Total 490.00 บ า ท / Baht
Issued by K BIZ
`,
    expected: {
      transactionId: 'BILS260109721922567',
      date: '09/01/2026 09:21',
      amount: 490.00,
      recipientName: 'เน ส เซ ็ น ไอ ท ี ซิ ส เต ็ ม -00053'
    }
  },
  {
    id: 'kbank-bill-payment-comma-2',
    name: 'K-Bank Bill Payment with Comma 2',
    rawText: `
KBIZ ธน า ค า ร ก ส ิ ก ร ไท ย
565 KASIKORNBANK
‘a oe &
จ า ย บ ล ส า เร จ = ด้ ง 0 ๓ ๑
* ว ั น / เว ล า ท ท า ร า ย ก า ร
Bill, Payment Completed Transaction Date
(เล ข ท ี ร า ย ก า ร / Transaction ID : BILS260108716711789) 08/01/2026 15:06 น .
ห ั ว ข้ อ ร า ย ก า ร : ว ั น ท ี ่ พ ั ก บ ั ญ ชี : ว ั น ท ี ่ เง ิ น เข ้ า บ ั ญ ชี : ซอ ง ท า ง ท ํ า ร า ย ก า ร :
Subject: Deducted Date: Received Date: Transaction Chanel:
จ ่ า ย บ ิ ล 08/01/2026 15:06 น . 08/01/2026 15:06 น . K BIZ
Bill Payment
ร า ย ก า ร จ ํ า น ว น เง ิ น (บ า ท )
Item Amount (Baht)
จ า ก / From ไป ย ั ง / To 4,976.25
XX-X-XB683-X บ ร ิ ษั ท ซี พ ี แอ ็ ก ซ์ ต ร า จ ํ า ก ั ด (ม ห า ชน )
van. ฟา ม ิ เฮ ้ า ++ บ ร ิ ษั ท ซี พ ี แอ ็ ก ช์ ต ร ้ า จ ํ า ก ั ด (ม ห า ชน )
FAMI HOUSE CO. LTD++ Biller ID: 010753600031501
ธน า ค า ร ก ส ิ ก ร ไท ย ร ห ั ส ร า น ค า / Transaction 1D
Kasikornbank KB000001834710
ร ห ั ส ธุ ร ก ร ร ม / Reference No.2
APIC1767859421001HJ7
ค ่ า ธร ร ม เน ี ย ม / Fee 0.00 บ า ท / Baht
ย อ ด ร ว ม ท ั ้ ง ห ม ด / Total 4,976.25 บ า ท / Baht
Issued by K BIZ
`,
    expected: {
      transactionId: 'BILS260108716711789',
      date: '08/01/2026 15:06',
      amount: 4976.25,
      recipientName: 'บ ร ิ ษั ท ซี พ ี แอ ็ ก ช์ ต ร ้ า จ ํ า ก ั ด (ม ห า ชน )'
    }
  },
  {
    id: 'kbank-bill-payment-standard',
    name: 'K-Bank Bill Payment Standard',
    rawText: `
KBIZ ธน า ค า ร ก ส ิ ก ร ไท ย
565 KASIKORNBANK
‘a oe &
จ า ย บ ล ส า เร จ = ด้ ง 0 ๓ ๑
* ว ั น / เว ล า ท ท า ร า ย ก า ร
Bill Payment Completed Transaction Date
(เล ข ท ี ร า ย ก า ร / Transaction ID : BILS260110731769912) 10/01/2026 12:43 น .
ห ั ว ข้ อ ร า ย ก า ร : ว ั น ท ี ่ พ ั ก บ ั ญ ชี : ว ั น ท ี ่ เง ิ น เข ้ า บ ั ญ ชี : ซอ ง ท า ง ท ํ า ร า ย ก า ร :
Subject: Deducted Date: Received Date: Transaction Chanel:
จ ่ า ย บ ิ ล 10/01/2026 12:43 น . 10/01/2026 12:43 น . K BIZ
Bill Payment
ร า ย ก า ร จ ํ า น ว น เง ิ น (บ า ท )
Item Amount (Baht)
จ า ก / From ไป ย ั ง / To 2,409.25
XX-X-XB683-X บ ร ิ ษั ท ซี พ ี แอ ็ ก ซ์ ต ร า จ ํ า ก ั ด (ม ห า ชน )
van. ฟา ม ิ เฮ ้ า ++ บ ร ิ ษั ท ซี พ ี แอ ็ ก ช์ ต ร ้ า จ ํ า ก ั ด (ม ห า ชน )
FAMI HOUSE CO. LTD++ Biller ID: 010753600031501
ธน า ค า ร ก ส ิ ก ร ไท ย ร ห ั ส ร า น ค า / Transaction 1D
Kasikornbank KB000001834710
ร ห ั ส ธุ ร ก ร ร ม / Reference No.2
APIC1768023667379W03
ค ่ า ธร ร ม เน ี ย ม / Fee 0.00 บ า ท / Baht
ย อ ด ร ว ม ท ั ้ ง ห ม ด / Total 2,409.25 บ า ท / Baht
Issued by K BIZ
`,
    expected: {
      transactionId: 'BILS260110731769912',
      date: '10/01/2026 12:43',
      amount: 2409.25,
      recipientName: 'บ ร ิ ษั ท ซี พ ี แอ ็ ก ช์ ต ร ้ า จ ํ า ก ั ด (ม ห า ชน )'
    }
  },
  {
    id: 'kbank-transfer-kbiz-new-layout',
    name: 'K-Bank Transfer KBIZ New Layout',
    rawText: `
Transfer Completed KBIZ
16 Apr 26 17:03
From
FAMI HOUSE CO.,LTD++
Kasikornbank
XXX-X-X6683-X
To
Buppha Chabunrueang
Government Savings Bank
XXX-X-X4232-XXX
Amount
2,692.00 Bant
Fee
0.00 Baht
Received Date 16 Apr 26
(Transfer money to the account immediately with effect)
Transaction No. TRTS260416535217759
Memo Fruit shop
`,
    expected: {
      transactionId: 'TRTS260416535217759',
      date: '16/04/2026 17:03',
      amount: 2692,
      recipientName: 'Buppha Chabunrueang',
      memo: 'Fruit shop'
    }
  },
  {
    id: 'kbank-bill-payment-kbiz-new-layout',
    name: 'K-Bank Bill Payment KBIZ New Layout',
    rawText: `
Bill Payment
& Completed KBIZ
17 Apr 26 14:16
From
(¥) FAMI HOUSE CO.,LTD++
Kasikornbank
XXX-X-X6683-X
To
บ ล ู เพ ย - ล า ชา ด า เพ ย
Biller ID: 010753600031501
Amount
11,783.38 Bant
Fee
0.00 Baht
Transaction ID KB000002211500
Reference No.2 APIC17764101980494T2
Transaction No. BILS260417542489468
Memo Lazada
`,
    expected: {
      transactionId: 'BILS260417542489468',
      date: '17/04/2026 14:16',
      amount: 11783.38,
      recipientName: 'บ ล ู เพ ย - ล า ชา ด า เพ ย',
      memo: 'Lazada'
    }
  },
  {
    id: 'kbank-bill-payment-kbiz-sant-ocr',
    name: 'K-Bank Bill Payment KBIZ Sant OCR',
    rawText: `Bill Payment
& Completed KBIZ
26 Apr 26 12:45
From
(¥) FAMI HOUSE CO.,LTD++
Kasikornbank
XXX-X-X6683-X
To
เด ล อ ิ ต า ล ี
Biller ID: 010753600031501
Amount
530.00 sant
Fee
0.00 Baht
Transaction ID KB000002042297
Reference No.2 KPS004KB000002042297
Transaction No. BILS260426618522123
Memo Italy
`,
    expected: {
      transactionId: 'BILS260426618522123',
      date: '26/04/2026 12:45',
      amount: 530.00,
      recipientName: 'เด ล อ ิ ต า ล ี',
      memo: 'Italy'
    }
  }
];
