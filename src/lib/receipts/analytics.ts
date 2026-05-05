export type ReceiptAnalyticsGranularity = 'day' | 'week' | 'month';

export interface ReceiptAnalyticsPoint {
  label: string;
  [key: string]: string | number;
}

export interface ReceiptAnalyticsTimeSeriesPoint {
  bucketStart: string;
  label: string;
  revenue: number;
  saleCount: number;
  avgTicket: number;
  unassignedCustomers: number;
}

export interface ReceiptAnalyticsSummary {
  totalRevenue: number;
  totalRefunds: number;
  saleCount: number;
  refundCount: number;
  receiptCount: number;
  totalDiscounts: number;
  totalTips: number;
  lineItemCount: number;
  totalTax: number;
  totalSurcharges: number;
  topPaymentType: string;
  peakHour: string;
  topItemName: string;
  topItemCount: number;
  loyaltyTotalWithId: number;
  loyaltyUnique: number;
  loyaltyRepeat: number;
  unassignedReceiptsCount: number;
  durationReceiptsCount: number;
  avgDurationMinutes: number | null;
  longStayReceiptsCount: number;
}

export interface ReceiptAnalytics {
  summary: ReceiptAnalyticsSummary;
  timeSeries: Record<ReceiptAnalyticsGranularity, ReceiptAnalyticsTimeSeriesPoint[]>;
  revenueByDay: { label: string; revenue: number }[];
  receiptsByHour: { label: string; count: number }[];
  topItemsByRevenue: { label: string; revenue: number }[];
  paymentTypeRevenue: { label: string; revenue: number }[];
  avgTicketByDay: { label: string; avg: number }[];
  revenueByDayOfWeek: { label: string; revenue: number }[];
}
