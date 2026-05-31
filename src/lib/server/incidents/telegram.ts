import type { AlertPublishPayload } from '$lib/server/alerts/types';
import type { ReportIncidentInput } from './types';

const INCIDENT_SUMMARY_BY_CODE: Record<string, string> = {
  RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED:
    'Receipt processed, but one or more validation checks failed.',
  RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR:
    'Validation engine failed while executing one of the rules.',
  RECEIPT_WEBHOOK_PROCESSING_FAILED: 'Receipt webhook processing crashed before completion.',
  RECEIPT_WEBHOOK_INVALID_JSON: 'Webhook body is not valid JSON and could not be parsed.',
  RECEIPT_WEBHOOK_INVALID_PAYLOAD_SHAPE: 'Webhook payload shape did not match expected format.',
  RECEIPT_WEBHOOK_NO_VALID_RECEIPTS: 'Webhook batch had no valid receipts to process.'
};

const VALIDATION_LABEL_BY_CODE: Record<string, string> = {
  ONE_HOUR_NOT_CONVERTED: 'Receipt Violation — One Hour Not Converted',
  DISCOUNT_100_PRESENT: 'Receipt Alert — 100% Discount Used',
  DISCOUNT_TOTAL_OVER_THRESHOLD: 'Receipt Alert — Discount Total Over ฿400',
  MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP:
    'Receipt Violation — Membership Entry Without Valid Membership',
  FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS: 'Receipt Violation — Flexi Entry Without Available Pass',
  RECEIPT_CLOSED_WITHOUT_CUSTOMER: 'Receipt Alert — Closed Without Customer',
  FORCED_TEST_FAILURE: 'Receipt Alert — Forced Test Failure'
};

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const toPrintableValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
};

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');

const formatDuration = (minutes: number): string => {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  const hourText = hours > 0 ? `${hours}h` : '';
  const minuteText = remainder > 0 ? `${remainder}m` : hours > 0 ? '' : `${rounded}m`;
  return `${formatNumber(minutes)} min (${[hourText, minuteText].filter(Boolean).join(' ')})`;
};

const formatList = (values: string[], limit = 3): string => {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  const visible = unique.slice(0, limit);
  const remaining = unique.length - visible.length;
  return remaining > 0 ? `${visible.join(', ')} +${remaining} more` : visible.join(', ');
};

