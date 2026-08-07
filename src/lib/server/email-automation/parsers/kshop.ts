import type { EmailAutomationInput } from '../classifier';
import { mimeReviewReason, requiresMimeReview } from '../mime-contract';

export const KSHOP_DAILY_SETTLEMENT_SUBTYPE = 'kshop_daily_settlement' as const;
export const KSHOP_VISIBLE_SENDER = 'surisa0737@gmail.com';
export const KSHOP_EMBEDDED_SENDER = 'kplusshop@kasikornbank.com';

export type KShopSettlementDateSource = 'forwarded_header' | 'received_date_fallback';

export type KShopSettlementParse = {
  ready: boolean;
  visibleSender: string;
  embeddedOriginalSender?: string;
  successWordingMatched: boolean;
  companyMarkerMatched: boolean;
  merchantCode?: string;
  amountMinor?: number;
  settlementDate?: string;
  settlementDateSource?: KShopSettlementDateSource;
  externalRef?: string;
  mimeComplete: boolean;
  issues: string[];
};

type ForwardedHeaderBlock = {
  from?: string;
  dateValues: string[];
};

const normalizeLineEndings = (value: string) => value.replace(/\r\n?/g, '\n').replace(/\uFEFF/g, '').trim();

const unique = <T>(values: T[]) => [...new Set(values)];

const senderEmail = (value: string | undefined) => {
  if (!value) return '';
  const angle = value.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? value).trim().toLowerCase();
  return candidate.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() ?? candidate;
};

const sourceBodies = (input: EmailAutomationInput) => unique([
  input.extractedBody,
  input.textBody,
  input.htmlBody
].filter((value): value is string => Boolean(value?.trim())).map(normalizeLineEndings));

/**
 * K SHOP is forwarded by a human. The worker's latest-body projection can
 * remove the forwarded block, so this family matcher also inspects the raw
 * text/html fallbacks without changing generic email extraction.
 */
export const kShopRuleBodyText = (input: EmailAutomationInput) => sourceBodies(input).join('\n');

const headerName = /^(From|Date|Sent|Subject|To|Cc|Reply-To|จาก|วันที่|เรื่อง|ถึง):\s*(.*)$/iu;

const forwardedHeaderBlocks = (body: string): ForwardedHeaderBlock[] => {
  // PostalMime/Gmail can flatten Thai forwarded headers onto one line. Split
  // before known header labels so both line-oriented and flattened forwards
  // use the same strict extraction path.
  const headerSeparated = normalizeLineEndings(body).replace(/\s+(?=(?:From|Date|Sent|Subject|To|Cc|Reply-To|จาก|วันที่|เรื่อง|ถึง)\s*[:：])/giu, '\n');
  const lines = headerSeparated.split('\n');
  const blocks: ForwardedHeaderBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const fromMatch = lines[index].match(/^\s*(?:From|จาก)\s*[:：]\s*(.+?)\s*$/iu);
    if (!fromMatch) continue;

    const fields = new Map<string, string>();
    fields.set('from', fromMatch[1]);
    let hasHeaderEvidence = false;
    let dateValues: string[] = [];
    for (let cursor = index + 1; cursor < Math.min(lines.length, index + 14); cursor += 1) {
      const line = lines[cursor].trim();
      if (!line) break;
      const match = line.match(headerName);
      if (!match) break;
      const rawKey = match[1].toLowerCase();
      const key = rawKey === 'จาก' ? 'from' : rawKey === 'วันที่' ? 'date' : rawKey === 'เรื่อง' ? 'subject' : rawKey === 'ถึง' ? 'to' : rawKey;
      fields.set(key, match[2].trim());
      if (key === 'date' || key === 'sent' || key === 'subject' || key === 'to') hasHeaderEvidence = true;
      if (key === 'date' || key === 'sent') dateValues.push(match[2].trim());
    }

    // A lone "From:" sentence in the message body is not proof of a
    // forwarded header. Gmail's forwarded block has adjacent header fields.
    if (hasHeaderEvidence) blocks.push({ from: fields.get('from'), dateValues });
  }

  return blocks;
};

