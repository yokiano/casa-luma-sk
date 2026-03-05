import type { LoyverseReceipt } from '$lib/receipts/types';

export const ONE_HOUR_ITEM_ID = 'e034b61e-88e0-43bc-a72b-eec3a301a7b2';
export const ONE_HOUR_TO_DAY_ITEM_ID = 'c86ad6d4-f8ff-4a43-bd9d-e4988d98c0c5';
export const NOT_CONVERTED_DURATION_THRESHOLD_MINUTES = 75;

export interface ReceiptToolsMeta {
  orderNumber: string | null;
  orderStartTime: string | null;
  checkoutAt: string | null;
  durationMinutes: number | null;
  oneHourQuantity: number;
  oneHourToDayQuantity: number;
  hasOneHour: boolean;
  hasOneHourToDay: boolean;
  exceedsUnconvertedThreshold: boolean;
  isNotConverted: boolean;
}

export interface ReceiptWithTools extends LoyverseReceipt {
  toolsMeta: ReceiptToolsMeta;
}

const ORDER_NUMBER_REGEX = /#(\d+)/;
const ORDER_TIME_REGEX = /\b(\d{1,2}):([0-5]\d)(?:\s*([AaPp][Mm]))?\b/g;

const parseOrderNumber = (order?: string | null): string | null => {
  if (!order) return null;
  const match = order.match(ORDER_NUMBER_REGEX);
  return match?.[1] ?? null;
};

const parseOrderStartTime = (order?: string | null): string | null => {
  if (!order) return null;

  ORDER_TIME_REGEX.lastIndex = 0;
  const matches = Array.from(order.matchAll(ORDER_TIME_REGEX));
  if (matches.length === 0) return null;

  const lastMatch = matches[matches.length - 1];
  const rawHour = Number(lastMatch[1]);
  const minutes = lastMatch[2];
  const meridiem = lastMatch[3]?.toUpperCase();

  if (Number.isNaN(rawHour)) return null;

  let normalizedHour: number;

  if (meridiem) {
    if (rawHour < 1 || rawHour > 12) return null;
    if (meridiem === 'AM') {
      normalizedHour = rawHour === 12 ? 0 : rawHour;
    } else {
      normalizedHour = rawHour === 12 ? 12 : rawHour + 12;
    }
  } else {
    if (rawHour < 0 || rawHour > 23) return null;
    normalizedHour = rawHour;
  }

  return `${normalizedHour.toString().padStart(2, '0')}:${minutes}`;
};

const getItemQuantity = (receipt: LoyverseReceipt, itemId: string): number => {
  return (receipt.line_items ?? []).reduce((sum, item) => {
    if (item.item_id !== itemId) return sum;
    return sum + (item.quantity ?? 0);
  }, 0);
};

const getCheckoutAt = (receipt: LoyverseReceipt): string | null => {
  const value = receipt.created_at ?? receipt.receipt_date;
  return value ?? null;
};

const calculateDurationMinutes = (
  orderStartTime: string | null,
  checkoutAt: string | null
): number | null => {
  if (!orderStartTime || !checkoutAt) return null;

  const checkoutDate = new Date(checkoutAt);
  if (Number.isNaN(checkoutDate.getTime())) return null;

  const [startHourText, startMinuteText] = orderStartTime.split(':');
  const startHour = Number(startHourText);
  const startMinute = Number(startMinuteText);
  if (Number.isNaN(startHour) || Number.isNaN(startMinute)) return null;

  const startDate = new Date(checkoutDate);
  startDate.setHours(startHour, startMinute, 0, 0);

  let durationMs = checkoutDate.getTime() - startDate.getTime();
  if (durationMs < 0) {
    durationMs += 24 * 60 * 60 * 1000;
  }

  return Math.round(durationMs / (60 * 1000));
};

export const analyzeReceiptTools = (receipt: LoyverseReceipt): ReceiptToolsMeta => {
  const orderStartTime = parseOrderStartTime(receipt.order);
  const checkoutAt = getCheckoutAt(receipt);
  const oneHourQuantity = getItemQuantity(receipt, ONE_HOUR_ITEM_ID);
  const oneHourToDayQuantity = getItemQuantity(receipt, ONE_HOUR_TO_DAY_ITEM_ID);
  const hasOneHour = oneHourQuantity > 0;
  const hasOneHourToDay = oneHourToDayQuantity > 0;
  const durationMinutes = calculateDurationMinutes(orderStartTime, checkoutAt);
  const exceedsUnconvertedThreshold =
    durationMinutes !== null && durationMinutes > NOT_CONVERTED_DURATION_THRESHOLD_MINUTES;

  return {
    orderNumber: parseOrderNumber(receipt.order),
    orderStartTime,
    checkoutAt,
    durationMinutes,
    oneHourQuantity,
    oneHourToDayQuantity,
    hasOneHour,
    hasOneHourToDay,
    exceedsUnconvertedThreshold,
    isNotConverted: hasOneHour && !hasOneHourToDay && exceedsUnconvertedThreshold
  };
};

export const enrichReceiptWithTools = (receipt: LoyverseReceipt): ReceiptWithTools => ({
  ...receipt,
  toolsMeta: analyzeReceiptTools(receipt)
});

export const enrichReceiptsWithTools = (receipts: LoyverseReceipt[]): ReceiptWithTools[] => {
  return receipts.map(enrichReceiptWithTools);
};

export const getReceiptToolsMeta = (receipt: LoyverseReceipt): ReceiptToolsMeta => {
  const withMeta = receipt as Partial<ReceiptWithTools>;
  if (withMeta.toolsMeta) return withMeta.toolsMeta;
  return analyzeReceiptTools(receipt);
};
