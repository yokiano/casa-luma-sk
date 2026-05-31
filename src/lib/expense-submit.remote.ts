import { command } from '$app/server';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { COMPANY_LEDGER_PROP_VALUES } from '$lib/notion-sdk/dbs/company-ledger/constants';
import { COMPANY_LEDGER_EXPENSE_TYPES, createCompanyLedgerExpense, type CompanyLedgerExpenseType } from '$lib/server/ledger-expenses';

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
  notes: v.optional(v.string()),
  ledgerType: v.optional(v.string())
});

export const submitExpenseSlip = command(SubmitSchema, async (data) => {
  const ledgerType = data.ledgerType || COMPANY_LEDGER_EXPENSE_TYPES.scan;

  if (!(COMPANY_LEDGER_PROP_VALUES.type as readonly string[]).includes(ledgerType)) {
    throw error(400, { message: `Invalid expense type: ${ledgerType}` });
  }

  return createCompanyLedgerExpense({
    ...data,
    ledgerType: ledgerType as CompanyLedgerExpenseType
  });
});