const parseMoneyMinor = (raw: string) => {
  const normalized = raw.replace(/,/g, '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER / 100) return undefined;
  return Math.round(amount * 100);
};

const parseUniqueAmount = (body: string) => {
  const matches = [...body.matchAll(/ยอดเงิน\s*จำนวน\s*\(\s*บาท\s*\)\s*[:：-]?\s*(\d[\d,]*(?:\.\d{1,2})?)(?![\d.])/giu)]
    .map((match) => parseMoneyMinor(match[1]))
    .filter((value): value is number => value !== undefined);
  const values = unique(matches);
  return {
    value: values.length === 1 ? values[0] : undefined,
    missing: matches.length === 0,
    conflict: values.length > 1
  };
};

const parseUniqueMerchantCode = (body: string) => {
  const matches = [...body.matchAll(/(?:merchant\s*(?:code|id)(?:\s*\([^)]*\))?|รหัส(?:ร้านค้า|ผู้ค้า|ผู้ประกอบการ))\s*[:：-]\s*([a-z0-9][a-z0-9_-]{2,31})/giu)]
    .map((match) => match[1].toUpperCase());
  const values = unique(matches);
  return {
    value: values.length === 1 ? values[0] : undefined,
    missing: matches.length === 0,
    conflict: values.length > 1
  };
};

const formatBangkokDate = (date: Date) => {
  if (!Number.isFinite(date.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  if (!values.year || !values.month || !values.day) return undefined;
  return `${values.year}-${values.month}-${values.day}`;
};

const dateFromBangkokParts = (year: number, month: number, day: number) => {
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return formatBangkokDate(date);
};

const THAI_MONTHS: Record<string, number> = {
  'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
  'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12
};

const parseDateValue = (value: string) => {
  const trimmed = value.trim();
  const thaiNamedDate = trimmed.match(/(?:วัน\S+\s+)?(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{4})/u);
  if (thaiNamedDate) {
    const month = THAI_MONTHS[thaiNamedDate[2]];
    const year = Number(thaiNamedDate[3]) - 543;
    return month ? dateFromBangkokParts(year, month, Number(thaiNamedDate[1])) : undefined;
  }

  const dateOnly = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (dateOnly) return dateFromBangkokParts(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]));

  const thaiDate = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (thaiDate) {
    const year = Number(thaiDate[3]) >= 2400 ? Number(thaiDate[3]) - 543 : Number(thaiDate[3]);
    return dateFromBangkokParts(year, Number(thaiDate[2]), Number(thaiDate[1]));
  }

  return formatBangkokDate(new Date(trimmed));
};

const forwardedSettlementDates = (blocks: ForwardedHeaderBlock[]) => {
  const matchingBlocks = blocks.filter((block) => senderEmail(block.from) === KSHOP_EMBEDDED_SENDER);
  const senderValues = unique(blocks.map((block) => senderEmail(block.from)).filter(Boolean));
  const dateValues = matchingBlocks.flatMap((block) => block.dateValues);
  const parsedDates = dateValues.map(parseDateValue);
  const parsedUniqueDates = unique(parsedDates.filter((value): value is string => Boolean(value)));
  const hasInvalidDate = parsedDates.some((value) => !value);

  return {
    matchingBlocks,
    senderValues,
    dateValues,
    parsedDates,
    parsedUniqueDates,
    hasInvalidDate
  };
};

const hasCasaLumaMarker = (text: string) => /\bCASA\s+LUMA(?:\s+KPG)?\b|คาซ่า\s*ลูม่า(?:\s*เคพีจี)?/iu.test(text);

/**
 * This is deliberately a conjunction rather than a single "K SHOP" token.
 * It prevents failed-deposit notices from entering the income family while
 * still accepting the proven English and Thai daily-summary wording.
 */
