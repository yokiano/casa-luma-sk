 Expense Scan Parser Update Spec — KBANK / KBIZ New Slip Format

 Date: 2026-04-18

 Goal

 Update the expense scan parsing logic to support the new KBANK / KBIZ slip layout while preserving the old parser behavior as legacy.

 This is specifically for the OCR-to-parser-to-Notion flow used by the expense scan tool.

 ────────────────────────────────────────────────────────────────────────────────

 What changed

 The provider changed the KBank / KBIZ slip layout.

 The previous parser logic was built for older OCR outputs like:

 - Transaction ID : BILS...
 - dates in DD/MM/YYYY HH:mm
 - memo sometimes on the next line
 - recipient often embedded in noisier OCR lines

 The new slip format now looks more like:

 ### New Bill Payment format

 - title: Bill Payment Completed
 - date: 17 Apr 26 14:16
 - recipient shown cleanly after To
 - amount shown as:
     - Amount
     - 11,783.38 Baht or OCR as Bant
 - identifiers include:
     - Transaction ID KB000002211500
     - Reference No.2 APIC17764101980494T2
     - Transaction No. BILS260417542489468
 - memo may be inline:
     - Memo Lazada

 ### New Transfer format

 - title: Transfer Completed
 - date: 16 Apr 26 17:03
 - recipient shown after To
 - amount shown in the same visual style
 - identifier is:
     - Transaction No. TRTS260416535217759
 - memo may be inline:
     - Memo Fruit shop

 ────────────────────────────────────────────────────────────────────────────────

 Important business decision

 ### Use Transaction No. as the parser transactionId

 Use:
 - BILS...
 - TRTS...

 Do not use the bank internal KB0000... value.

 Reason:
 - better consistency with old fixtures
 - appears to be the stable user-facing transaction reference
 - aligns with duplicate detection behavior

 ────────────────────────────────────────────────────────────────────────────────

 Date output format

 Parser output should stay consistent with the existing system:

 ### Expected parser output date format

 DD/MM/YYYY HH:mm

 Examples:
 - 17 Apr 26 14:16 -> 17/04/2026 14:16
 - 16 Apr 26 17:03 -> 16/04/2026 17:03

 Reason:
 - existing submit logic expects the old slash-style format
 - submitExpenseSlip() normalizes slash dates before writing to Notion

 ────────────────────────────────────────────────────────────────────────────────

 Recipient consistency requirement

 Do not aggressively normalize recipient names beyond what the old parser already did.

 Reason:
 - there is downstream automation/rule matching based on recipient text
 - changing normalization too much could break category/department/supplier auto-match behavior

 ### Practical meaning

 - Extract the recipient as OCR sees it
 - Trim obvious surrounding noise
 - But do not invent a “cleaned Thai canonical” version unless the system already did that before

 Examples:
 - bill payment recipient should likely remain:
     - บ ล ู เพ ย - ล า ชา ด า เพ ย
 - transfer recipient:
     - Buppha Chabunrueang

 ────────────────────────────────────────────────────────────────────────────────

 Actual code locations

 ### OCR + parser pipeline

 - src/lib/expense-scan/ocr.ts
 - src/lib/expense-scan/parser.ts
 - src/lib/expense-scan/parsers/*
 - src/lib/expense-scan/test-cases.ts
 - src/lib/expense-scan/regression.test.ts

 ### UI / test-case generation

 - src/lib/components/expense-scan/SlipCard.svelte
 - src/lib/components/expense-scan/AdvancedOcrTools.svelte
 - src/routes/tools/expense-scan/ExpenseScanState.svelte.ts

 ### Notion submission

 - src/lib/expense-submit.remote.ts

 ────────────────────────────────────────────────────────────────────────────────

 Docs currently outdated

 docs/casa-luma/tools/expense-scan.md is out of date.

 ### It currently says things that are no longer true:

 1. OCR is server-side in src/lib/server/ocr.service.ts
     - actual code is client-side in src/lib/expense-scan/ocr.ts
 2. parser code is in src/lib/server/expense-scan/
     - actual code is in src/lib/expense-scan/
 3. sync goes to “Expenses Tracker”
     - actual submit code writes to CompanyLedgerDatabase

 ### Doc should be updated to reflect:

 - OCR runs in browser via tesseract.js
 - parser orchestration is in src/lib/expense-scan/parser.ts
 - test cases live in src/lib/expense-scan/test-cases.ts
 - regression test is src/lib/expense-scan/regression.test.ts
 - submit command is src/lib/expense-submit.remote.ts
 - duplicate prevention uses referenceNumber
 - automation rules are matched in browser state after parsing

 ────────────────────────────────────────────────────────────────────────────────

Parser architecture

The repo already uses the intended split:

- new-format parsers for current KBIZ slips
- legacy parsers for older OCR layouts

So this is not hypothetical architecture anymore.
The actual task is to verify the new parsers against the newly captured OCR samples, preserve legacy behavior, and update the docs/tests to match reality.

### Files involved

 #### Keep old logic as legacy

 - src/lib/expense-scan/parsers/transfer-slip-legacy.ts
 - src/lib/expense-scan/parsers/bill-payment-slip-legacy.ts

These contain the old behavior that must keep passing.

 #### New parsers

 - src/lib/expense-scan/parsers/transfer-slip.ts
 - src/lib/expense-scan/parsers/bill-payment-slip.ts

These contain the new-format parsing logic that must be verified and adjusted as needed.

 ### Parser registration order

 In src/lib/expense-scan/parser.ts, parser order should be:

 1. new transfer parser
 2. new bill-payment parser
 3. legacy transfer parser
 4. legacy bill-payment parser

 Reason:
 - try new format first
 - fall back to old logic only if needed

 ────────────────────────────────────────────────────────────────────────────────

 What the new parsers should detect

 ────────────────────────────────────────────────────────────────────────────────

 New Transfer Slip Parser Spec

 ### Validate

 Should match if OCR contains:
 - Transfer Completed
 and either:
 - Transaction No.
 or
 - TRTS...

 ### Extract transactionId

 Preferred pattern:
 - Transaction No. TRTS260416535217759

 Fallback:
 - any TRTS\d+

 Output:
 - TRTS260416535217759

 ### Extract date

 Input OCR:
 - 16 Apr 26 17:03

 Convert to:
 - 16/04/2026 17:03

 ### Extract amount

 Look for any of:
 - Total 2,692.00
 - Amount (Baht) 2,692.00
 - Amount followed by next line 2,692.00 Baht
 - OCR may say Bant

 Output:
 - numeric 2692

 ### Extract recipientName

 Use the line immediately after To, ignoring:
 - bank name line
 - masked account line
 - labels like Amount, Fee, etc.

 For sample:
 - Buppha Chabunrueang

 ### Extract memo

 Support inline:
 - Memo Fruit shop

 Also keep compatibility with old next-line style.

Output:
- Fruit shop

────────────────────────────────────────────────────────────────────────────────

New Bill Payment Slip Parser Spec

### Validate

Should match if OCR contains:
- Bill Payment Completed
and either:
- Transaction No.
or
- BILS...

Should tolerate OCR variants such as:
- Bill, Payment Completed
- Bill Payment

### Extract transactionId

Preferred pattern:
- Transaction No. BILS260417542489468

Fallback:
- any BILS\d+

Do not use:
- Transaction ID KB000002211500

Output:
- BILS260417542489468

### Extract date

Input OCR:
- 17 Apr 26 14:16

Convert to:
- 17/04/2026 14:16

### Extract amount

Look for any of:
- Total 11,783.38
- Amount (Baht) 11,783.38
- Amount followed by next line 11,783.38 Baht
- OCR may say Bant

Output:
- numeric 11783.38

### Extract recipientName

Use the first meaningful line after To, while ignoring:
- bank name line
- masked account line
- Biller ID line
- labels such as Amount, Fee, Transaction ID, Reference No.2, Transaction No., Memo

For sample:
- บ ล ู เพ ย - ล า ชา ด า เพ ย

Do not replace it with a cleaner inferred Thai name.
Keep the OCR-facing value unless there is obvious structural noise around it.

### Extract memo

Support inline:
- Memo Lazada

Also keep compatibility with old next-line style.

Output:
- Lazada

────────────────────────────────────────────────────────────────────────────────

Shared utility behavior

The new-format parsers should share common extraction utilities where practical.
This reduces regex drift between transfer and bill-payment parsing.

### Shared expectations

- Date helper should support both:
    - DD/MM/YYYY HH:mm
    - 16 Apr 26 17:03 style
- Amount helper should support:
    - Total ...
    - Amount (Baht) ...
    - Amount ... Baht / Bant
- Memo helper should support:
    - inline Memo <value>
    - old next-line memo layout
- Recipient helper should:
    - start scanning after To
    - stop before obvious metadata sections
    - reject bank-name/account-mask/amount/fee/reference lines

────────────────────────────────────────────────────────────────────────────────

Test-case updates required

Add the two captured OCR samples as regression fixtures in:
- src/lib/expense-scan/test-cases.ts

### Required new fixture: bill payment sample

Source file:
- temp/scan-slips-2026-04-18/e-slip-bils260417542489468.jpg

OCR expectation:
- transactionId: BILS260417542489468
- date: 17/04/2026 14:16
- amount: 11783.38
- recipientName: บ ล ู เพ ย - ล า ชา ด า เพ ย
- memo: Lazada

### Required new fixture: transfer sample

Source file:
- temp/scan-slips-2026-04-18/e-slip-trts260416535217759.jpg

OCR expectation:
- transactionId: TRTS260416535217759
- date: 16/04/2026 17:03
- amount: 2692
- recipientName: Buppha Chabunrueang
- memo: Fruit shop

### Regression requirement

Existing legacy fixtures must continue passing unchanged.

This is critical:
- new-format support must not break old slash-date OCR cases
- parser ordering must still prefer new parsers first, then legacy fallbacks

────────────────────────────────────────────────────────────────────────────────

Docs update required

`docs/casa-luma/tools/expense-scan.md` is materially outdated and should be corrected in the same workstream or immediately after parser verification.

### Must be corrected

- OCR is not described as server-side in `src/lib/server/ocr.service.ts`
- parser code is not described as living in `src/lib/server/expense-scan/`
- sync target is not described as `Expenses Tracker`

### Should describe current reality

- OCR runs in-browser via `tesseract.js`
- parser orchestrator is `src/lib/expense-scan/parser.ts`
- current parser set includes both new-format and legacy parsers
- regression fixtures are in `src/lib/expense-scan/test-cases.ts`
- regression tests are in `src/lib/expense-scan/regression.test.ts`
- submission command is `src/lib/expense-submit.remote.ts`
- duplicate prevention checks `referenceNumber`
- automation rules match parsed recipient data in browser state

────────────────────────────────────────────────────────────────────────────────

Acceptance criteria

The work is complete only when all of the following are true:

1. New transfer sample parses successfully with:
    - `transactionId = TRTS260416535217759`
    - `date = 16/04/2026 17:03`
    - `amount = 2692`
    - `recipientName` containing `Buppha Chabunrueang`
    - `memo = Fruit shop`

2. New bill-payment sample parses successfully with:
    - `transactionId = BILS260417542489468`
    - `date = 17/04/2026 14:16`
    - `amount = 11783.38`
    - `recipientName` containing `บ ล ู เพ ย - ล า ชา ด า เพ ย`
    - `memo = Lazada`

3. Existing legacy regression fixtures still pass.

4. Parser transaction ID for new KBIZ slips uses `Transaction No.` / `BILS...` / `TRTS...`, not `KB000...`.

5. Date output stays in `DD/MM/YYYY HH:mm` format so submit logic continues to normalize it correctly before Notion write.

6. Recipient extraction stays conservative and does not over-normalize values used by downstream automation matching.

7. Expense-scan documentation no longer points at the wrong codepaths or the wrong Notion database name.

────────────────────────────────────────────────────────────────────────────────

Recommended implementation order

1. Verify the current new-format parsers against the two captured OCR samples.
2. Adjust shared extraction utilities only where needed to satisfy both new samples.
3. Re-run or review legacy regression expectations to ensure no breakage.
4. Add the two new OCR fixtures to `src/lib/expense-scan/test-cases.ts`.
5. Run regression tests.
6. Update `docs/casa-luma/tools/expense-scan.md`.

────────────────────────────────────────────────────────────────────────────────

Plain-English summary of the task

We are not building a brand-new expense scan pipeline.

We are updating the existing expense-scan parser so it correctly understands the newer KBANK / KBIZ slip layout, while keeping the old format working as legacy.

The business-critical points are:

- use `Transaction No.` (`BILS...` / `TRTS...`) as the stored transaction reference
- keep output date in slash format
- avoid over-cleaning recipient names
- preserve duplicate detection and downstream automation behavior