const formatHtmlLink = (label: string, url: string): string =>
  `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;

const humanizeCheckCode = (code: string): string => {
  if (VALIDATION_LABEL_BY_CODE[code]) return VALIDATION_LABEL_BY_CODE[code].replace(/^Receipt (Alert|Violation) — /, '');
  return code
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
};

const getFailedChecks = (input: ReportIncidentInput): string[] => {
  return Array.isArray(input.context?.failedChecks)
    ? input.context.failedChecks
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .slice(0, 10)
    : [];
};

const getPrimaryFindingCode = (input: ReportIncidentInput, failedChecks: string[]): string | null => {
  const contextCode = input.context?.primaryFindingCode;
  if (typeof contextCode === 'string' && contextCode.trim().length > 0) return contextCode;
  return failedChecks[0] ?? null;
};

const isReceiptValidationIncident = (input: ReportIncidentInput): boolean =>
  input.code === 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED' ||
  input.code === 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR';

const getPrimaryFindingDetails = (
  input: ReportIncidentInput,
  primaryFindingCode: string | null
): Record<string, unknown> | null => {
  if (isRecord(input.context?.primaryFindingDetails)) return input.context.primaryFindingDetails;
  if (!primaryFindingCode || !Array.isArray(input.context?.validationFindingsSummary)) return null;

  const primarySummary = input.context.validationFindingsSummary.find(
    (finding) => isRecord(finding) && finding.code === primaryFindingCode
  );

  return isRecord(primarySummary) && isRecord(primarySummary.details) ? primarySummary.details : null;
};

const formatHundredPercentDiscountDetails = (details: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  const receiptLevelDiscounts = Array.isArray(details.receiptLevelDiscounts)
    ? details.receiptLevelDiscounts
    : [];
  const lineLevelDiscounts = Array.isArray(details.lineLevelDiscounts) ? details.lineLevelDiscounts : [];

  const receiptDiscounts = receiptLevelDiscounts
    .filter(isRecord)
    .map((discount) => {
      const name = getString(discount.discountName) ?? getString(discount.name) ?? 'Receipt discount';
      const percentage = isFiniteNumber(discount.percentage) ? ` (${formatNumber(discount.percentage)}%)` : '';
      return `${name}${percentage}`;
    });
  if (receiptDiscounts.length) lines.push(`Receipt discounts: ${formatList(receiptDiscounts)}`);

  const lineDiscounts = lineLevelDiscounts
    .filter(isRecord)
    .map((discount) => {
      const itemName = getString(discount.itemName) ?? 'Line item';
      const discountName = getString(discount.discountName) ?? getString(discount.name) ?? 'discount';
      const percentage = isFiniteNumber(discount.percentage) ? ` (${formatNumber(discount.percentage)}%)` : '';
      return `${itemName}: ${discountName}${percentage}`;
    });
  if (lineDiscounts.length) lines.push(`Line discounts: ${formatList(lineDiscounts)}`);

  if (!lines.length && isFiniteNumber(details.thresholdPercentage)) {
    lines.push(`Discount at or above ${formatNumber(details.thresholdPercentage)}%.`);
  }

  return lines;
};

const formatHighDiscountDetails = (details: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  const currency = getString(details.currency) ?? 'THB';
  const discountTotal = isFiniteNumber(details.comparableDiscountTotal)
    ? details.comparableDiscountTotal
    : isFiniteNumber(details.discountTotal)
      ? Math.abs(details.discountTotal)
      : null;

  if (discountTotal !== null) lines.push(`Total discount: ${formatNumber(discountTotal)} ${currency}`);
  if (isFiniteNumber(details.thresholdAmount)) {
    lines.push(`Threshold: ${formatNumber(details.thresholdAmount)} ${currency}`);
  }
  if (Array.isArray(details.discountNames)) {
    const names = details.discountNames.filter((value): value is string => typeof value === 'string');
    if (names.length) lines.push(`Discounts: ${formatList(names)}`);
  }

  return lines;
};

const formatOneHourDetails = (details: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  const durationMinutes = isFiniteNumber(details.durationMinutes) ? details.durationMinutes : null;
  const thresholdMinutes = isFiniteNumber(details.thresholdMinutes) ? details.thresholdMinutes : null;
  const baseDurationMinutes = isFiniteNumber(details.baseDurationMinutes) ? details.baseDurationMinutes : null;
  const gracePeriodMinutes = isFiniteNumber(details.gracePeriodMinutes) ? details.gracePeriodMinutes : null;

  if (durationMinutes !== null) {
    const plausibility =
      durationMinutes > 0 && durationMinutes < 12 * 60
        ? 'calculation looks plausible'
        : 'check duration calculation';
    lines.push(`Duration: ${formatDuration(durationMinutes)} — ${plausibility}`);
  }

  if (thresholdMinutes !== null) {
    const thresholdParts = [`threshold ${formatNumber(thresholdMinutes)} min`];
    if (baseDurationMinutes !== null && gracePeriodMinutes !== null) {
      thresholdParts.push(`${formatNumber(baseDurationMinutes)} min + ${formatNumber(gracePeriodMinutes)} min grace`);
    } else if (gracePeriodMinutes !== null) {
      thresholdParts.push(`${formatNumber(gracePeriodMinutes)} min grace`);
    }
    lines.push(`Rule: ${thresholdParts.join(' (')}${thresholdParts.length > 1 ? ')' : ''}`);
  }

  const orderStartTime = getString(details.orderStartTime);
  const checkoutAt = getString(details.checkoutAt);
  const timeZone = getString(details.timeZone);
  if (orderStartTime || checkoutAt) {
    lines.push(
      `Times: start ${orderStartTime ?? 'unknown'}; checkout ${checkoutAt ?? 'unknown'}${timeZone ? ` (${timeZone})` : ''}`
    );
  }

  return lines;
};

const formatMembershipDetails = (details: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  const reason = getString(details.reason);
  const customerId = getString(details.customerId);
  const checkedDate = getString(details.checkedDate);
  const family = isRecord(details.matchedFamily) ? getString(details.matchedFamily.name) : null;

  if (reason) lines.push(`Reason: ${reason.replaceAll('_', ' ')}`);
  if (customerId) lines.push(`Customer: ${customerId}`);
  if (family) lines.push(`Family: ${family}`);
  if (checkedDate) lines.push(`Checked date: ${checkedDate}`);
  if (isFiniteNumber(details.memberEntryQuantity)) {
    lines.push(`Member entries: ${formatNumber(details.memberEntryQuantity)}`);
  }

  return lines;
};

const formatFlexiDetails = (details: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  const reason = getString(details.reason);
  const customerId = getString(details.customerId);

  if (reason) lines.push(`Reason: ${reason.replaceAll('_', ' ')}`);
  if (customerId) lines.push(`Customer: ${customerId}`);
  if (isFiniteNumber(details.currentReceiptEntries)) {
    lines.push(`Current entries: ${formatNumber(details.currentReceiptEntries)}`);
  }
  if (isFiniteNumber(details.remainingBeforeCurrentReceipt) || isFiniteNumber(details.remainingAfterCurrentReceipt)) {
    lines.push(
      `Remaining: before ${isFiniteNumber(details.remainingBeforeCurrentReceipt) ? formatNumber(details.remainingBeforeCurrentReceipt) : 'unknown'}; after ${isFiniteNumber(details.remainingAfterCurrentReceipt) ? formatNumber(details.remainingAfterCurrentReceipt) : 'unknown'}`
    );
  }
  if (isFiniteNumber(details.entriesPurchased) || isFiniteNumber(details.entriesUsedIncludingCurrent)) {
    lines.push(
      `Flexi history: purchased ${isFiniteNumber(details.entriesPurchased) ? formatNumber(details.entriesPurchased) : 'unknown'}; used ${isFiniteNumber(details.entriesUsedIncludingCurrent) ? formatNumber(details.entriesUsedIncludingCurrent) : 'unknown'}`
    );
  }

  return lines;
};

const formatMissingCustomerDetails = (details: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  if (isFiniteNumber(details.totalMoney)) lines.push(`Total: ${formatNumber(details.totalMoney)} THB`);
  if (isFiniteNumber(details.itemCount)) lines.push(`Items: ${formatNumber(details.itemCount)}`);
  if (Array.isArray(details.items)) {
    const itemNames = details.items
      .filter(isRecord)
      .map((item) => getString(item.itemName) ?? getString(item.itemId) ?? null)
      .filter((value): value is string => Boolean(value));
    if (itemNames.length) lines.push(`Item names: ${formatList(itemNames)}`);
  }
  return lines;
};

const formatValidationDetails = (code: string | null, details: Record<string, unknown> | null): string[] => {
  if (!code || !details) return [];

  switch (code) {
    case 'DISCOUNT_100_PRESENT':
      return formatHundredPercentDiscountDetails(details);
    case 'DISCOUNT_TOTAL_OVER_THRESHOLD':
      return formatHighDiscountDetails(details);
    case 'ONE_HOUR_NOT_CONVERTED':
      return formatOneHourDetails(details);
    case 'MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP':
      return formatMembershipDetails(details);
    case 'FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS':
      return formatFlexiDetails(details);
    case 'RECEIPT_CLOSED_WITHOUT_CUSTOMER':
      return formatMissingCustomerDetails(details);
    default:
      return [];
  }
};

const buildReceiptValidationAlertPayload = (input: ReportIncidentInput): AlertPublishPayload => {
  const failedChecks = getFailedChecks(input);
  const primaryFindingCode = getPrimaryFindingCode(input, failedChecks);
  const label = primaryFindingCode
    ? VALIDATION_LABEL_BY_CODE[primaryFindingCode] ?? `Receipt Alert — ${humanizeCheckCode(primaryFindingCode)}`
    : input.code === 'RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR'
      ? 'Receipt Alert — Validation Engine Error'
      : 'Receipt Alert — Validation Failed';
  const receiptNumber = typeof input.context?.receiptNumber === 'string' ? input.context.receiptNumber : null;
  const receiptUrl = isHttpUrl(input.context?.receiptUrl) ? input.context.receiptUrl : null;
  const reportUrl = isHttpUrl(input.context?.reportUrl) ? input.context.reportUrl : null;
  const primaryFindingMessage =
    typeof input.context?.primaryFindingMessage === 'string' && input.context.primaryFindingMessage.trim().length > 0
      ? input.context.primaryFindingMessage
      : null;
  const detailsLines = formatValidationDetails(
    primaryFindingCode,
    getPrimaryFindingDetails(input, primaryFindingCode)
  );

  const links = [
    receiptUrl ? `• ${formatHtmlLink('Open receipt', receiptUrl)}` : null,
    reportUrl ? `• ${formatHtmlLink('Open incident', reportUrl)}` : null
  ].filter((line): line is string => Boolean(line));

  const body = [
    `<b>${escapeHtml(label)}</b>`,
    receiptNumber ? `🧾 Receipt: <code>${escapeHtml(receiptNumber)}</code>` : null,
    primaryFindingMessage ? escapeHtml(primaryFindingMessage) : null,
    detailsLines.length
      ? ['<b>Details</b>', ...detailsLines.map((line) => `• ${escapeHtml(line)}`)].join('\n')
      : null,
    failedChecks.length ? ['<b>Checks</b>', ...failedChecks.map((code) => `• ${escapeHtml(humanizeCheckCode(code))}`)].join('\n') : null,
    links.length ? ['<b>Links</b>', ...links].join('\n') : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return {
    title: '🚨 Receipt alert',
    body,
    parseMode: 'HTML'
  };
};

const isMembershipAutomationIncident = (input: ReportIncidentInput): boolean =>
  input.code === 'MEMBERSHIP_CREATED' ||
  input.code.startsWith('MEMBERSHIP_CREATION_') ||
  input.context?.automationCode === 'MEMBERSHIP_CREATED';

const isFlexiPassAutomationIncident = (input: ReportIncidentInput): boolean =>
  input.code === 'FLEXI_PASSES_CREATED' ||
  input.code.startsWith('FLEXI_PASS_') ||
  input.context?.automationCode === 'FLEXI_PASSES_CREATED';

const isBirthdayBookingIncident = (input: ReportIncidentInput): boolean =>
  input.source === 'birthday-booking' || input.code === 'BIRTHDAY_BOOKING_SUBMITTED';

const buildBirthdayBookingAlertPayload = (input: ReportIncidentInput): AlertPublishPayload => {
  const bookingReference = getString(input.context?.bookingReference);
  const childName = getString(input.context?.childName);
  const turningAge = isFiniteNumber(input.context?.turningAge) ? input.context.turningAge : null;
  const parentName = getString(input.context?.parentName);
  const phone = getString(input.context?.phone);
  const email = getString(input.context?.email);
  const eventDate = getString(input.context?.eventDate);
  const startTime = getString(input.context?.startTime);
  const packageLabel = getString(input.context?.packageLabel);
  const kidsCount = isFiniteNumber(input.context?.kidsCount) ? input.context.kidsCount : null;
  const estimatedTotal = isFiniteNumber(input.context?.estimatedTotal) ? input.context.estimatedTotal : null;
  const mainCourse = getString(input.context?.mainCourse);
  const specialNotes = getString(input.context?.specialNotes);
  const upgrades = Array.isArray(input.context?.upgrades)
    ? input.context.upgrades.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  const activities = Array.isArray(input.context?.activities)
    ? input.context.activities.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  const summaryUrl = isHttpUrl(input.context?.summaryUrl) ? input.context.summaryUrl : null;
  const reportUrl = isHttpUrl(input.context?.reportUrl) ? input.context.reportUrl : null;

  const label =
    childName && turningAge !== null
      ? `Birthday party request — ${childName} (turning ${formatNumber(turningAge)})`
      : 'New birthday party booking request';

  const details = [
    parentName ? `Parent: ${parentName}` : null,
    phone ? `Phone: ${phone}` : null,
    email && email !== 'N/A' ? `Email: ${email}` : null,
    eventDate || startTime
      ? `When: ${eventDate ?? 'TBD'}${startTime ? ` @ ${startTime}` : ''}`
      : null,
    packageLabel ? `Package: ${packageLabel}` : null,
    kidsCount !== null ? `Kids: ${formatNumber(kidsCount)}` : null,
    estimatedTotal !== null ? `Quote: ${formatNumber(estimatedTotal)} THB` : null,
    mainCourse && mainCourse !== 'None' ? `Main course: ${mainCourse}` : null,
    upgrades.length ? `Upgrades: ${formatList(upgrades)}` : null,
    activities.length ? `Activities: ${formatList(activities)}` : null,
    specialNotes ? `Notes: ${specialNotes}` : null
  ].filter((line): line is string => Boolean(line));

  const links = [
    summaryUrl ? `• ${formatHtmlLink('Open booking summary', summaryUrl)}` : null,
    reportUrl ? `• ${formatHtmlLink('Open incident', reportUrl)}` : null
  ].filter((line): line is string => Boolean(line));

  const body = [
    `<b>${escapeHtml(label)}</b>`,
    bookingReference ? `Ref: <code>${escapeHtml(bookingReference)}</code>` : null,
    details.length ? ['<b>Details</b>', ...details.map((line) => `• ${escapeHtml(line)}`)].join('\n') : null,
    links.length ? ['<b>Links</b>', ...links].join('\n') : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return {
    title: 'Birthday party booking',
    body,
    parseMode: 'HTML'
  };
};

const buildMembershipAutomationAlertPayload = (input: ReportIncidentInput): AlertPublishPayload => {
  const receiptNumber = typeof input.context?.receiptNumber === 'string' ? input.context.receiptNumber : null;
  const receiptUrl = isHttpUrl(input.context?.receiptUrl) ? input.context.receiptUrl : null;
  const reportUrl = isHttpUrl(input.context?.reportUrl) ? input.context.reportUrl : null;
  const familyName = getString(input.context?.familyName);
  const type = getString(input.context?.type);
  const startDate = getString(input.context?.startDate);
  const endDate = getString(input.context?.endDate);
  const reason = getString(input.context?.reason);
  const membershipName = getString(input.context?.membershipName);
  const itemId = getString(input.context?.itemId);
  const numberOfKids = isFiniteNumber(input.context?.numberOfKids) ? input.context.numberOfKids : null;

  const isSuccess = input.code === 'MEMBERSHIP_CREATED';
  const label = isSuccess ? 'Membership Created Automatically' : 'Membership Automation Needs Review';
  const icon = isSuccess ? '✅' : input.severity === 'critical' ? '🚨' : '⚠️';

  const details = [
    familyName ? `Family: ${familyName}` : null,
    type ? `Type: ${type}` : null,
    numberOfKids !== null ? `Kids: ${formatNumber(numberOfKids)}` : null,
    startDate || endDate ? `Dates: ${startDate ?? 'unknown'} → ${endDate ?? 'unknown'}` : null,
    membershipName ? `Membership: ${membershipName}` : null,
    reason ? `Reason: ${reason.replaceAll('_', ' ')}` : null,
    itemId ? `Item ID: ${itemId}` : null
  ].filter((line): line is string => Boolean(line));

  const links = [
    receiptUrl ? `• ${formatHtmlLink('Open receipt', receiptUrl)}` : null,
    reportUrl ? `• ${formatHtmlLink('Open incident', reportUrl)}` : null
  ].filter((line): line is string => Boolean(line));

  const body = [
    `<b>${escapeHtml(label)}</b>`,
    receiptNumber ? `🧾 Receipt: <code>${escapeHtml(receiptNumber)}</code>` : null,
    details.length ? ['<b>Details</b>', ...details.map((line) => `• ${escapeHtml(line)}`)].join('\n') : null,
    links.length ? ['<b>Links</b>', ...links].join('\n') : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return {
    title: `${icon} Membership automation`,
    body,
    parseMode: 'HTML'
  };
};

const buildFlexiPassAutomationAlertPayload = (input: ReportIncidentInput): AlertPublishPayload => {
  const receiptNumber = typeof input.context?.receiptNumber === 'string' ? input.context.receiptNumber : null;
  const receiptUrl = isHttpUrl(input.context?.receiptUrl) ? input.context.receiptUrl : null;
  const reportUrl = isHttpUrl(input.context?.reportUrl) ? input.context.reportUrl : null;
  const familyName = getString(input.context?.familyName);
  const recordName = getString(input.context?.recordName);
  const reason = getString(input.context?.reason);
  const validFrom = getString(input.context?.validFrom);
  const validUntil = getString(input.context?.validUntil);
  const cardCount = isFiniteNumber(input.context?.cardCount) ? input.context.cardCount : null;
  const entriesGranted = isFiniteNumber(input.context?.entriesGranted) ? input.context.entriesGranted : null;
  const entriesLeft = isFiniteNumber(input.context?.entriesLeft) ? input.context.entriesLeft : null;

  const isSuccess = input.code === 'FLEXI_PASSES_CREATED';
  const label = isSuccess ? 'Flexi Pass Created Automatically' : 'Flexi Pass Automation Needs Review';
  const icon = isSuccess ? '✅' : input.severity === 'critical' ? '🚨' : '⚠️';

  const details = [
    familyName ? `Family: ${familyName}` : null,
    cardCount !== null ? `Cards: ${formatNumber(cardCount)}` : null,
    entriesGranted !== null ? `Entries granted: ${formatNumber(entriesGranted)}` : null,
    entriesLeft !== null ? `Entries left: ${formatNumber(entriesLeft)}` : null,
    validFrom || validUntil ? `Valid: ${validFrom ?? 'unknown'} → ${validUntil ?? 'unknown'}` : null,
    recordName ? `Flexi pass: ${recordName}` : null,
    reason ? `Reason: ${reason.replaceAll('_', ' ')}` : null
  ].filter((line): line is string => Boolean(line));

  const links = [
    receiptUrl ? `• ${formatHtmlLink('Open receipt', receiptUrl)}` : null,
    reportUrl ? `• ${formatHtmlLink('Open incident', reportUrl)}` : null
  ].filter((line): line is string => Boolean(line));

  const body = [
    `<b>${escapeHtml(label)}</b>`,
    receiptNumber ? `🧾 Receipt: <code>${escapeHtml(receiptNumber)}</code>` : null,
    details.length ? ['<b>Details</b>', ...details.map((line) => `• ${escapeHtml(line)}`)].join('\n') : null,
    links.length ? ['<b>Links</b>', ...links].join('\n') : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return {
    title: `${icon} Flexi pass automation`,
    body,
    parseMode: 'HTML'
  };
};

const buildEmailReceivedAlertPayload = (input: ReportIncidentInput): AlertPublishPayload => {
  const from = getString(input.context?.from) ?? 'unknown sender';
  const to = getString(input.context?.to) ?? 'unknown recipient';
  const subject = getString(input.context?.subject) ?? '(no subject)';
  const receivedAt = getString(input.context?.receivedAt);
  const messageId = getString(input.context?.messageId);
  const attachmentCount = isFiniteNumber(input.context?.attachmentCount) ? input.context.attachmentCount : 0;
  const textSnippet = getString(input.context?.textSnippet);
  const reportUrl = isHttpUrl(input.context?.reportUrl) ? input.context.reportUrl : null;

  const details = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    receivedAt ? `Received: ${receivedAt}` : null,
    messageId ? `Message ID: ${messageId}` : null,
    `Attachments: ${formatNumber(attachmentCount)}`
  ].filter((line): line is string => Boolean(line));

  const body = [
    '<b>Email received by Cloudflare Worker</b>',
    ['<b>Details</b>', ...details.map((line) => `• ${escapeHtml(line)}`)].join('\n'),
    textSnippet ? ['<b>Snippet</b>', escapeHtml(textSnippet)].join('\n') : null,
    reportUrl ? `🔎 ${formatHtmlLink('Open incident', reportUrl)}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return {
    title: '📬 Email automation trigger',
    body,
    parseMode: 'HTML'
  };
};

