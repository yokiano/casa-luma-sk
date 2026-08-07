import { sql } from 'drizzle-orm';

export type ReceiptDimensionFilters = {
  customerId?: string;
  itemIds?: string[];
  paymentTypeIds?: string[];
  customerPresence?: 'assigned' | 'unassigned';
};

const inList = (values: string[]) => sql.join(values.map((value) => sql`${value}`), sql`, `);

/** Receipt-level filters stay in one place so every analytics view uses identical semantics. */
export const receiptDimensionFilterSql = ({
  customerId,
  itemIds = [],
  paymentTypeIds = [],
  customerPresence
}: ReceiptDimensionFilters) => {
  const conditions = [];

  if (customerId) conditions.push(sql`r.customer_id = ${customerId}`);
  else if (customerPresence === 'assigned') conditions.push(sql`r.customer_id is not null`);
  else if (customerPresence === 'unassigned') conditions.push(sql`r.customer_id is null`);

  // EXISTS keeps receipt totals correct when a receipt has multiple matching lines or payments.
  if (itemIds.length) {
    conditions.push(sql`exists (
      select 1 from receipt_line_items filter_li
      where filter_li.receipt_key = r.receipt_key
        and filter_li.item_id in (${inList(itemIds)})
    )`);
  }

  if (paymentTypeIds.length) {
    conditions.push(sql`exists (
      select 1 from receipt_payments filter_payment
      where filter_payment.receipt_key = r.receipt_key
        and filter_payment.payment_type_id in (${inList(paymentTypeIds)})
    )`);
  }

  return conditions.length ? sql.join(conditions, sql` and `) : sql`true`;
};
