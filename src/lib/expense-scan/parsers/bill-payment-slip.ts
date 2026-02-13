import type { ExpenseParser, ParsedExpense } from '../types';

export class BillPaymentSlipParser implements ExpenseParser {
  id = 'kbank-bill-payment';
  name = 'K-Bank Bill Payment Slip';

  validate(rawText: string): boolean {
    const text = rawText.toLowerCase();
    // Keywords specific to a bill payment slip
    // Note: OCR sometimes adds spaces or misses characters in Thai words
    const hasEnglishKeyword = /bill,?\s*payment\s*completed/i.test(text);
    const hasThaiKeyword = 
      text.includes('จ่ายบิลสำเร็จ') || 
      text.includes('จ า ย บ ิ ล ส า เ ร จ') ||
      text.includes('จ า ย บ ล ส า เ ร จ') || // common OCR error
      text.includes('จ า ย บ ล ส า เร จ');   // another common variation

    return (
      (hasEnglishKeyword || hasThaiKeyword) &&
      text.includes('transaction id')
    );
  }

  parse(rawText: string): ParsedExpense {
    return {
      transactionId: this.extractTransactionId(rawText),
      date: this.extractDateTime(rawText),
      amount: this.extractAmount(rawText),
      recipientName: this.extractRecipient(rawText),
      memo: this.extractMemo(rawText)
    };
  }

  private extractTransactionId(rawText: string): string | null {
    const match = rawText.match(/Transaction\s*ID\s*:\s*([A-Z0-9]+)/i);
    return match ? match[1] : null;
  }

  private extractDateTime(rawText: string): string | null {
    const match = rawText.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
    return match ? match[1] : null;
  }

  private extractAmount(rawText: string): number | null {
    const totalMatch = rawText.match(/Total\s+([\d,]+\.\d{2})/i);
    if (totalMatch) return parseFloat(totalMatch[1].replace(/,/g, ''));

    const amountMatch = rawText.match(/Amount\s+\(Baht\)\s+([\d,]+\.\d{2})/i);
    if (amountMatch) return parseFloat(amountMatch[1].replace(/,/g, ''));

    const toMatch = rawText.match(/To\s+([\d,]+\.\d{2})/i);
    if (toMatch) return parseFloat(toMatch[1].replace(/,/g, ''));

    return null;
  }

  private extractRecipient(rawText: string): string | null {
    const lines = rawText.split('\n');
    
    // Search for lines containing Fami House and potentially the recipient name
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      if (upperLine.includes('FAMI HOUSE') || upperLine.includes('ฟา ม ิ เฮ')) {
        // Try splitting by the common "++" separator seen in OCR
        const parts = line.split(/\+\+\s*/);
        if (parts.length > 1) {
          const possible = parts[parts.length - 1].trim();
          // Filter out IDs and labels
          if (possible.length > 2 && 
              !possible.toLowerCase().includes('biller id') && 
              !possible.toLowerCase().includes('transaction id') &&
              !possible.toLowerCase().includes('ref')) {
            return possible;
          }
        }
      }
    }

    // Fallback: search for business suffixes or Thai business indicators
    const businessSuffixes = ['บ ร ิ ษั ท', 'จ ํ า ก ั ด', 'CO.', 'LTD', 'CORP', 'INC', 'LIMITED'];
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      if (businessSuffixes.some(suffix => upperLine.includes(suffix)) && 
          !upperLine.includes('FAMI HOUSE') &&
          !upperLine.includes('ฟา ม ิ เฮ') &&
          !upperLine.includes('KASIKORNBANK')) {
        return line.trim();
      }
    }

    return null;
  }

  private extractMemo(rawText: string): string | null {
    const lines = rawText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lowerLine = lines[i].toLowerCase();
      if (lowerLine.includes('memo') || lowerLine.includes('บ ั น ท ึ ก ช ว ย จ ํ า')) {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !nextLine.toLowerCase().includes('issued by')) {
            return nextLine;
          }
        }
      }
    }
    return null;
  }
}
