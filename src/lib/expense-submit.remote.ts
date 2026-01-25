import { command } from '$app/server';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { ExpensesTrackerDatabase } from '$lib/notion-sdk/dbs/expenses-tracker/db';
import { ExpensesTrackerPatchDTO } from '$lib/notion-sdk/dbs/expenses-tracker/patch.dto';

const SubmitSchema = v.object({
  title: v.string(),
  amount: v.number(),
  date: v.string(),
  category: v.string(),
  department: v.string(),
  supplierId: v.optional(v.string()),
  transactionId: v.optional(v.string()),
  receiptUrl: v.optional(v.string())
});

export const submitExpenseSlip = command(SubmitSchema, async (data) => {
  const db = new ExpensesTrackerDatabase({
    notionSecret: NOTION_API_KEY
  });

  // 1. Check for duplicates if transactionId is provided
  if (data.transactionId) {
    const existing = await db.query({
      filter: {
        referenceNumber: {
          equals: data.transactionId
        }
      }
    });

    if (existing.results.length > 0) {
      throw new Error(`Duplicate: An expense with Reference Number ${data.transactionId} already exists in Notion.`);
    }
  }

  const invoiceReceipt = data.receiptUrl
    ? [
        {
          type: 'external',
          external: { url: data.receiptUrl }
        }
      ]
    : undefined;

  const response = await db.createPage(
    new ExpensesTrackerPatchDTO({
      properties: {
        expense: data.title,
        status: { name: 'Paid' },
        amountThb: data.amount,
        date: { start: data.date },
        paidBy: 'Company',
        department: data.department,
        category: data.category,
        referenceNumber: data.transactionId ?? undefined,
        paymentMethod: 'Scan',
        supplier: data.supplierId ? [{ id: data.supplierId }] : undefined,
        invoiceReceipt
      }
    })
  );

  return { id: response.id };
});
