import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { BalanceSnapshotsDatabase } from '$lib/notion-sdk/dbs/balance-snapshots/db';
import { BalanceSnapshotsPatchDTO } from '$lib/notion-sdk/dbs/balance-snapshots/patch.dto';
import { db } from '$lib/server/db/client';
import { balanceSubmissionRecords } from '$lib/server/db/schema';
import {
  balanceSubmissionPageTitle,
  isManagerRole,
  type BalanceSubmissionAccountKey,
  type RawBalanceSubmission,
  type ValidatedBalanceSubmission,
  validateBalanceSubmission
} from './balance-submission.logic';

const PROCESSING_LEASE_MS = 10 * 60 * 1000;

type SubmissionStatus = 'pending' | 'processing' | 'partial' | 'failed' | 'succeeded';

type SubmissionRecord = {
  id: number;
  submissionKey: string;
  observedAt: Date;
  kbankBalance: number;
  safeBalance: number;
  notes: string | null;
  status: SubmissionStatus;
  kbankNotionPageId: string | null;
  safeNotionPageId: string | null;
  lastError: string | null;
  updatedAt: Date;
};

type SubmissionStore = {
  claim(input: ValidatedBalanceSubmission): Promise<
    | { kind: 'claimed'; record: SubmissionRecord }
    | { kind: 'duplicate'; record: SubmissionRecord }
    | { kind: 'in_progress'; record: SubmissionRecord }
  >;
  markPage(recordId: number, account: BalanceSubmissionAccountKey, pageId: string): Promise<void>;
  finish(recordId: number): Promise<void>;
  fail(recordId: number, message: string): Promise<void>;
};

type NotionWriter = {
  findPage(submissionKey: string, account: BalanceSubmissionAccountKey): Promise<{ id: string; url?: string | null } | null>;
  createPage(input: ValidatedBalanceSubmission, account: BalanceSubmissionAccountKey): Promise<{ id: string; url?: string | null }>;
};

export class BalanceSubmissionAuthorizationError extends Error {
  status = 403;

  constructor() {
    super('Manager authorization is required.');
    this.name = 'BalanceSubmissionAuthorizationError';
  }
}

export class BalanceSubmissionConflictError extends Error {
  status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'BalanceSubmissionConflictError';
  }
}

const toRecord = (row: typeof balanceSubmissionRecords.$inferSelect): SubmissionRecord => ({
  id: row.id,
  submissionKey: row.submissionKey,
  observedAt: row.observedAt,
  kbankBalance: row.kbankBalance,
  safeBalance: row.safeBalance,
  notes: row.notes,
  status: row.status as SubmissionStatus,
  kbankNotionPageId: row.kbankNotionPageId,
  safeNotionPageId: row.safeNotionPageId,
  lastError: row.lastError,
  updatedAt: row.updatedAt
});

const inputMatchesRecord = (input: ValidatedBalanceSubmission, record: SubmissionRecord) =>
  record.observedAt.getTime() === new Date(input.observedAt).getTime() &&
  record.kbankBalance === input.kbankBalance &&
  record.safeBalance === input.safeBalance &&
  record.notes === input.notes;

const createSubmissionStore = (): SubmissionStore => ({
  async claim(input) {
    await db
      .insert(balanceSubmissionRecords)
      .values({
        submissionKey: input.submissionKey,
        observedAt: new Date(input.observedAt),
        kbankBalance: input.kbankBalance,
        safeBalance: input.safeBalance,
        notes: input.notes,
        status: 'pending'
      })
      .onConflictDoNothing({ target: balanceSubmissionRecords.submissionKey });

    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(balanceSubmissionRecords)
        .where(eq(balanceSubmissionRecords.submissionKey, input.submissionKey))
        .for('update')
        .limit(1);
      if (!row) throw new Error('Could not create or load the balance submission record.');

      const record = toRecord(row);
      if (!inputMatchesRecord(input, record)) {
        throw new BalanceSubmissionConflictError('This submission key is already used for different balances. Refresh the form before submitting again.');
      }
      if (record.status === 'succeeded') return { kind: 'duplicate' as const, record };
      if (record.status === 'processing' && Date.now() - record.updatedAt.getTime() < PROCESSING_LEASE_MS) {
        return { kind: 'in_progress' as const, record };
      }

      const [claimed] = await tx
        .update(balanceSubmissionRecords)
        .set({ status: 'processing', lastError: null, updatedAt: new Date() })
        .where(eq(balanceSubmissionRecords.id, record.id))
        .returning();
      if (!claimed) throw new Error('Could not claim the balance submission record.');
      return { kind: 'claimed' as const, record: toRecord(claimed) };
    });
  },

  async markPage(recordId, account, pageId) {
    await db
      .update(balanceSubmissionRecords)
      .set({
        ...(account === 'kbank' ? { kbankNotionPageId: pageId } : { safeNotionPageId: pageId }),
        updatedAt: new Date()
      })
      .where(eq(balanceSubmissionRecords.id, recordId));
  },

  async finish(recordId) {
    await db
      .update(balanceSubmissionRecords)
      .set({ status: 'succeeded', lastError: null, updatedAt: new Date() })
      .where(eq(balanceSubmissionRecords.id, recordId));
  },

  async fail(recordId, message) {
    const [row] = await db
      .select({ kbankNotionPageId: balanceSubmissionRecords.kbankNotionPageId, safeNotionPageId: balanceSubmissionRecords.safeNotionPageId })
      .from(balanceSubmissionRecords)
      .where(eq(balanceSubmissionRecords.id, recordId))
      .limit(1);
    await db
      .update(balanceSubmissionRecords)
      .set({
        status: row?.kbankNotionPageId || row?.safeNotionPageId ? 'partial' : 'failed',
        lastError: message.slice(0, 500),
        updatedAt: new Date()
      })
      .where(eq(balanceSubmissionRecords.id, recordId));
  }
});

