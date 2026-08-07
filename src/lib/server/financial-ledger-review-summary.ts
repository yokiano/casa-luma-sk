import { env } from '$env/dynamic/private';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { createTelegramDestinationPublisher } from '$lib/server/alerts/destinations';
import { db } from '$lib/server/db/client';
import { emailAttentionReviews, emailAutomationActions, emailEvents, financialLedgerReviewSummaryRuns } from '$lib/server/db/schema';
import { FINANCIAL_LEDGER_REVIEW_REASON_CODE } from './financial-ledger-completeness';
import {
  bangkokDateKey,
  renderFinancialLedgerReviewSummary,
  summarizeFinancialLedgerReviews,
  type FinancialLedgerReviewSummary,
  type FinancialLedgerReviewSummaryRow
} from './financial-ledger-review-summary.logic';

const LEASE_MS = 10 * 60 * 1000;
const publicBaseUrl = () => (env.EMAIL_AUTOMATION_PUBLIC_URL || 'https://www.casalumakpg.com').replace(/\/+$/, '');

type SummaryRun = typeof financialLedgerReviewSummaryRuns.$inferSelect;
export type FinancialLedgerReviewSummaryClaim =
  | { kind: 'claimed'; run: SummaryRun; leaseToken: string }
  | { kind: 'already_sent'; run: SummaryRun }
  | { kind: 'in_progress'; run: SummaryRun };

export type FinancialLedgerReviewSummaryStore = {
  claim(localDate: string): Promise<FinancialLedgerReviewSummaryClaim>;
  markSent(run: SummaryRun, leaseToken: string, summary: FinancialLedgerReviewSummary): Promise<void>;
  markFailed(run: SummaryRun, leaseToken: string, message: string): Promise<void>;
};

export const queryFinancialLedgerReviewSummary = async (now = new Date()): Promise<FinancialLedgerReviewSummary> => {
  const rows = await db.selectDistinct({
    reviewId: emailAttentionReviews.id,
    receivedAt: emailEvents.receivedAt,
    reason: emailAttentionReviews.reason,
    analysisProvenance: emailAttentionReviews.analysisProvenance
  }).from(emailAttentionReviews)
    .innerJoin(emailEvents, eq(emailAttentionReviews.eventId, emailEvents.id))
    // A non-null external object ID is the durable proof that the Ledger write
    // completed. Reviews for unrecorded or blocked actions stay out of this reminder.
    .innerJoin(emailAutomationActions, eq(emailAutomationActions.eventId, emailAttentionReviews.eventId))
    .where(and(
      eq(emailAttentionReviews.reasonCode, FINANCIAL_LEDGER_REVIEW_REASON_CODE),
      inArray(emailAttentionReviews.status, ['waiting', 'in_progress']),
      inArray(emailAutomationActions.status, ['succeeded', 'reconciled']),
      isNotNull(emailAutomationActions.externalObjectId)
    ));

  return summarizeFinancialLedgerReviews(rows as FinancialLedgerReviewSummaryRow[], now);
};

const createSummaryStore = (): FinancialLedgerReviewSummaryStore => ({
  async claim(localDate) {
    await db.insert(financialLedgerReviewSummaryRuns).values({ localDate, status: 'pending' }).onConflictDoNothing({ target: financialLedgerReviewSummaryRuns.localDate });
    return db.transaction(async (tx) => {
      const [run] = await tx.select().from(financialLedgerReviewSummaryRuns).where(eq(financialLedgerReviewSummaryRuns.localDate, localDate)).for('update').limit(1);
      if (!run) throw new Error('Could not create or load the Financial Ledger review summary run.');
      if (run.status === 'sent') return { kind: 'already_sent' as const, run };
      if (run.status === 'processing' && run.leaseExpiresAt && run.leaseExpiresAt.getTime() > Date.now()) {
        return { kind: 'in_progress' as const, run };
      }
      const leaseToken = randomUUID();
      const [claimed] = await tx.update(financialLedgerReviewSummaryRuns).set({
        status: 'processing',
        attemptCount: run.attemptCount + 1,
        leaseToken,
        leaseExpiresAt: new Date(Date.now() + LEASE_MS),
        updatedAt: new Date()
      }).where(eq(financialLedgerReviewSummaryRuns.id, run.id)).returning();
      if (!claimed) throw new Error('Could not claim the Financial Ledger review summary run.');
      return { kind: 'claimed' as const, run: claimed, leaseToken };
    });
  },

  async markSent(run, leaseToken, summary) {
    const [updated] = await db.update(financialLedgerReviewSummaryRuns).set({
      status: 'sent',
      summarySnapshot: summary,
      lastError: null,
      leaseToken: null,
      leaseExpiresAt: null,
      sentAt: new Date(),
      updatedAt: new Date()
    }).where(and(eq(financialLedgerReviewSummaryRuns.id, run.id), eq(financialLedgerReviewSummaryRuns.leaseToken, leaseToken))).returning({ id: financialLedgerReviewSummaryRuns.id });
    if (!updated) throw new Error(`Financial Ledger review summary lease was lost for ${run.localDate}.`);
  },

  async markFailed(run, leaseToken, message) {
    await db.update(financialLedgerReviewSummaryRuns).set({
      status: 'failed',
      lastError: message.slice(0, 500),
      leaseToken: null,
      leaseExpiresAt: null,
      updatedAt: new Date()
    }).where(and(eq(financialLedgerReviewSummaryRuns.id, run.id), eq(financialLedgerReviewSummaryRuns.leaseToken, leaseToken)));
  }
});

export type FinancialLedgerReviewSummaryResult =
  | { status: 'sent'; localDate: string; count: number }
  | { status: 'no_reviews'; localDate: string; count: 0 }
  | { status: 'already_sent'; localDate: string }
  | { status: 'in_progress'; localDate: string };

type SummaryDependencies = {
  getSummary?: (now: Date) => Promise<FinancialLedgerReviewSummary>;
  publish?: (body: string) => Promise<void>;
  store?: FinancialLedgerReviewSummaryStore;
};

export const runFinancialLedgerReviewSummary = async (
  now = new Date(),
  dependencies: SummaryDependencies = {}
): Promise<FinancialLedgerReviewSummaryResult> => {
  const localDate = bangkokDateKey(now);
  const store = dependencies.store ?? createSummaryStore();
  const claim = await store.claim(localDate);
  if (claim.kind === 'already_sent') return { status: 'already_sent', localDate };
  if (claim.kind === 'in_progress') return { status: 'in_progress', localDate };

  const getSummary = dependencies.getSummary ?? queryFinancialLedgerReviewSummary;
  try {
    const summary = await getSummary(now);
    if (summary.count === 0) {
      await store.markSent(claim.run, claim.leaseToken, summary);
      return { status: 'no_reviews', localDate, count: 0 };
    }

    const body = renderFinancialLedgerReviewSummary(
      summary,
      `${publicBaseUrl()}/mgmt-dashboard/financial-ledger-reviews`
    );
    const publisher = dependencies.publish
      ? dependencies.publish
      : async (message: string) => {
        const telegram = createTelegramDestinationPublisher('financial_transactions');
        if (!telegram) throw new Error('Financial Telegram destination is not configured.');
        await telegram.publish({ title: '', body: message, parseMode: 'HTML' });
      };
    await publisher(body);
    await store.markSent(claim.run, claim.leaseToken, summary);
    return { status: 'sent', localDate, count: summary.count };
  } catch (error) {
    await store.markFailed(claim.run, claim.leaseToken, error instanceof Error ? error.message : String(error));
    throw error;
  }
};
