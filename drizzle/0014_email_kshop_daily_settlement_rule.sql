-- Add the focused K SHOP income family rule without changing deployed migration 0005.
-- The rule identifies the broad message family; the classifier parser enforces
-- exact visible/embedded senders, Casa Luma identity, amount, date, and MIME
-- completeness before a future income handler may write anything.
INSERT INTO "email_classification_rules"
  ("enabled", "priority", "name", "classification", "subtype", "sender_pattern", "subject_pattern", "body_patterns", "handler_key", "ledger_defaults", "notify_policy", "dummy_input")
SELECT
  true,
  45,
  'K SHOP daily settlement income',
  'income',
  'kshop_daily_settlement',
  NULL,
  NULL,
  '{"mode":"all","patterns":["regex:K(?:\\s*PLUS)?\\s*SHOP|เค\\s*ช็อป","regex:daily|ประจำวัน","regex:settlement|summary|สรุปยอด|ยอดขาย","regex:completed?|successfully|successful|เรียบร้อย|สำเร็จ"]}'::jsonb,
  'financial_ledger_income',
  '{"type":"Scan Income","category":"Revenue","department":"General","bankAccount":"KBank","paymentMethod":"Scan","receiptNotRequired":true}'::jsonb,
  'review_and_success',
  '{"receivedAt":"2026-08-07T03:30:00.000Z","from":"Surisa Surisa <surisa0737@gmail.com>","to":"automations@casalumakpg.com","subject":"Fwd: K SHOP Daily Settlement Summary","messageId":"<seed-kshop-daily-settlement@example.test>","attachmentCount":0,"textBody":"---------- Forwarded message ---------\\nFrom: KSHOP <KPLUSSHOP@kasikornbank.com>\\nDate: Fri, 07 Aug 2026 09:00:00 +0700\\nSubject: K SHOP Daily Settlement Summary\\nTo: surisa0737@gmail.com\\n\\nK SHOP daily settlement summary was completed successfully for CASA LUMA KPG.\\nMerchant Code: 123456789\\nยอดเงินจำนวน(บาท): 12,345.67","mime":{"parserVersion":"seed","completeness":"complete","attachmentCount":0}}'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM "email_classification_rules"
  WHERE "subtype" = 'kshop_daily_settlement'
);
