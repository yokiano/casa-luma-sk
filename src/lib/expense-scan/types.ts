export interface ParsedExpense {
  transactionId?: string | null;
  date?: string | null;
  amount?: number | null;
  recipientName?: string | null;
  memo?: string | null;
}

export interface ExpenseParser {
  id: string;
  name: string;
  validate(rawText: string): boolean;
  parse(rawText: string): ParsedExpense;
}
