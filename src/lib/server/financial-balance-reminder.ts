import { env } from '$env/dynamic/private';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { createTelegramDestinationPublisher } from '$lib/server/alerts/destinations';
import { db } from '$lib/server/db/client';
import { financialBalanceReminderRuns } from '$lib/server/db/schema';
import { getBalanceReconciliationSummary } from './balance-reconciliation';
import {
  bangkokDateKey,
  renderFinancialBalanceReminder,
  type FinancialReminderSummary
} from './financial-balance-reminder.logic';

const LEASE_MS = 10 * 60 * 1000;
const publicBaseUrl = () => (env.EMAIL_AUTOMATION_PUBLIC_URL || 'https://www.casalumakpg.com').replace(/\/+$/, '');

type ReminderRun = typeof financialBalanceReminderRuns.$inferSelect;
export type FinancialReminderClaim =
  | { kind: 'claimed'; run: ReminderRun; leaseToken: string }
  | { kind: 'already_sent'; run: ReminderRun }
  | { kind: 'in_progress'; run: ReminderRun };

export type FinancialReminderStore = {
  claim(localDate: string): Promise<FinancialReminderClaim>;
  markSent(run: ReminderRun, leaseToken: string, summary: FinancialReminderSummary): Promise<void>;
  markFailed(run: ReminderRun, leaseToken: string, message: string): Promise<void>;
};

type ReminderDependencies = {
  getSummary?: (now: Date) => Promise<FinancialReminderSummary>;
  publish?: (body: string) => Promise<void>;
  store?: FinancialReminderStore;
};

const createReminderStore = (): FinancialReminderStore => ({
  async claim(localDate) {
    await db.insert(financialBalanceReminderRuns).values({ localDate, status: 'pending' }).onConflictDoNothing({ target: financialBalanceReminderRuns.localDate });
    return db.transaction(async (tx) => {
      const [run] = await tx.select().from(financialBalanceReminderRuns).where(eq(financialBalanceReminderRuns.localDate, localDate)).for('update').limit(1);
      if (!run) throw new Error('Could not create or load the financial reminder run.');
      if (run.status === 'sent') return { kind: 'already_sent' as const, run };
      if (run.status === 'processing' && run.leaseExpiresAt && run.leaseExpiresAt.getTime() > Date.now()) {
        return { kind: 'in_progress' as const, run };
      }
      const leaseToken = randomUUID();
      const [claimed] = await tx.update(financialBalanceReminderRuns).set({
        status: 'processing',
        attemptCount: run.attemptCount + 1,
        leaseToken,
        leaseExpiresAt: new Date(Date.now() + LEASE_MS),
        updatedAt: new Date()
      }).where(eq(financialBalanceReminderRuns.id, run.id)).returning();
      if (!claimed) throw new Error('Could not claim the financial reminder run.');
      return { kind: 'claimed' as const, run: claimed, leaseToken };
    });
  },

  async markSent(run, leaseToken, summary) {
    const [updated] = await db.update(financialBalanceReminderRuns).set({
      status: 'sent',
      summarySnapshot: summary,
      lastError: null,
      leaseToken: null,
      leaseExpiresAt: null,
      sentAt: new Date(),
      updatedAt: new Date()
    }).where(and(eq(financialBalanceReminderRuns.id, run.id), eq(financialBalanceReminderRuns.leaseToken, leaseToken))).returning({ id: financialBalanceReminderRuns.id });
    if (!updated) throw new Error(`Financial reminder lease was lost for ${run.localDate}.`);
  },

  async markFailed(run, leaseToken, message) {
    await db.update(financialBalanceReminderRuns).set({
      status: 'failed',
      lastError: message.slice(0, 500),
      leaseToken: null,
      leaseExpiresAt: null,
      updatedAt: new Date()
    }).where(and(eq(financialBalanceReminderRuns.id, run.id), eq(financialBalanceReminderRuns.leaseToken, leaseToken)));
  }
});

export type FinancialReminderResult =
  | { status: 'sent'; localDate: string }
  | { status: 'already_sent'; localDate: string }
  | { status: 'in_progress'; localDate: string };

export const runFinancialBalanceReminder = async (now = new Date(), dependencies: ReminderDependencies = {}): Promise<FinancialReminderResult> => {
  const localDate = bangkokDateKey(now);
  const store = dependencies.store ?? createReminderStore();
  const claim = await store.claim(localDate);
  if (claim.kind === 'already_sent') return { status: 'already_sent', localDate };
  if (claim.kind === 'in_progress') return { status: 'in_progress', localDate };

  const getSummary = dependencies.getSummary ?? ((asOf: Date) => getBalanceReconciliationSummary({ asOf }));
  const publisher = dependencies.publish
    ? dependencies.publish
    : async (body: string) => {
      const telegram = createTelegramDestinationPublisher('financial_transactions');
      if (!telegram) throw new Error('Financial Telegram destination is not configured.');
      await telegram.publish({ title: '', body, parseMode: 'HTML' });
    };

  try {
    const summary = await getSummary(now);
    const body = renderFinancialBalanceReminder(summary, {
      localDate,
      reconciliationUrl: `${publicBaseUrl()}/mgmt-dashboard/reconciliation`,
      submitUrl: `${publicBaseUrl()}/mgmt-dashboard/balances/submit`
    });
    await publisher(body);
    await store.markSent(claim.run, claim.leaseToken, summary);
    return { status: 'sent', localDate };
  } catch (error) {
    await store.markFailed(claim.run, claim.leaseToken, error instanceof Error ? error.message : String(error));
    throw error;
  }
};
