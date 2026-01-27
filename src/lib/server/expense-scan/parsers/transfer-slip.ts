import type { ExpenseParser, ParsedExpense } from '../types';

export class TransferSlipParser implements ExpenseParser {
  id = 'kbank-transfer';
  name = 'K-Bank Transfer Slip';

  validate(rawText: string): boolean {
    const text = rawText.toLowerCase();
    // Keywords specific to a bank transfer slip
    return (
      (text.includes('transfer completed') || text.includes('โอนเงินสำเร็จ')) &&
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
    if (match) return match[1];

    const relaxedMatch = rawText.match(/ID\s*:\s*([A-Z]{2,}[0-9]{5,})/i);
    return relaxedMatch ? relaxedMatch[1] : null;
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
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      if (upperLine.includes('FAMI HOUSE')) {
        const match = line.match(/FAMI\s*HOUSE\s*CO\.?\s*\.?\s*LTD\s*\+\+\s*(.+)/i);
        if (match) {
          const possible = match[1].trim();
          if (possible.length > 2) return possible;
        }
        
        const parts = line.split(/FAMI\s*HOUSE/i);
        if (parts.length > 1) {
          const secondPart = parts[1].replace(/.*?LTD\s*\+\+\s*/i, '').trim();
          if (secondPart.length > 2) return secondPart;
        }
      }
    }

    const businessSuffixes = ['CO.', 'LTD', 'CORP', 'INC', 'LIMITED'];
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      if (businessSuffixes.some(suffix => upperLine.includes(suffix)) && 
          !upperLine.includes('FAMI HOUSE') &&
          !upperLine.includes('KASIKORNBANK') &&
          !upperLine.includes('KRUNG THAI')) {
        return line.trim();
      }
    }
    return null;
  }

  private extractMemo(rawText: string): string | null {
    const lines = rawText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('memo')) {
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