const hasKShopSuccessWording = (text: string) => {
  const kShop = /K(?:\s*PLUS)?\s*SHOP|เค\s*ช็อป/iu.test(text);
  const dailySummary = /daily|ประจำวัน/iu.test(text)
    && /settlement|summary|สรุปยอด|ยอดขาย/iu.test(text);
  const success = /completed?|successfully|successful|เรียบร้อย|สำเร็จ/iu.test(text);
  const failure = /could\s+not\s+be\s+deposited|deposit(?:ed)?\s+failed|failed|failure|unsuccessful|ไม่สามารถ|ไม่สำเร็จ/iu.test(text);
  return kShop && dailySummary && success && !failure;
};

export const parseKShopDailySettlement = (input: EmailAutomationInput): KShopSettlementParse => {
  const body = kShopRuleBodyText(input);
  const fullText = `${input.subject}\n${body}`;
  const visibleSender = senderEmail(input.from);
  const blocks = forwardedHeaderBlocks(body);
  const dateInfo = forwardedSettlementDates(blocks);
  const amount = parseUniqueAmount(body);
  const merchant = parseUniqueMerchantCode(body);
  const successWordingMatched = hasKShopSuccessWording(fullText);
  const companyMarkerMatched = hasCasaLumaMarker(fullText);
  const issues: string[] = [];

  if (visibleSender !== KSHOP_VISIBLE_SENDER) issues.push(`visible sender must be ${KSHOP_VISIBLE_SENDER}.`);
  if (dateInfo.matchingBlocks.length === 0) {
    issues.push(`embedded original sender must be ${KSHOP_EMBEDDED_SENDER}.`);
  } else if (dateInfo.senderValues.length > 1) {
    issues.push('forwarded headers contain conflicting original senders.');
  }
  if (!successWordingMatched) issues.push('proven K SHOP daily-settlement success wording is missing or contradicted by failure wording.');
  if (!companyMarkerMatched) issues.push('the Casa Luma merchant/company marker is missing.');
  if (merchant.missing) issues.push('the merchant code is missing.');
  if (merchant.conflict) issues.push('the merchant code is conflicting.');
  if (amount.missing) issues.push('the Thai settlement amount label or value is missing.');
  if (amount.conflict) issues.push('the Thai settlement amount is conflicting.');

  let settlementDate: string | undefined;
  let settlementDateSource: KShopSettlementDateSource | undefined;
  if (dateInfo.dateValues.length > 0) {
    if (dateInfo.hasInvalidDate) issues.push('the forwarded settlement date is invalid.');
    if (dateInfo.parsedUniqueDates.length > 1) issues.push('the forwarded settlement date is conflicting.');
    if (!dateInfo.hasInvalidDate && dateInfo.parsedUniqueDates.length === 1) {
      settlementDate = dateInfo.parsedUniqueDates[0];
      settlementDateSource = 'forwarded_header';
    }
  } else if (dateInfo.matchingBlocks.length > 0) {
    // The plan permits receive-date fallback only after the embedded bank
    // sender has been proven. An invalid/contradictory Date header never falls
    // back silently because it may represent a different settlement day.
    settlementDate = parseDateValue(input.receivedAt);
    if (settlementDate) settlementDateSource = 'received_date_fallback';
    else issues.push('the forwarded settlement date and receive date are invalid.');
  } else {
    issues.push('the forwarded settlement date is missing.');
  }

  const externalRef = merchant.value && settlementDate
    ? `kshop:${merchant.value}:${settlementDate}`
    : undefined;
  const mimeComplete = !requiresMimeReview(input);
  if (!mimeComplete) issues.push(mimeReviewReason(input) ?? 'MIME completeness evidence is required.');

  return {
    ready: issues.length === 0,
    visibleSender,
    embeddedOriginalSender: dateInfo.matchingBlocks[0] ? senderEmail(dateInfo.matchingBlocks[0].from) : undefined,
    successWordingMatched,
    companyMarkerMatched,
    merchantCode: merchant.value,
    amountMinor: amount.value,
    settlementDate,
    settlementDateSource,
    externalRef,
    mimeComplete,
    issues: unique(issues)
  };
};
