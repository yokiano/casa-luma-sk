import { error } from '@sveltejs/kit';
import type { FinancialLedgerResponse } from '$lib/notion-sdk/dbs/financial-ledger/types';
import {
  createFinancialLedgerRecord,
  findFinancialLedgerByReference,
  type FinancialLedgerType,
  isFinancialLedgerDuplicateConflict
} from '$lib/server/financial-ledger';
import { mutateFinancialLedger } from '$lib/server/financial-ledger-completeness';
import type { NotionFileUpload } from '$lib/server/notion/upload';

export const COMPANY_LEDGER_EXPENSE_TYPES = {
  register: 'Register Expense',
  scan: 'Scan Expense'
} as const satisfies Record<string, FinancialLedgerResponse['properties']['Type']['select']['name']>;

export type CompanyLedgerExpenseType = FinancialLedgerResponse['properties']['Type']['select']['name'];

export type CompanyLedgerExpenseInput = {
  ledgerType: CompanyLedgerExpenseType;
  title: string;
  amount: number;
  date: string;
  category?: string;
  department?: string;
  supplierId?: string;
  transactionId?: string;
  sourceFileName?: string;
  receiptUrl?: string;
  bankAccount?: string;
  paymentMethod?: string;
  notes?: string;
  eventId?: number;
  actionId?: number;
  actor?: string;
};

export async function findCompanyLedgerExpenseByReference(transactionId: string, expectedAmount?: number, ledgerType?: CompanyLedgerExpenseType) {
  return findFinancialLedgerByReference(transactionId, expectedAmount, ledgerType as FinancialLedgerType | undefined);
}

/** Appends a Telegram-uploaded receipt through the centralized completeness path. */
export async function appendCompanyLedgerReceipt(pageId: string, upload: NotionFileUpload, options: { eventId?: number; actionId?: number; actor?: string } = {}) {
  const result = await mutateFinancialLedger({
    pageId,
    eventId: options.eventId,
    actionId: options.actionId,
    actor: options.actor ?? 'manager',
    reason: 'Receipt evidence was attached to the Financial Ledger record.',
    changes: { appendInvoiceReceipt: upload }
  });
  return { alreadyAttached: result.duplicateUpload } as const;
}

export async function createCompanyLedgerExpense(data: CompanyLedgerExpenseInput) {
  try {
    return await createFinancialLedgerRecord({
      ledgerType: data.ledgerType,
      title: data.title,
      amount: data.amount,
      date: data.date,
      category: data.category,
      department: data.department,
      supplierId: data.supplierId,
      transactionId: data.transactionId,
      sourceFileName: data.sourceFileName,
      receiptUrl: data.receiptUrl,
      bankAccount: data.bankAccount,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      eventId: data.eventId,
      actionId: data.actionId,
      actor: data.actor,
      receiptNotRequired: false
    });
  } catch (cause) {
    if (isFinancialLedgerDuplicateConflict(cause)) throw error(400, { message: cause.message });
    throw cause;
  }
}
