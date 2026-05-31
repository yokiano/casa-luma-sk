import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { COMPANY_LEDGER_EXPENSE_TYPES, createCompanyLedgerExpense } from '$lib/server/ledger-expenses';
import { COMPANY_LEDGER_PROP_VALUES } from '$lib/notion-sdk/dbs/company-ledger/constants';

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
  if (!(COMPANY_LEDGER_PROP_VALUES.category as readonly string[]).includes(data.category)) {
    throw error(400, { message: `Invalid expense category: ${data.category}` });
  }
  if (!(COMPANY_LEDGER_PROP_VALUES.department as readonly string[]).includes(data.department)) {
    throw error(400, { message: `Invalid expense department: ${data.department}` });
  }

  const notes = [
    'source: close-shift',
    data.closeShiftReportId ? `close shift report: ${data.closeShiftReportId}` : undefined,
    data.closerName ? `closed by: ${data.closerName}` : undefined,
    data.notes?.trim() ? `staff note: ${data.notes.trim()}` : undefined
  ]
    .filter(Boolean)
    .join('\n');

  return createCompanyLedgerExpense({
    ledgerType: COMPANY_LEDGER_EXPENSE_TYPES.register,
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
