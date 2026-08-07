import { NOTION_API_KEY } from '$env/static/private';
import { FinancialLedgerDatabase } from '$lib/notion-sdk/dbs/financial-ledger/db';
import type { FinancialLedgerPropertiesPatch } from '$lib/notion-sdk/dbs/financial-ledger/patch.dto';
import type { FinancialLedgerResponse } from '$lib/notion-sdk/dbs/financial-ledger/types';
import { createFinancialLedgerPage, mutateFinancialLedger } from '$lib/server/financial-ledger-completeness';

export type FinancialLedgerType = FinancialLedgerResponse['properties']['Type']['select']['name'];
export type FinancialLedgerStatus = FinancialLedgerResponse['properties']['Status']['status']['name'];

export type FinancialLedgerRecordInput = {
  ledgerType: FinancialLedgerType;
  title: string;
  amount: number;
  date: string;
  category?: string;
  department?: string;
  supplierId?: string;
  transactionId?: string;
  sourceFileName?: string;
  receiptUrl?: string;
  receiptNotRequired?: boolean;
  bankAccount?: string;
  paymentMethod?: string;
  status?: FinancialLedgerStatus;
  notes?: string;
  eventId?: number;
  actionId?: number;
  actor?: string;
};

export type FinancialLedgerReferenceMatch =
  | { state: 'verified'; id: string; externalUrl: string }
  | { state: 'amount_mismatch' }
  | { state: 'type_mismatch' }
  | { state: 'reference_mismatch' }
  | { state: 'ambiguous' }
  | { state: 'missing' };

const notionPageUrl = (id: string, apiUrl?: string) => apiUrl || `https://www.notion.so/${id.replaceAll('-', '')}`;

