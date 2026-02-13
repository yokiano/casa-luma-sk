import { command } from '$app/server';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { NOTION_API_KEY } from '$env/static/private';
import { CompanyLedgerDatabase } from '$lib/notion-sdk/dbs/company-ledger/db';
import { CompanyLedgerPatchDTO } from '$lib/notion-sdk/dbs/company-ledger/patch.dto';

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
  const db = new CompanyLedgerDatabase({
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

    if (existing.results.length > 0) {
      throw error(400, { message: `Duplicate: An expense with Reference Number ${tid} already exists in Notion.` });
    }
  } else {
    // 1b. Soft duplicate check for same amount, date and department if no transactionId
    const existing = await db.query({
      filter: {
        and: [
          { amountThb: { equals: data.amount } },
          { date: { equals: normalizedDate } },
          { department: { equals: data.department as any } }
        ]
      }
    });

    if (existing.results.length > 0) {
      throw error(400, { message: `Potential Duplicate: An expense with the same amount (${data.amount}) and date already exists in the same department.` });
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
    new CompanyLedgerPatchDTO({
      properties: {
        description: data.title,
        type: 'Expense',
        status: { name: 'Paid' },
        amountThb: data.amount,
        date: { start: normalizedDate },
        department: data.department as any,
        category: data.category as any,
        referenceNumber: data.transactionId?.trim() ?? undefined,
        paymentMethod: (data.paymentMethod as any) ?? 'Scan',
        bankAccount: (data.bankAccount as any) ?? undefined,
        notes: mergedNotes,
        owner: undefined,
        supplier: data.supplierId ? [{ id: data.supplierId }] : undefined,
        invoiceReceipt
      }
    })
  );

  return { id: response.id };
});
