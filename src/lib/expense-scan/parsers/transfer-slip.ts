import type { ExpenseParser, ParsedExpense } from '../types';
import { extractAmount, extractDate, extractMemo, extractRecipientAfterTo, hasAprStyleDate } from './kbank-parser-utils';

export class TransferSlipParser implements ExpenseParser {
  id = 'kbank-transfer-v2';
  name = 'K-Bank Transfer Slip';

  validate(rawText: string): boolean {
    const text = rawText.toLowerCase();
    const hasTransferKeyword = /transfer,?\s*completed/i.test(text);
    const hasTransactionNo = /transaction\s*no\.?\s*[A-Z0-9]+/i.test(rawText);
    const hasTransferReference = /\bTRTS\d+/i.test(rawText);
    const hasNewDateFormat = hasAprStyleDate(rawText);

    return hasTransferKeyword && hasNewDateFormat && (hasTransactionNo || hasTransferReference);
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

    const trtsMatch = rawText.match(/\b(TRTS\d{5,})\b/i);
    return trtsMatch ? trtsMatch[1] : null;
  }

  private extractRecipient(rawText: string): string | null {
    return extractRecipientAfterTo(rawText, [
      /^amount$/i,
      /^fee$/i,
      /^received\s+date/i,
      /^transaction\s+no\.?/i,
      /^memo\b/i
    ]);
  }
}
