import { and, eq, inArray, sql } from 'drizzle-orm';
import { NOTION_API_KEY } from '$env/static/private';
import { FinancialLedgerDatabase } from '$lib/notion-sdk/dbs/financial-ledger/db';
import { FinancialLedgerPatchDTO, type FinancialLedgerPropertiesPatch } from '$lib/notion-sdk/dbs/financial-ledger/patch.dto';
import type { FinancialLedgerResponse } from '$lib/notion-sdk/dbs/financial-ledger/types';
import type { NotionFileUpload } from '$lib/server/notion/upload';
import { db } from '$lib/server/db/client';
import { emailAttentionReviews, emailAutomationActions, emailAutomationAuditLog } from '$lib/server/db/schema';

export const FINANCIAL_LEDGER_REVIEW_REASON_CODE = 'financial_ledger_incomplete';

export const FINANCIAL_LEDGER_CATEGORIES = [
  'Revenue',
  'Salary',
  'Owner Capital',
  'Legal',
  'Bills',
  'Rent',
  'Food & Groceries',
  'Staff Food',
  'Consumable Product',
  'Physical Product',
  'Maintenance',
  'Entertainment',
  'Miscellaneous',
  'Marketing'
] as const;

export type FinancialLedgerCategory = (typeof FINANCIAL_LEDGER_CATEGORIES)[number];
export type FinancialLedgerMissingField = 'category' | 'invoiceReceipt';

export type FinancialLedgerCompleteness = {
  category: string | null;
  hasInvoiceReceipt: boolean;
  receiptNotRequired: boolean;
  reviewRequired: boolean;
  missingFields: FinancialLedgerMissingField[];
};

const textValue = (value: unknown) => typeof value === 'string' && value.trim() ? value : null;

export const deriveFinancialLedgerCompleteness = (input: {
  category?: string | null;
  invoiceReceiptCount?: number;
  receiptNotRequired?: boolean;
}): FinancialLedgerCompleteness => {
  const category = textValue(input.category);
  const hasInvoiceReceipt = (input.invoiceReceiptCount ?? 0) > 0;
  const receiptNotRequired = input.receiptNotRequired === true;
  const missingFields: FinancialLedgerMissingField[] = [];
  if (!category) missingFields.push('category');
  if (!hasInvoiceReceipt && !receiptNotRequired) missingFields.push('invoiceReceipt');
  return { category, hasInvoiceReceipt, receiptNotRequired, reviewRequired: missingFields.length > 0, missingFields };
};

const completenessFromPage = (page: FinancialLedgerResponse) => deriveFinancialLedgerCompleteness({
  category: page.properties.Category?.select?.name,
  invoiceReceiptCount: page.properties['Invoice / Receipt']?.files?.length ?? 0,
  receiptNotRequired: page.properties['Receipt Not Required']?.checkbox
});

const safeObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const reviewRevision = (value: unknown) => {
  const revision = safeObject(value).revision;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
};

const reviewReason = (state: FinancialLedgerCompleteness) => state.reviewRequired
  ? `Financial Ledger review required: ${state.missingFields.map((field) => field === 'category' ? 'Category' : 'Invoice / Receipt').join(' and ')} missing.`
  : 'Financial Ledger completeness requirements are satisfied.';

const auditState = (pageId: string, state: FinancialLedgerCompleteness) => ({
  pageId,
  category: state.category,
  hasInvoiceReceipt: state.hasInvoiceReceipt,
  receiptNotRequired: state.receiptNotRequired,
  reviewRequired: state.reviewRequired,
  missingFields: state.missingFields
});

export type FinancialLedgerMutation = Omit<FinancialLedgerPropertiesPatch, 'invoiceReceipt'> & {
  invoiceReceipt?: FinancialLedgerPropertiesPatch['invoiceReceipt'];
  appendInvoiceReceipt?: NotionFileUpload;
};

export type FinancialLedgerMutationOptions = {
  pageId: string;
  eventId?: number;
  actionId?: number;
  actor?: string;
  reason?: string;
  changes?: FinancialLedgerMutation;
  expectedReviewRevision?: number;
};

/**
 * Reads the current Notion page, applies the requested changes, then mirrors
 * completeness to the linked Neon attention review and audit log. Notion and
 * Neon cannot share a database transaction, so this is intentionally the one
 * application-level mutation boundary used by every supported write path.
 */