const normalizeDate = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('/')) return dateStr;
  const [datePart, timePart] = dateStr.split(/\s+/);
  const [day, month, year] = datePart.split('/');
  if (!day || !month || !year) return dateStr;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}${timePart ? `T${timePart}:00` : ''}`;
};

const richTextValue = (value: unknown) => {
  if (!Array.isArray(value)) return '';
  return value.map((item) => {
    if (!item || typeof item !== 'object') return '';
    const candidate = item as { plain_text?: unknown; text?: { content?: unknown } };
    return typeof candidate.plain_text === 'string'
      ? candidate.plain_text
      : typeof candidate.text?.content === 'string' ? candidate.text.content : '';
  }).join('');
};

/**
 * Query the reference first, then verify every identity field before treating
 * a prior Notion page as a safe retry target.
 */
export async function findFinancialLedgerByReference(reference: string, expectedAmount?: number, expectedType?: FinancialLedgerType): Promise<FinancialLedgerReferenceMatch> {
  const normalizedReference = reference.trim();
  const ledger = new FinancialLedgerDatabase({ notionSecret: NOTION_API_KEY });
  const response = await ledger.query({ filter: { referenceNumber: { equals: normalizedReference } } });
  if (response.results.length > 1) return { state: 'ambiguous' };
  const page = response.results[0];
  if (!page) return { state: 'missing' };

  // The Notion filter is the primary reference check. Re-check the returned
  // value when the API includes it so a stale or malformed response cannot be
  // mistaken for the requested transaction.
  const returnedReference = richTextValue(page.properties['Reference Number']?.rich_text);
  if (returnedReference && returnedReference !== normalizedReference) return { state: 'reference_mismatch' };

  if (expectedAmount !== undefined && page.properties['Amount (THB)']?.number !== expectedAmount) {
    return { state: 'amount_mismatch' };
  }
  if (expectedType !== undefined && page.properties.Type?.select?.name !== expectedType) {
    return { state: 'type_mismatch' };
  }
  return {
    state: 'verified',
    id: page.id,
    externalUrl: notionPageUrl(page.id, page.url)
  };
}

export class FinancialLedgerDuplicateConflict extends Error {
  readonly match: Exclude<FinancialLedgerReferenceMatch, { state: 'verified' } | { state: 'missing' }>;

  constructor(reference: string, match: Exclude<FinancialLedgerReferenceMatch, { state: 'verified' } | { state: 'missing' }>) {
    const message = match.state === 'amount_mismatch'
      ? `Potential Duplicate: Reference Number ${reference} already exists with a different or unverifiable amount.`
      : match.state === 'type_mismatch'
        ? `Potential Duplicate: Reference Number ${reference} already exists with a different or unverifiable Ledger Type.`
        : match.state === 'reference_mismatch'
          ? `Potential Duplicate: Reference Number ${reference} could not be verified exactly.`
          : `Potential Duplicate: More than one Financial Ledger page has Reference Number ${reference}.`;
    super(message);
    this.name = 'FinancialLedgerDuplicateConflict';
    this.match = match;
  }
}

export const isFinancialLedgerDuplicateConflict = (value: unknown): value is FinancialLedgerDuplicateConflict => value instanceof FinancialLedgerDuplicateConflict;

export async function createFinancialLedgerRecord(data: FinancialLedgerRecordInput) {
  const ledger = new FinancialLedgerDatabase({ notionSecret: NOTION_API_KEY });
  const normalizedDate = normalizeDate(data.date);
  const reference = data.transactionId?.trim();

  if (reference) {
    const existing = await findFinancialLedgerByReference(reference, data.amount, data.ledgerType);
    if (existing.state === 'verified') {
      await mutateFinancialLedger({
        pageId: existing.id,
        eventId: data.eventId,
        actionId: data.actionId,
        actor: data.actor ?? 'email-automation',
        reason: 'Existing Financial Ledger record was reconciled.'
      });
      return { id: existing.id, externalUrl: existing.externalUrl, reconciled: true as const };
    }
    if (existing.state !== 'missing') throw new FinancialLedgerDuplicateConflict(reference, existing);
  } else {
    const existing = await ledger.query({
      filter: {
        and: [
          { amountThb: { equals: data.amount } },
          { date: { equals: normalizedDate } },
          { type: { equals: data.ledgerType } },
          ...(data.department ? [{ department: { equals: data.department } }] : [])
        ]
      } as any
    });
    if (existing.results.length > 0) {
      throw new Error(`Potential Duplicate: A Financial Ledger record with the same amount (${data.amount}) and date already exists.`);
    }
  }

  const invoiceReceipt = data.receiptUrl
    ? [{ type: 'external' as const, name: 'Slip', external: { url: data.receiptUrl } }]
    : undefined;
  const sourceFileNote = data.sourceFileName?.trim() ? `source file: ${data.sourceFileName.trim()}` : undefined;
  const trimmedNotes = data.notes?.trim();
  const mergedNotes = trimmedNotes && sourceFileNote
    ? `${trimmedNotes}\n${sourceFileNote}`
    : trimmedNotes || sourceFileNote || 'synced via Financial Ledger tool';

  // Notion's generated patch DTO expects a status property object, not the selected status name string.
  const status: NonNullable<FinancialLedgerPropertiesPatch['status']> = { name: data.status ?? 'Paid' };
  const response = await createFinancialLedgerPage({
    properties: {
      description: data.title,
      type: data.ledgerType,
      status,
      amountThb: data.amount,
      date: { start: normalizedDate },
      department: data.department as FinancialLedgerPropertiesPatch['department'],
      category: data.category as FinancialLedgerPropertiesPatch['category'],
      referenceNumber: reference,
      paymentMethod: (data.paymentMethod ?? 'Scan') as FinancialLedgerPropertiesPatch['paymentMethod'],
      bankAccount: data.bankAccount as FinancialLedgerPropertiesPatch['bankAccount'],
      notes: mergedNotes,
      supplier: data.supplierId ? [{ id: data.supplierId }] : undefined,
      invoiceReceipt,
      receiptNotRequired: data.receiptNotRequired === true
    },
    eventId: data.eventId,
    actionId: data.actionId,
    actor: data.actor ?? 'email-automation',
    reason: 'Financial Ledger record created by a supported email automation flow.'
  });

  return { id: response.id, externalUrl: response.externalUrl, reconciled: false as const };
}

export async function reconcileFinancialLedgerRecord(options: {
  reference: string;
  amount?: number;
  ledgerType: FinancialLedgerType;
  eventId?: number;
  actionId?: number;
  actor?: string;
}) {
  const found = await findFinancialLedgerByReference(options.reference, options.amount, options.ledgerType);
  if (found.state === 'verified') {
    await mutateFinancialLedger({
      pageId: found.id,
      eventId: options.eventId,
      actionId: options.actionId,
      actor: options.actor ?? 'email-automation',
      reason: 'Existing Financial Ledger record was reconciled.'
    });
  }
  return found;
}
