import type { ExpenseParser, ParsedExpense } from '../types';
import { extractAmount, extractDate, extractMemo, extractRecipientAfterTo, hasAprStyleDate } from './kbank-parser-utils';

export class BillPaymentSlipParser implements ExpenseParser {
  id = 'kbank-bill-payment-v2';
  name = 'K-Bank Bill Payment Slip';

  validate(rawText: string): boolean {
    const text = rawText.toLowerCase();
    const hasBillPaymentKeyword = /bill,?\s*payment(?:\s|&)*completed/i.test(text);
    const hasTransactionNo = /transaction\s*no\.?\s*[A-Z0-9]+/i.test(rawText);
    const hasBillReference = /\bBILS\d+/i.test(rawText);
    const hasNewDateFormat = hasAprStyleDate(rawText);

    return hasBillPaymentKeyword && hasNewDateFormat && (hasTransactionNo || hasBillReference);
  }

  parse(rawText: string): ParsedExpense {
    return {
      transactionId: this.extractTransactionId(rawText),
      date: extractDate(rawText),
      amount: extractAmount(rawText),
      recipientName: this.extractRecipient(rawText),
      memo: extractMemo(rawText)
    };
  }

  private extractTransactionId(rawText: string): string | null {
    const transactionNoMatch = rawText.match(/Transaction\s*No\.?\s*([A-Z]{2,}\d{5,})/i);
    if (transactionNoMatch) return transactionNoMatch[1];

    const bilsMatch = rawText.match(/\b(BILS\d{5,})\b/i);
    return bilsMatch ? bilsMatch[1] : null;
  }

  private extractRecipient(rawText: string): string | null {
    return extractRecipientAfterTo(rawText, [
      /^biller\s+id/i,
      /^amount$/i,
      /^fee$/i,
      /^transaction\s+id/i,
      /^reference\s+no/i,
      /^transaction\s+no\.?/i,
      /^memo\b/i
    ]);
  }
}
