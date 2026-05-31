import { describe, expect, it } from 'vitest';
import { buildIncidentAlertPayload } from './telegram';

describe('incident telegram payload formatter', () => {
  it('formats one-hour validation incidents with human label first', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'fallback message',
      merchantId: 'merchant-1',
      receiptKey: 'merchant-1:R-1',
      context: {
        receiptNumber: 'R-1',
        failedChecks: ['ONE_HOUR_NOT_CONVERTED'],
        primaryFindingCode: 'ONE_HOUR_NOT_CONVERTED',
        primaryFindingDetails: {
          durationMinutes: 105,
          thresholdMinutes: 75,
          baseDurationMinutes: 60,
          gracePeriodMinutes: 15,
          orderStartTime: '2026-01-12T10:00:00+07:00',
          checkoutAt: '2026-01-12T11:45:00+07:00',
          timeZone: 'Asia/Bangkok'
        },
        receiptUrl: 'https://admin.example.com/tools/receipts/R-1',
        reportUrl: 'https://admin.example.com/tools/incidents/17'
      }
    });

    expect(payload.parseMode).toBe('HTML');
    expect(payload.title).toBe('🚨 Receipt alert');
    expect(payload.body.startsWith('<b>Receipt Violation — One Hour Not Converted</b>')).toBe(true);
    expect(payload.body).toContain('🧾 Receipt: <code>R-1</code>');
    expect(payload.body).toContain('<b>Details</b>');
    expect(payload.body).toContain('Duration: 105 min (1h 45m) — calculation looks plausible');
    expect(payload.body).toContain('Rule: threshold 75 min (60 min + 15 min grace)');
    expect(payload.body).toContain('Times: start 2026-01-12T10:00:00+07:00; checkout 2026-01-12T11:45:00+07:00 (Asia/Bangkok)');
    expect(payload.body).toContain('<a href="https://admin.example.com/tools/receipts/R-1">Open receipt</a>');
    expect(payload.body).toContain('<a href="https://admin.example.com/tools/incidents/17">Open incident</a>');
    expect(payload.body.indexOf('Receipt Violation — One Hour Not Converted')).toBeLessThan(
      payload.body.indexOf('One Hour Not Converted', 1)
    );
    expect(payload.body).not.toContain('Merchant:');
    expect(payload.body).not.toContain('Receipt key:');
  });

  it('formats 100 percent discount validation incidents with a friendly label', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'fallback message',
      context: {
        receiptNumber: '1-4595',
        failedChecks: ['DISCOUNT_100_PRESENT'],
        primaryFindingCode: 'DISCOUNT_100_PRESENT',
        primaryFindingDetails: {
          receiptLevelDiscounts: [
            { discountName: 'Staff Comp', percentage: 100 },
            { discountName: 'Birthday Promo', percentage: 100 }
          ],
          lineLevelDiscounts: [
            { itemName: 'Party Room', discountName: 'Manager Comp', percentage: 100 },
            { itemName: 'Socks', discountName: 'Freebie', percentage: 100 },
            { itemName: 'Coffee', discountName: 'Make Good', percentage: 100 },
            { itemName: 'Snack', discountName: 'Make Good', percentage: 100 }
          ]
        }
      }
    });

    expect(payload.body.startsWith('<b>Receipt Alert — 100% Discount Used</b>')).toBe(true);
    expect(payload.body).toContain('Receipt discounts: Staff Comp (100%), Birthday Promo (100%)');
    expect(payload.body).toContain('Line discounts: Party Room: Manager Comp (100%), Socks: Freebie (100%), Coffee: Make Good (100%) +1 more');
    expect(payload.body).toContain('• 100% Discount Used');
    expect(payload.body).not.toContain('DISCOUNT_100_PRESENT');
  });

  it('formats high total discount validation incidents with a friendly label', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'fallback message',
      context: {
        receiptNumber: 'R-400',
        failedChecks: ['DISCOUNT_TOTAL_OVER_THRESHOLD'],
        primaryFindingCode: 'DISCOUNT_TOTAL_OVER_THRESHOLD',
        validationFindingsSummary: [
          {
            code: 'DISCOUNT_TOTAL_OVER_THRESHOLD',
            severity: 'warning',
            message: 'Receipt total discount is over ฿400.',
            details: {
              discountTotal: -650,
              comparableDiscountTotal: 650,
              thresholdAmount: 400,
              currency: 'THB',
              discountNames: ['Staff Comp', 'Manager Promo', 'Birthday']
            }
          }
        ]
      }
    });

    expect(payload.body.startsWith('<b>Receipt Alert — Discount Total Over ฿400</b>')).toBe(true);
    expect(payload.body).toContain('Total discount: 650 THB');
    expect(payload.body).toContain('Threshold: 400 THB');
    expect(payload.body).toContain('Discounts: Staff Comp, Manager Promo, Birthday');
    expect(payload.body).toContain('• Discount Total Over ฿400');
  });

  it('formats membership validation incidents with concise details', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'fallback message',
      context: {
        receiptNumber: 'R-MEM',
        failedChecks: ['MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP'],
        primaryFindingCode: 'MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP',
        primaryFindingDetails: {
          reason: 'no_active_membership',
          customerId: 'cust-1',
          checkedDate: '2026-01-12',
          memberEntryQuantity: 2,
          matchedFamily: { id: 'fam-1', name: 'Test Family' }
        }
      }
    });

    expect(payload.body.startsWith('<b>Receipt Violation — Membership Entry Without Valid Membership</b>')).toBe(true);
    expect(payload.body).toContain('Reason: no active membership');
    expect(payload.body).toContain('Customer: cust-1');
    expect(payload.body).toContain('Family: Test Family');
  });

  it('formats flexi validation incidents with balance details', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'fallback message',
      context: {
        receiptNumber: 'R-FLX',
        failedChecks: ['FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS'],
        primaryFindingCode: 'FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS',
        primaryFindingDetails: {
          reason: 'insufficient_remaining_entries',
          customerId: 'cust-1',
          currentReceiptEntries: 1,
          entriesPurchased: 11,
          entriesUsedIncludingCurrent: 12,
          remainingBeforeCurrentReceipt: 0,
          remainingAfterCurrentReceipt: -1
        }
      }
    });

    expect(payload.body.startsWith('<b>Receipt Violation — Flexi Entry Without Available Pass</b>')).toBe(true);
    expect(payload.body).toContain('Remaining: before 0; after -1');
    expect(payload.body).toContain('Flexi history: purchased 11; used 12');
  });

  it('formats missing customer validation incidents with item details', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'fallback message',
      context: {
        receiptNumber: 'R-NOCUST',
        failedChecks: ['RECEIPT_CLOSED_WITHOUT_CUSTOMER'],
        primaryFindingCode: 'RECEIPT_CLOSED_WITHOUT_CUSTOMER',
        primaryFindingDetails: {
          totalMoney: 600,
          itemCount: 2,
          items: [{ itemName: 'Member Valid Visit' }, { itemName: 'Coffee' }]
        }
      }
    });

    expect(payload.body.startsWith('<b>Receipt Alert — Closed Without Customer</b>')).toBe(true);
    expect(payload.body).toContain('Total: 600 THB');
    expect(payload.body).toContain('Item names: Member Valid Visit, Coffee');
  });

  it('omits non-http links for validation incidents', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'fallback message',
      context: {
        receiptNumber: 'R-1',
        failedChecks: ['DISCOUNT_100_PRESENT'],
        receiptUrl: '/tools/receipts/R-1',
        reportUrl: 'javascript:alert(1)'
      }
    });

    expect(payload.body).not.toContain('<a href=');
  });

  it('formats successful membership automation incidents as success messages', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'MEMBERSHIP_CREATED',
      severity: 'info',
      message: 'Created Notion membership from Loyverse receipt.',
      context: {
        receiptNumber: 'R-MEM-AUTO',
        familyName: 'Test Family',
        type: 'Weekly',
        numberOfKids: 3,
        startDate: '2026-01-12',
        endDate: '2026-01-18',
        membershipName: 'Test Family - Weekly - 3 kids',
        receiptUrl: 'https://admin.example.com/tools/receipts/R-MEM-AUTO',
        reportUrl: 'https://admin.example.com/tools/incidents/99'
      }
    });

    expect(payload.title).toBe('✅ Membership automation');
    expect(payload.body).toContain('<b>Membership Created Automatically</b>');
    expect(payload.body).toContain('🧾 Receipt: <code>R-MEM-AUTO</code>');
    expect(payload.body).toContain('Family: Test Family');
    expect(payload.body).toContain('Type: Weekly');
    expect(payload.body).toContain('Kids: 3');
    expect(payload.body).toContain('Dates: 2026-01-12 → 2026-01-18');
    expect(payload.body).toContain('<a href="https://admin.example.com/tools/receipts/R-MEM-AUTO">Open receipt</a>');
  });

  it('formats birthday booking incidents with dedicated layout and links', () => {
    const payload = buildIncidentAlertPayload({
      source: 'birthday-booking',
      code: 'BIRTHDAY_BOOKING_SUBMITTED',
      severity: 'critical',
      message: 'New birthday party request for Leo.',
      context: {
        bookingReference: 'BD-2605-LEO8501',
        parentName: 'Test Parent',
        phone: '+66812345678',
        email: 'test@example.com',
        childName: 'Leo',
        turningAge: 5,
        eventDate: '2026-06-15',
        startTime: '14:00',
        packageLabel: 'Mon–Sat Package',
        kidsCount: 12,
        estimatedTotal: 12000,
        mainCourse: 'Nuggets & Fries',
        upgrades: [],
        activities: ['Face Painting (+3000 THB)'],
        specialNotes: 'Nut-free please',
        summaryUrl: 'https://www.casalumakpg.com/birthdays/summary?ref=BD-2605-LEO8501',
        reportUrl: 'https://www.casalumakpg.com/tools/incidents/64'
      }
    });

    expect(payload.title).toBe('Birthday party booking');
    expect(payload.body).toContain('<b>Birthday party request — Leo (turning 5)</b>');
    expect(payload.body).toContain('Ref: <code>BD-2605-LEO8501</code>');
    expect(payload.body).toContain('Parent: Test Parent');
    expect(payload.body).toContain('Package: Mon–Sat Package');
    expect(payload.body).toContain('Quote: 12000 THB');
    expect(payload.body).toContain('Activities: Face Painting (+3000 THB)');
    expect(payload.body).toContain('<a href="https://www.casalumakpg.com/birthdays/summary?ref=BD-2605-LEO8501">Open booking summary</a>');
    expect(payload.body).toContain('<a href="https://www.casalumakpg.com/tools/incidents/64">Open incident</a>');
    expect(payload.body).not.toContain('birthday-booking incident');
    expect(payload.body).not.toContain('BIRTHDAY_BOOKING_SUBMITTED');
  });

  it('formats successful flexi pass automation incidents as success messages', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'FLEXI_PASSES_CREATED',
      severity: 'info',
      message: 'Created structured Notion flexi pass record from Loyverse receipt.',
      context: {
        receiptNumber: 'R-FLEXI-AUTO',
        familyName: 'Test Family',
        cardCount: 2,
        entriesGranted: 22,
        entriesLeft: 22,
        validFrom: '2026-01-12',
        validUntil: '2026-03-12',
        recordName: 'Test Family - Flexi - 2 cards',
        receiptUrl: 'https://admin.example.com/tools/receipts/R-FLEXI-AUTO',
        reportUrl: 'https://admin.example.com/tools/incidents/100'
      }
    });

    expect(payload.title).toBe('✅ Flexi pass automation');
    expect(payload.body).toContain('<b>Flexi Pass Created Automatically</b>');
    expect(payload.body).toContain('🧾 Receipt: <code>R-FLEXI-AUTO</code>');
    expect(payload.body).toContain('Family: Test Family');
    expect(payload.body).toContain('Cards: 2');
    expect(payload.body).toContain('Entries granted: 22');
    expect(payload.body).toContain('Valid: 2026-01-12 → 2026-03-12');
    expect(payload.body).toContain('<a href="https://admin.example.com/tools/receipts/R-FLEXI-AUTO">Open receipt</a>');
  });

  it('formats membership automation review incidents', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'MEMBERSHIP_CREATION_REFUND_SKIPPED',
      severity: 'warning',
      message: 'Refund receipt skipped.',
      context: {
        receiptNumber: 'R-REFUND',
        reason: 'refund_receipt',
        itemId: 'weekly-1'
      }
    });

    expect(payload.title).toBe('⚠️ Membership automation');
    expect(payload.body).toContain('<b>Membership Automation Needs Review</b>');
    expect(payload.body).toContain('Reason: refund receipt');
    expect(payload.body).toContain('Item ID: weekly-1');
  });

  it('falls back to incident message when code summary is unknown', () => {
    const payload = buildIncidentAlertPayload({
      source: 'other-system',
      code: 'UNKNOWN_CODE',
      severity: 'critical',
      message: 'Custom fallback summary'
    });

    expect(payload.body).toContain('Custom fallback summary');
  });

  it('uses dedicated summary for invalid JSON incidents', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_INVALID_JSON',
      severity: 'warning',
      message: 'fallback message'
    });

    expect(payload.body).toContain('Webhook body is not valid JSON and could not be parsed.');
  });
});
