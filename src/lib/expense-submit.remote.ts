import { command } from '$app/server';
import * as v from 'valibot';
import { createCompanyLedgerExpense } from '$lib/server/ledger-expenses';

const SubmitSchema = v.object({
  title: v.string(),
  amount: v.number(),
  date: v.string(),
  category: v.string(),
  department: v.string(),
  supplierId: v.optional(v.string()),
  transactionId: v.optional(v.string()),
  sourceFileName: v.optional(v.string()),
  receiptUrl: v.optional(v.string()),
  bankAccount: v.optional(v.string()),
  paymentMethod: v.optional(v.string()),
  notes: v.optional(v.string())
});

export const submitExpenseSlip = command(SubmitSchema, async (data) => {
  return createCompanyLedgerExpense(data);
});
