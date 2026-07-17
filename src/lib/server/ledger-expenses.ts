import { error } from '@sveltejs/kit';
import { NOTION_API_KEY } from '$env/static/private';
import { FinancialLedgerDatabase } from '$lib/notion-sdk/dbs/financial-ledger/db';
import { FinancialLedgerPatchDTO } from '$lib/notion-sdk/dbs/financial-ledger/patch.dto';
import type { FinancialLedgerResponse } from '$lib/notion-sdk/dbs/financial-ledger/types';

export const COMPANY_LEDGER_EXPENSE_TYPES = {
  register: 'Register Expense',
  scan: 'Scan Expense'
} as const satisfies Record<string, FinancialLedgerResponse['properties']['Type']['select']['name']>;

export type CompanyLedgerExpenseType = FinancialLedgerResponse['properties']['Type']['select']['name'];

const notionPageUrl = (id: string, apiUrl?: string) => apiUrl || `https://www.notion.so/${id.replaceAll('-', '')}`;

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
};

/**
 * Converts "DD/MM/YYYY HH:mm" to ISO 8601 "YYYY-MM-DDTHH:mm:00"
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes('/')) return dateStr;

  const [datePart, timePart] = dateStr.split(/\s+/);
  const [day, month, year] = datePart.split('/');

  if (!day || !month || !year) return dateStr;

  let iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (timePart) {
    iso += `T${timePart}:00`;
  }
  return iso;
}

export async function findCompanyLedgerExpenseByReference(transactionId: string, expectedAmount?: number) {
  const ledger = new FinancialLedgerDatabase({ notionSecret: NOTION_API_KEY });
  const response = await ledger.query({ filter: { referenceNumber: { equals: transactionId.trim() } } });
  const matches = response.results.filter((page) => {
    if (expectedAmount === undefined) return true;
    const amount = page.properties['Amount (THB)']?.number;
    return amount === expectedAmount;
  });
  if (response.results.length > 1) return { state: 'ambiguous' as const };
  if (matches.length === 1) return { state: 'verified' as const, id: matches[0].id, externalUrl: notionPageUrl(matches[0].id, matches[0].url) };
  if (response.results.length === 1) return { state: 'amount_mismatch' as const };
  return { state: 'missing' as const };
}

export async function createCompanyLedgerExpense(data: CompanyLedgerExpenseInput) {
  const db = new FinancialLedgerDatabase({
    notionSecret: NOTION_API_KEY
  });

  const normalizedDate = normalizeDate(data.date);

  // 1. Check for duplicates if transactionId is provided
  if (data.transactionId?.trim()) {
    const tid = data.transactionId.trim();
    const existing = await db.query({
      filter: {
        referenceNumber: {
          equals: tid
        }
      }
    });

    if (existing.results.length === 1) {
      const existingAmount = existing.results[0].properties['Amount (THB)']?.number;
      // A reference alone is not enough to reconcile a retry. A different amount
      // must never be accepted as the same financial action.
      if (existingAmount !== data.amount) {
        throw error(400, { message: `Potential Duplicate: Reference Number ${tid} already exists with a different or unverifiable amount.` });
      }
      // A previous attempt may have created this page before its local result was persisted.
      // The verified reference and amount make this a safe reconciliation, not a retry error.
      return { id: existing.results[0].id, externalUrl: notionPageUrl(existing.results[0].id, existing.results[0].url), reconciled: true as const };
    }
    if (existing.results.length > 1) {
      throw error(400, { message: `Potential Duplicate: More than one expense has Reference Number ${tid}.` });
    }
  } else {
    // 1b. Soft duplicate check for same amount/date, scoped by department when available.
    const existing = await db.query({
      filter: {
        and: [
          { amountThb: { equals: data.amount } },
          { date: { equals: normalizedDate } },
          ...(data.department ? [{ department: { equals: data.department as any } }] : [])
        ]
      }
    });

    if (existing.results.length > 0) {
      throw error(400, { message: `Potential Duplicate: An expense with the same amount (${data.amount}) and date already exists${data.department ? ' in the same department' : ''}.` });
    }
  }

  const invoiceReceipt = data.receiptUrl
    ? [
        {
          type: 'external' as const,
          name: 'Slip',
          external: { url: data.receiptUrl }
        }
      ]
    : undefined;

  const sourceFileName = data.sourceFileName?.trim();
  const sourceFileNote = sourceFileName ? `source file: ${sourceFileName}` : undefined;
  const trimmedNotes = data.notes?.trim();
  const mergedNotes = trimmedNotes && sourceFileNote
    ? `${trimmedNotes}\n${sourceFileNote}`
    : trimmedNotes || sourceFileNote || 'synced via expense tool';

  const response = await db.createPage(
    new FinancialLedgerPatchDTO({
      properties: {
        description: data.title,
        type: data.ledgerType,
        status: { name: 'Paid' },
        amountThb: data.amount,
        date: { start: normalizedDate },
        department: data.department as any,
        category: data.category as any,
        referenceNumber: data.transactionId?.trim() ?? undefined,
        paymentMethod: (data.paymentMethod as any) ?? 'Scan',
        bankAccount: (data.bankAccount as any) ?? undefined,
        notes: mergedNotes,
        supplier: data.supplierId ? [{ id: data.supplierId }] : undefined,
        invoiceReceipt
      }
    })
  );

  return { id: response.id, externalUrl: notionPageUrl(response.id, response.url), reconciled: false as const };
}
