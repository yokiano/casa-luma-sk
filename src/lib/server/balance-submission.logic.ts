import { randomUUID } from 'node:crypto';

export const BALANCE_SUBMISSION_ACCOUNTS = [
  { key: 'kbank', name: 'KBank' },
  { key: 'safe_cash', name: 'Safe / Cash on hand' }
] as const;

export type BalanceSubmissionAccountKey = (typeof BALANCE_SUBMISSION_ACCOUNTS)[number]['key'];

export type RawBalanceSubmission = {
  submissionKey: unknown;
  observedAt: unknown;
  kbankBalance: unknown;
  safeBalance: unknown;
  notes?: unknown;
};

export type ValidatedBalanceSubmission = {
  submissionKey: string;
  observedAt: string;
  kbankBalance: number;
  safeBalance: number;
  notes: string | null;
};

export type BalanceSubmissionValidation =
  | { ok: true; value: ValidatedBalanceSubmission }
  | { ok: false; fieldErrors: Record<string, string> };

const SUBMISSION_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{15,99}$/;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

const parseMoney = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value).trim();
  if (!raw || !/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const amount = Number(raw);
  return Number.isSafeInteger(amount * 100) && amount >= 0 && amount <= 1_000_000_000 ? amount : null;
};

/** Converts a Bangkok-local datetime-local value to an unambiguous UTC ISO value. */
export const bangkokLocalToUtc = (value: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '00'] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(localAsUtc);

  // Bangkok has no DST and is UTC+07:00. Round-trip validation rejects impossible dates
  // instead of allowing JavaScript Date to silently normalize them.
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    return null;
  }

  return new Date(localAsUtc - BANGKOK_OFFSET_MS).toISOString();
};

export const formatBangkokDateTimeLocal = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};

export const validateBalanceSubmission = (input: RawBalanceSubmission): BalanceSubmissionValidation => {
  const fieldErrors: Record<string, string> = {};
  const submissionKey = typeof input.submissionKey === 'string' ? input.submissionKey.trim() : '';
  const observedAt = typeof input.observedAt === 'string' ? input.observedAt.trim() : '';
  const kbankBalance = parseMoney(input.kbankBalance);
  const safeBalance = parseMoney(input.safeBalance);
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';

  if (!SUBMISSION_KEY_PATTERN.test(submissionKey)) fieldErrors.submissionKey = 'Refresh the form and try again.';
  if (!bangkokLocalToUtc(observedAt)) fieldErrors.observedAt = 'Enter a valid Bangkok observation time.';
  if (kbankBalance === null) fieldErrors.kbankBalance = 'Enter a non-negative amount with up to 2 decimal places.';
  if (safeBalance === null) fieldErrors.safeBalance = 'Enter a non-negative amount with up to 2 decimal places.';
  if (notes.length > 1_000) fieldErrors.notes = 'Notes must be 1,000 characters or fewer.';

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  return {
    ok: true,
    value: {
      submissionKey,
      observedAt: bangkokLocalToUtc(observedAt)!,
      kbankBalance: kbankBalance!,
      safeBalance: safeBalance!,
      notes: notes || null
    }
  };
};

export const newBalanceSubmissionKey = () => randomUUID();

export const balanceSubmissionPageTitle = (submissionKey: string, account: BalanceSubmissionAccountKey) =>
  `Manager balance · ${submissionKey} · ${account === 'kbank' ? 'KBank' : 'Safe'}`;

export const isManagerRole = (role: string | undefined | null): role is 'manager' => role === 'manager';
