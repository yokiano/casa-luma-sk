import { desc, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { receiptLineItems, receiptPayments, receipts } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
  try {
    const latestReceipts = await db
      .select()
      .from(receipts)
      .orderBy(desc(receipts.updatedFromEventAt))
      .limit(100);

    const receiptKeys = latestReceipts.map((receipt) => receipt.receiptKey);
    if (!receiptKeys.length) {
      return { receipts: [], dbError: null };
    }

    const [lineItems, payments] = await Promise.all([
      db.select().from(receiptLineItems).where(inArray(receiptLineItems.receiptKey, receiptKeys)),
      db.select().from(receiptPayments).where(inArray(receiptPayments.receiptKey, receiptKeys))
    ]);

    const lineItemsByReceipt = new Map<string, typeof lineItems>();
    for (const line of lineItems) {
      const list = lineItemsByReceipt.get(line.receiptKey) ?? [];
      list.push(line);
      lineItemsByReceipt.set(line.receiptKey, list);
    }

    const paymentsByReceipt = new Map<string, typeof payments>();
    for (const payment of payments) {
      const list = paymentsByReceipt.get(payment.receiptKey) ?? [];
      list.push(payment);
      paymentsByReceipt.set(payment.receiptKey, list);
    }

    return {
      receipts: latestReceipts.map((receipt) => ({
        ...receipt,
        lineItems: lineItemsByReceipt.get(receipt.receiptKey) ?? [],
        payments: paymentsByReceipt.get(receipt.receiptKey) ?? []
      })),
      dbError: null
    };
  } catch (error) {
    console.error('[receipts-local] failed to query database', error);
    return {
      receipts: [],
      dbError: 'Database is unavailable. Check DATABASE_URL and ensure Postgres is running on port 5432.'
    };
  }
};
