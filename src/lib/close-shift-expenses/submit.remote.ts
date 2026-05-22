import { command } from '$app/server';
import * as v from 'valibot';
import { createCompanyLedgerExpense } from '$lib/server/ledger-expenses';

const moneyField = v.pipe(
  v.number('Amount must be a number.'),
  v.finite('Amount must be a valid number.'),
  v.minValue(0.01, 'Amount must be greater than zero.')
);

const SubmitCloseShiftExpenseSchema = v.object({
  id: v.string(),
  title: v.string(),
  amount: moneyField,
  category: v.string(),
  department: v.string(),
  supplierId: v.optional(v.string()),
  notes: v.optional(v.string()),
  shiftDate: v.string(),
  closerName: v.optional(v.string()),
  closeShiftReportId: v.optional(v.string())
});

export const submitCloseShiftExpense = command(SubmitCloseShiftExpenseSchema, async (data) => {
  const notes = [
    'source: close-shift',
    data.closeShiftReportId ? `close shift report: ${data.closeShiftReportId}` : undefined,
    data.closerName ? `closed by: ${data.closerName}` : undefined,
    data.notes?.trim() ? `staff note: ${data.notes.trim()}` : undefined
  ]
    .filter(Boolean)
    .join('\n');

  return createCompanyLedgerExpense({
    title: data.title.trim(),
    amount: data.amount,
    date: data.shiftDate,
    category: data.category,
    department: data.department,
    supplierId: data.supplierId || undefined,
    transactionId: data.closeShiftReportId ? `close-shift:${data.closeShiftReportId}:${data.id}` : undefined,
    bankAccount: 'Cash Register',
    paymentMethod: 'Cash',
    notes
  });
});
