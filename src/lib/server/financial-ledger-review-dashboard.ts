import { and, asc, eq, inArray } from 'drizzle-orm';
import { NOTION_API_KEY } from '$env/static/private';
import { db } from '$lib/server/db/client';
import { emailAttentionReviews, emailAutomationActions, emailEvents } from '$lib/server/db/schema';
import { FinancialLedgerDatabase } from '$lib/notion-sdk/dbs/financial-ledger/db';
import type { FinancialLedgerResponse } from '$lib/notion-sdk/dbs/financial-ledger/types';
import {
  deriveFinancialLedgerCompleteness,
  FINANCIAL_LEDGER_CATEGORIES,
  FINANCIAL_LEDGER_REVIEW_REASON_CODE,
  mutateFinancialLedger,
  type FinancialLedgerCategory
} from './financial-ledger-completeness';

const notionPageUrl = (id: string, url?: string | null) => url || `https://www.notion.so/${id.replaceAll('-', '')}`;

const readRevision = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  const revision = (value as Record<string, unknown>).revision;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
};

const pageSummary = (page: FinancialLedgerResponse) => {
  const category = page.properties.Category?.select?.name ?? null;
  const invoiceReceiptCount = page.properties['Invoice / Receipt']?.files?.length ?? 0;
  const receiptNotRequired = page.properties['Receipt Not Required']?.checkbox === true;
  const completeness = deriveFinancialLedgerCompleteness({ category, invoiceReceiptCount, receiptNotRequired });
  const description = page.properties.Description?.title?.map((item) => item.plain_text).join('') || 'Untitled Financial Ledger record';
  return {
    pageId: page.id,
    url: notionPageUrl(page.id, page.url),
    description,
    amountThb: page.properties['Amount (THB)']?.number ?? null,
    category,
    invoiceReceiptCount,
    receiptNotRequired,
    reviewRequired: completeness.reviewRequired,
    missingFields: completeness.missingFields
  };
};

type ReviewRow = {
  reviewId: number;
  eventId: number;
  actionId: number | null;
  pageId: string | null;
  status: string;
  reason: string;
  analysisProvenance: unknown;
  subject: string;
  receivedAt: Date;
  amountMinor: number | null;
  currency: string | null;
};

export const getFinancialLedgerReviewQueue = async () => {
  const rows = await db.select({
    reviewId: emailAttentionReviews.id,
    eventId: emailAttentionReviews.eventId,
    status: emailAttentionReviews.status,
    reason: emailAttentionReviews.reason,
    analysisProvenance: emailAttentionReviews.analysisProvenance,
    subject: emailEvents.subject,
    receivedAt: emailEvents.receivedAt,
    amountMinor: emailEvents.amountMinor,
    currency: emailEvents.currency,
    actionId: emailAutomationActions.id,
    pageId: emailAutomationActions.externalObjectId
  }).from(emailAttentionReviews)
    .innerJoin(emailEvents, eq(emailAttentionReviews.eventId, emailEvents.id))
    .leftJoin(emailAutomationActions, eq(emailAutomationActions.eventId, emailAttentionReviews.eventId))
    .where(and(
      eq(emailAttentionReviews.reasonCode, FINANCIAL_LEDGER_REVIEW_REASON_CODE),
      inArray(emailAttentionReviews.status, ['waiting', 'in_progress'])
    ))
    .orderBy(asc(emailAttentionReviews.createdAt), asc(emailAttentionReviews.id))
    .limit(100) as ReviewRow[];

  if (!NOTION_API_KEY) {
    return { categories: FINANCIAL_LEDGER_CATEGORIES, reviews: [], error: 'NOTION_API_KEY is not configured.' };
  }

  const ledger = new FinancialLedgerDatabase({ notionSecret: NOTION_API_KEY });
  const reviews = await Promise.all(rows.map(async (row) => {
    if (!row.pageId) {
      return { ...row, reviewRevision: readRevision(row.analysisProvenance), ledger: null, ledgerError: 'No Financial Ledger page is linked to this recorded transaction.' };
    }
    try {
      const page = await ledger.getPage(row.pageId) as FinancialLedgerResponse;
      return { ...row, reviewRevision: readRevision(row.analysisProvenance), ledger: pageSummary(page), ledgerError: null };
    } catch (error) {
      return {
        ...row,
        reviewRevision: readRevision(row.analysisProvenance),
        ledger: null,
        ledgerError: error instanceof Error ? error.message : 'Financial Ledger page could not be loaded.'
      };
    }
  }));

  return { categories: FINANCIAL_LEDGER_CATEGORIES, reviews, error: null };
};

export const updateFinancialLedgerReview = async ({
  reviewId,
  category,
  receiptNotRequired,
  expectedReviewRevision
}: {
  reviewId: number;
  category: string;
  receiptNotRequired: boolean;
  expectedReviewRevision: number;
}) => {
  if (!FINANCIAL_LEDGER_CATEGORIES.includes(category as FinancialLedgerCategory)) {
    throw new Error('Choose a valid Financial Ledger category.');
  }
  if (!Number.isSafeInteger(expectedReviewRevision) || expectedReviewRevision < 0) {
    throw new Error('The review revision is invalid. Refresh the dashboard.');
  }

  const [row] = await db.select({
    eventId: emailAttentionReviews.eventId,
    status: emailAttentionReviews.status,
    reasonCode: emailAttentionReviews.reasonCode,
    actionId: emailAutomationActions.id,
    pageId: emailAutomationActions.externalObjectId
  }).from(emailAttentionReviews)
    .leftJoin(emailAutomationActions, eq(emailAutomationActions.eventId, emailAttentionReviews.eventId))
    .where(and(eq(emailAttentionReviews.id, reviewId), eq(emailAttentionReviews.reasonCode, FINANCIAL_LEDGER_REVIEW_REASON_CODE)))
    .limit(1);

  if (!row || !['waiting', 'in_progress'].includes(row.status)) throw new Error('This Financial Ledger review is no longer open. Refresh the dashboard.');
  if (!row.pageId) throw new Error('This review has no linked Financial Ledger page.');

  const result = await mutateFinancialLedger({
    pageId: row.pageId,
    eventId: row.eventId,
    actionId: row.actionId ?? undefined,
    actor: 'manager',
    reason: 'Manager updated Financial Ledger completeness fields from the review dashboard.',
    expectedReviewRevision,
    changes: {
      category: category as FinancialLedgerCategory,
      receiptNotRequired
    }
  });

  return {
    reviewRequired: result.after.reviewRequired,
    missingFields: result.after.missingFields,
    nextStep: result.after.reviewRequired
      ? `Saved. Still missing: ${result.after.missingFields.join(' and ')}.`
      : 'Saved. Financial Ledger completeness is satisfied and the attention review is closed.'
  };
};