export const mutateFinancialLedger = async ({
  pageId,
  eventId,
  actionId,
  actor = 'manager',
  reason = 'Financial Ledger record updated.',
  changes = {},
  expectedReviewRevision
}: FinancialLedgerMutationOptions) => {
  const ledger = new FinancialLedgerDatabase({ notionSecret: NOTION_API_KEY });
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${pageId}, 0))`);

    // Dashboard approval and other page-level updates may not know the email
    // event. Recover the durable link before mutating Notion so completeness
    // changes also mirror the matching attention review.
    let linkedEventId = eventId;
    let linkedActionId = actionId;
    if (linkedEventId === undefined) {
      const [linkedAction] = await tx.select({ id: emailAutomationActions.id, eventId: emailAutomationActions.eventId })
        .from(emailAutomationActions)
        .where(eq(emailAutomationActions.externalObjectId, pageId))
        .limit(1);
      linkedEventId = linkedAction?.eventId;
      linkedActionId ??= linkedAction?.id;
    }
    const [review] = linkedEventId === undefined
      ? []
      : await tx.select().from(emailAttentionReviews)
        .where(eq(emailAttentionReviews.eventId, linkedEventId)).limit(1);
    const currentRevision = reviewRevision(review?.analysisProvenance);
    if (expectedReviewRevision !== undefined && currentRevision !== expectedReviewRevision) {
      throw new Error('Review state changed. Refresh before updating the Financial Ledger.');
    }

    const page = await ledger.getPage(pageId) as FinancialLedgerResponse;
    const before = completenessFromPage(page);
    const nextProperties: FinancialLedgerMutation = { ...changes };
    let duplicateUpload = false;
    const existingFiles = page.properties['Invoice / Receipt']?.files ?? [];

    if (changes.appendInvoiceReceipt) {
      if (existingFiles.length >= 100) throw new Error('The Ledger receipt field already contains the maximum number of files.');
      if (existingFiles.some((file) => file.name === changes.appendInvoiceReceipt?.name)) {
        duplicateUpload = true;
      } else {
        nextProperties.invoiceReceipt = [...existingFiles, changes.appendInvoiceReceipt] as unknown as FinancialLedgerPropertiesPatch['invoiceReceipt'];
      }
      delete nextProperties.appendInvoiceReceipt;
    }

    const requestedCategory = Object.prototype.hasOwnProperty.call(nextProperties, 'category')
      ? nextProperties.category ?? null
      : before.category;
    const requestedFiles = Object.prototype.hasOwnProperty.call(nextProperties, 'invoiceReceipt')
      ? nextProperties.invoiceReceipt
      : undefined;
    const requestedReceiptNotRequired = Object.prototype.hasOwnProperty.call(nextProperties, 'receiptNotRequired')
      ? nextProperties.receiptNotRequired === true
      : before.receiptNotRequired;
    const after = deriveFinancialLedgerCompleteness({
      category: requestedCategory,
      invoiceReceiptCount: requestedFiles === undefined ? existingFiles.length : requestedFiles.length,
      receiptNotRequired: requestedReceiptNotRequired
    });
    nextProperties.reviewRequired = after.reviewRequired;
    nextProperties.receiptNotRequired = requestedReceiptNotRequired;

    // Even a duplicate upload writes the derived checkboxes again. This keeps
    // a retry from leaving a manually changed Review Required flag stale.
    await ledger.updatePage(pageId, new FinancialLedgerPatchDTO({ properties: nextProperties }));

    let reviewStatus: string | null = null;
    if (linkedEventId !== undefined) {
      const now = new Date();
      const nextReason = reviewReason(after);
      const nextProvenance = {
        ...safeObject(review?.analysisProvenance),
        source: 'financial-ledger',
        actor,
        savedAt: now.toISOString(),
        revision: currentRevision + 1,
        missingFields: after.missingFields
      };

      if (after.reviewRequired) {
        if (review) {
          const [updated] = await tx.update(emailAttentionReviews).set({
            status: review.status === 'done' ? 'waiting' : review.status,
            reasonCode: FINANCIAL_LEDGER_REVIEW_REASON_CODE,
            reason: nextReason,
            analysisProvenance: nextProvenance,
            lastActor: actor,
            startedAt: review.startedAt ?? now,
            completedAt: null,
            updatedAt: now
          }).where(and(eq(emailAttentionReviews.id, review.id), expectedReviewRevision === undefined ? sql`true` : sql`coalesce(case when jsonb_typeof(${emailAttentionReviews.analysisProvenance}->'revision') = 'number' then (${emailAttentionReviews.analysisProvenance}->>'revision')::int end, 0) = ${expectedReviewRevision}`)).returning({ id: emailAttentionReviews.id, status: emailAttentionReviews.status });
          if (!updated) throw new Error('Review state changed. Refresh before updating the Financial Ledger.');
          reviewStatus = updated.status;
        } else {
          const [created] = await tx.insert(emailAttentionReviews).values({
            eventId: linkedEventId,
            status: 'waiting',
            reasonCode: FINANCIAL_LEDGER_REVIEW_REASON_CODE,
            reason: nextReason,
            evidenceSnapshot: { source: 'financial-ledger', pageId, missingFields: after.missingFields },
            classifierDiagnostics: { source: 'financial-ledger-completeness' },
            analysisProvenance: nextProvenance,
            lastActor: actor,
            updatedAt: now
          }).onConflictDoNothing({ target: emailAttentionReviews.eventId }).returning({ status: emailAttentionReviews.status });
          reviewStatus = created?.status ?? 'waiting';
        }
      } else if (review && (review.reasonCode === FINANCIAL_LEDGER_REVIEW_REASON_CODE || expectedReviewRevision !== undefined)) {
        const [updated] = await tx.update(emailAttentionReviews).set({
          status: 'done',
          reason: nextReason,
          analysisProvenance: nextProvenance,
          lastActor: actor,
          startedAt: review.startedAt ?? now,
          completedAt: now,
          updatedAt: now
        }).where(and(eq(emailAttentionReviews.id, review.id), inArray(emailAttentionReviews.status, ['waiting', 'in_progress']), expectedReviewRevision === undefined ? sql`true` : sql`coalesce(case when jsonb_typeof(${emailAttentionReviews.analysisProvenance}->'revision') = 'number' then (${emailAttentionReviews.analysisProvenance}->>'revision')::int end, 0) = ${expectedReviewRevision}`)).returning({ status: emailAttentionReviews.status });
        if (!updated && expectedReviewRevision !== undefined) throw new Error('Review state changed. Refresh before updating the Financial Ledger.');
        reviewStatus = updated?.status ?? review.status;
      }
    }

    await tx.insert(emailAutomationAuditLog).values({
      eventId: linkedEventId,
      actionId: linkedActionId,
      actor,
      action: 'financial_ledger_completeness_updated',
      reason,
      before: auditState(pageId, before),
      after: { ...auditState(pageId, after), reviewStatus, duplicateUpload }
    });

    return { pageId, before, after, reviewStatus, duplicateUpload };
  });
};

export const readFinancialLedgerCompleteness = async (pageId: string) => {
  const ledger = new FinancialLedgerDatabase({ notionSecret: NOTION_API_KEY });
  const page = await ledger.getPage(pageId) as FinancialLedgerResponse;
  return completenessFromPage(page);
};

export const createFinancialLedgerPage = async ({
  properties,
  eventId,
  actionId,
  actor = 'manager',
  reason = 'Financial Ledger record created.'
}: {
  properties: FinancialLedgerPropertiesPatch;
  eventId?: number;
  actionId?: number;
  actor?: string;
  reason?: string;
}) => {
  const ledger = new FinancialLedgerDatabase({ notionSecret: NOTION_API_KEY });
  const initial = deriveFinancialLedgerCompleteness({
    category: properties.category,
    invoiceReceiptCount: properties.invoiceReceipt?.length ?? 0,
    receiptNotRequired: properties.receiptNotRequired
  });
  const response = await ledger.createPage(new FinancialLedgerPatchDTO({
    properties: { ...properties, receiptNotRequired: properties.receiptNotRequired === true, reviewRequired: initial.reviewRequired }
  }));
  const synced = await mutateFinancialLedger({ pageId: response.id, eventId, actionId, actor, reason });
  return { ...synced, id: response.id, externalUrl: response.url || `https://www.notion.so/${response.id.replaceAll('-', '')}` };
};
