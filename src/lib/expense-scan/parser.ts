import type { ParsedExpense, ExpenseParser } from './types';
import { TransferSlipParser } from './parsers/transfer-slip';
import { BillPaymentSlipParser } from './parsers/bill-payment-slip';
import { LegacyTransferSlipParser } from './parsers/transfer-slip-legacy';
import { LegacyBillPaymentSlipParser } from './parsers/bill-payment-slip-legacy';

class ExpenseScanParser {
  private parsers: ExpenseParser[] = [
    new TransferSlipParser(),
    new BillPaymentSlipParser(),
    new LegacyTransferSlipParser(),
    new LegacyBillPaymentSlipParser()
  ];

  parse(rawText: string): ParsedExpense {
    // Find the first parser that validates the text
    const parser = this.parsers.find(p => p.validate(rawText));
    
    if (parser) {
      console.log(`Using parser: ${parser.name}`);
      return parser.parse(rawText);
    }

    // Default empty result if no specific parser matches
    console.log('No specific parser matched the input text.');
    return {};
  }
}

export const expenseScanParser = new ExpenseScanParser();