const getNotionSecret = () => env.NOTION_API_KEY?.trim();
const notionPageUrl = (id: string, url?: string | null) => url || `https://www.notion.so/${id.replaceAll('-', '')}`;

const createNotionWriter = (): NotionWriter => {
  const notionSecret = getNotionSecret();
  if (!notionSecret) throw new Error('NOTION_API_KEY is not configured.');
  const snapshots = new BalanceSnapshotsDatabase({ notionSecret });

  return {
    async findPage(submissionKey, account) {
      const response = await snapshots.query({
        page_size: 5,
        filter: { name: { equals: balanceSubmissionPageTitle(submissionKey, account) } }
      });
      if (response.results.length > 1) {
        throw new BalanceSubmissionConflictError(`More than one Notion snapshot exists for ${account}. Review the duplicate pages before retrying.`);
      }
      const page = response.results[0];
      return page ? { id: page.id, url: page.url } : null;
    },

    async createPage(input, account) {
      const accountName = account === 'kbank' ? 'KBank' : 'Safe / Cash on hand';
      const balance = account === 'kbank' ? input.kbankBalance : input.safeBalance;
      const note = [
        `Submitted by manager form. Submission key: ${input.submissionKey}`,
        input.notes ? `Manager notes: ${input.notes}` : null
      ].filter(Boolean).join('\n');
      const response = await snapshots.createPage(new BalanceSnapshotsPatchDTO({
        properties: {
          name: balanceSubmissionPageTitle(input.submissionKey, account),
          account: accountName,
          observedAt: { start: input.observedAt },
          balanceThb: balance,
          snapshotRole: 'Observed',
          source: 'Manual',
          status: { name: 'Needs Review' },
          notes: note
        }
      }));
      return { id: response.id, url: notionPageUrl(response.id, response.url) };
    }
  };
};

const getPageId = async (
  input: ValidatedBalanceSubmission,
  record: SubmissionRecord,
  account: BalanceSubmissionAccountKey,
  notion: NotionWriter,
  store: SubmissionStore
) => {
  const storedPageId = account === 'kbank' ? record.kbankNotionPageId : record.safeNotionPageId;
  const page = storedPageId ? { id: storedPageId } : await notion.findPage(input.submissionKey, account) ?? await notion.createPage(input, account);
  await store.markPage(record.id, account, page.id);
  return page.id;
};

export type BalanceSubmissionResult =
  | { status: 'submitted'; submissionKey: string; pageIds: Record<BalanceSubmissionAccountKey, string> }
  | { status: 'duplicate'; submissionKey: string; pageIds: Record<BalanceSubmissionAccountKey, string> }
  | { status: 'in_progress'; submissionKey: string };

export const submitManagerBalanceSubmission = async (
  role: string | undefined | null,
  rawInput: RawBalanceSubmission,
  dependencies: { store?: SubmissionStore; notion?: NotionWriter } = {}
): Promise<BalanceSubmissionResult> => {
  if (!isManagerRole(role)) throw new BalanceSubmissionAuthorizationError();
  const validation = validateBalanceSubmission(rawInput);
  if (!validation.ok) {
    const error = new Error('Correct the highlighted balance form fields.');
    (error as Error & { fieldErrors?: Record<string, string> }).fieldErrors = validation.fieldErrors;
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const input = validation.value;
  const store = dependencies.store ?? createSubmissionStore();
  const notion = dependencies.notion ?? createNotionWriter();
  const claim = await store.claim(input);
  if (claim.kind === 'duplicate') {
    return {
      status: 'duplicate',
      submissionKey: input.submissionKey,
      pageIds: { kbank: claim.record.kbankNotionPageId!, safe_cash: claim.record.safeNotionPageId! }
    };
  }
  if (claim.kind === 'in_progress') return { status: 'in_progress', submissionKey: input.submissionKey };

  try {
    const pageIds = {
      kbank: await getPageId(input, claim.record, 'kbank', notion, store),
      safe_cash: await getPageId(input, claim.record, 'safe_cash', notion, store)
    };
    await store.finish(claim.record.id);
    return { status: 'submitted', submissionKey: input.submissionKey, pageIds };
  } catch (error) {
    await store.fail(claim.record.id, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const createDefaultBalanceSubmissionDependencies = () => ({
  store: createSubmissionStore(),
  notion: createNotionWriter()
});
