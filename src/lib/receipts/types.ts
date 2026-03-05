export interface LoyverseReceiptDiscount {
  id?: string;
  type?: string;
  name?: string;
  percentage?: number;
  money_amount?: number;
}

export interface LoyverseReceiptTax {
  id?: string;
  type?: string;
  name?: string;
  rate?: number;
  money_amount?: number;
}

export interface LoyverseReceiptLineItemModifier {
  id?: string;
  modifier_option_id?: string;
  name?: string;
  option?: string;
  price?: number;
  quantity?: number;
  money_amount?: number;
}

export interface LoyverseReceiptLineItem {
  id?: string;
  item_id?: string;
  variant_id?: string;
  item_name?: string;
  variant_name?: string | null;
  sku?: string;
  quantity?: number;
  price?: number;
  gross_total_money?: number;
  total_money?: number;
  cost?: number;
  cost_total?: number;
  line_note?: string | null;
  line_taxes?: LoyverseReceiptTax[];
  total_discount?: number;
  line_discounts?: LoyverseReceiptDiscount[];
  line_modifiers?: LoyverseReceiptLineItemModifier[];
}

export interface LoyverseReceiptPayment {
  payment_type_id?: string;
  name?: string;
  type?: string;
  money_amount?: number;
  paid_at?: string;
  payment_details?: Record<string, unknown> | null;
}

export interface LoyverseReceipt {
  receipt_number: string;
  note?: string | null;
  receipt_type?: 'SALE' | 'REFUND';
  refund_for?: string | null;
  order?: string | null;
  created_at?: string;
  receipt_date?: string;
  updated_at?: string;
  cancelled_at?: string | null;
  source?: string;
  total_money?: number;
  total_tax?: number;
  points_earned?: number;
  points_deducted?: number;
  points_balance?: number;
  customer_id?: string;
  total_discount?: number;
  employee_id?: string;
  store_id?: string;
  pos_device_id?: string;
  dining_option?: string;
  total_discounts?: LoyverseReceiptDiscount[];
  total_taxes?: LoyverseReceiptTax[];
  tip?: number;
  surcharge?: number;
  line_items?: LoyverseReceiptLineItem[];
  payments?: LoyverseReceiptPayment[];
}

export interface GetReceiptsParams {
  receipt_numbers?: string;
  since_receipt_number?: string;
  before_receipt_number?: string;
  store_id?: string;
  order?: string;
  source?: string;
  updated_at_min?: string;
  updated_at_max?: string;
  created_at_min?: string;
  created_at_max?: string;
  limit?: number;
  cursor?: string;
}