export const buildIncidentAlertPayload = (input: ReportIncidentInput): AlertPublishPayload => {
  if (input.code === 'EMAIL_RECEIVED') return buildEmailReceivedAlertPayload(input);
  if (isReceiptValidationIncident(input)) return buildReceiptValidationAlertPayload(input);
  if (isMembershipAutomationIncident(input)) return buildMembershipAutomationAlertPayload(input);
  if (isFlexiPassAutomationIncident(input)) return buildFlexiPassAutomationAlertPayload(input);
  if (isBirthdayBookingIncident(input)) return buildBirthdayBookingAlertPayload(input);

  const failedChecks = getFailedChecks(input);
  const summary = INCIDENT_SUMMARY_BY_CODE[input.code] ?? input.message;
  const reportUrl = isHttpUrl(input.context?.reportUrl) ? input.context.reportUrl : null;
  const receiptNumber = typeof input.context?.receiptNumber === 'string' ? input.context.receiptNumber : null;
  const contextEntries = Object.entries(input.context ?? {})
    .filter(([key, value]) => !['failedChecks', 'reportUrl', 'receiptNumber'].includes(key) && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => `• <code>${escapeHtml(key)}</code>: ${escapeHtml(toPrintableValue(value))}`);

  const title = `🚨 ${escapeHtml(input.source)} incident`;
  const body = [
    `<b>${escapeHtml(summary)}</b>`,
    `🧷 Code: <b>${escapeHtml(input.code)}</b>`,
    `🔥 Severity: <b>${escapeHtml(input.severity.toUpperCase())}</b>`,
    receiptNumber ? `🧾 Receipt: <code>${escapeHtml(receiptNumber)}</code>` : null,
    failedChecks.length ? ['<b>Failed checks</b>', ...failedChecks.map((code) => `• ${escapeHtml(code)}`)].join('\n') : null,
    contextEntries.length ? ['<b>Context</b>', ...contextEntries].join('\n') : null,
    reportUrl ? `🔎 ${formatHtmlLink('Open incident', reportUrl)}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return {
    title,
    body,
    parseMode: 'HTML'
  };
};
