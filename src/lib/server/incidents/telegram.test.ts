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
