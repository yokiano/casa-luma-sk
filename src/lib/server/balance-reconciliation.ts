import { env } from '$env/dynamic/private';
import { Client } from '@notionhq/client';
import { sql } from 'drizzle-orm';
import { CompanyLedgerDatabase } from '$lib/notion-sdk/dbs/company-ledger/db';
import { CompanyLedgerResponseDTO } from '$lib/notion-sdk/dbs/company-ledger/response.dto';
import { db } from '$lib/server/db/client';
import {
  RECONCILIATION_ACCOUNTS,
  STALE_HOURS_BY_KIND,
  accountByKey,
  accountKeyFromPayment,
  buildExpectedAccounts,
  deriveReconciliationStatus,
  isCashOrBank,
  isDashboardReviewAccount,
  isRequiredBaselineAccount,
  latestByAccount,
  ledgerMovementsFromRecord,
  movementsAfterBaseline,
  roundThb,
  sumComparableExpected,
  type AccountKey,
  type Movement
} from '$lib/server/balance-reconciliation.logic';

const BALANCE_SNAPSHOTS_DATABASE_ID = 'bb838f91-3dee-433c-92a9-b239ae86709c';
const BALANCE_SNAPSHOTS_DATA_SOURCE_ID = 'b2c68e85-3b34-4ea0-b5dc-c143bdeb4613';

type SnapshotRole = 'Observed' | 'Accepted Baseline' | string;

type Snapshot = {
  id: string;
  accountKey: AccountKey;
  accountName: string;
  observedAt: string;
  balanceThb: number;
  role: SnapshotRole | null;
  status: string | null;
  source: string | null;
  url: string;
};

const parseNumber = (value: unknown) => Number(value ?? 0);
const getNotionSecret = () => env.NOTION_API_KEY?.trim();

const rowsOf = async <T>(statement: ReturnType<typeof sql>): Promise<T[]> => {
  const result = await db.execute(statement);
  return result as unknown as T[];
};

const selectName = (value: { name?: string } | null | undefined) => value?.name?.trim() ?? '';

const accountKeyFromNotionName = (value: string | null | undefined): AccountKey | null => {
  if (!value) return null;
  const account = RECONCILIATION_ACCOUNTS.find(
    (entry) =>
      entry.notionName.toLowerCase() === value.trim().toLowerCase() ||
      entry.aliases.some((alias) => alias.toLowerCase() === value.trim().toLowerCase())
  );
  return account?.key ?? null;
};

const snapshotFromPage = (page: any): Snapshot | null => {
  const properties = page.properties ?? {};
  const accountName = properties.Account?.select?.name;
  const accountKey = accountKeyFromNotionName(accountName);
  const observedAt = properties['Observed At']?.date?.start;
  const balanceThb = properties['Balance THB']?.number;

  if (!accountKey || !observedAt || typeof balanceThb !== 'number') return null;

  return {
    id: page.id,
    accountKey,
    accountName: accountByKey.get(accountKey)?.name ?? accountName,
    observedAt,
    balanceThb,
    role: properties['Snapshot Role']?.select?.name ?? null,
    status: properties.Status?.status?.name ?? properties.Status?.select?.name ?? null,
    source: properties.Source?.select?.name ?? null,
    url: page.url
  };
};

const loadSnapshots = async (notionSecret: string): Promise<Snapshot[]> => {
  const notion = new Client({ auth: notionSecret });
  const snapshots: Snapshot[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: BALANCE_SNAPSHOTS_DATA_SOURCE_ID,
      page_size: 100,
      start_cursor: cursor,
      sorts: [{ property: 'Observed At', direction: 'descending' }]
    });

    for (const page of response.results) {
      const snapshot = snapshotFromPage(page);
      if (snapshot) snapshots.push(snapshot);
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return snapshots;
};

const loadLedgerMovements = async (notionSecret: string, earliestBaseline: string, asOf: Date): Promise<Movement[]> => {
  const ledgerDb = new CompanyLedgerDatabase({ notionSecret });
  const movements: Movement[] = [];
  let cursor: string | undefined;

  do {
    const response = await ledgerDb.query({
      page_size: 100,
      start_cursor: cursor,
      filter: {
        and: [{ date: { after: earliestBaseline } }, { date: { on_or_before: asOf.toISOString() } }]
      },
      sorts: [{ property: 'date', direction: 'ascending' }]
    } as any);

    for (const result of response.results) {
      const item = new CompanyLedgerResponseDTO(result as any);
      movements.push(
        ...ledgerMovementsFromRecord({
          id: item.id,
          amountThb: item.properties.amountThb ?? 0,
          type: selectName(item.properties.type),
          status: selectName(item.properties.status),
          category: selectName(item.properties.category),
          bankAccount: selectName(item.properties.bankAccount),
          paymentMethod: selectName(item.properties.paymentMethod),
          description: item.properties.description.text,
          notes: item.properties.notes.text,
          referenceNumber: item.properties.referenceNumber.text,
          date: item.properties.date?.start ?? '',
          url: item.url
        })
      );
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return movements;
};

const loadReceiptMovements = async (earliestBaseline: string, asOf: Date): Promise<Movement[]> => {
  const rows = await rowsOf<{
    receipt_key: string;
    receipt_number: string | null;
    receipt_type: string | null;
    occurred_at: string | Date | null;
    payment_type: string | null;
    payment_name: string | null;
    amount_thb: string | number | null;
  }>(sql`
    select
      r.receipt_key,
      r.receipt_number,
      r.receipt_type,
      coalesce(p.paid_at, r.created_at, r.receipt_date)::text as occurred_at,
      p.type as payment_type,
      p.name as payment_name,
      (case when r.receipt_type = 'REFUND' then -abs(coalesce(p.money_amount, 0)) else coalesce(p.money_amount, 0) end)::text as amount_thb
    from receipt_payments p
    join receipts r on r.receipt_key = p.receipt_key
    where coalesce(p.paid_at, r.created_at, r.receipt_date) > ${earliestBaseline}::timestamptz
      and coalesce(p.paid_at, r.created_at, r.receipt_date) <= ${asOf.toISOString()}::timestamptz
      and r.cancelled_at is null
  `);

  return rows
    .map((row, index) => ({
      occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at),
      accountKey: accountKeyFromPayment(row.payment_type, row.payment_name),
      amountThb: parseNumber(row.amount_thb),
      source: 'loyverse_receipt' as const,
      sourceId: `${row.receipt_key}:${index}`,
      description: `Receipt ${row.receipt_number ?? row.receipt_key} · ${row.payment_name ?? row.payment_type ?? 'Payment'}`
    }))
    .filter((movement) => movement.occurredAt && movement.amountThb);
};

export const getBalanceReconciliationSummary = async ({ asOf = new Date() }: { asOf?: Date } = {}) => {
  const notionSecret = getNotionSecret();
  const requiredBaselineAccounts = RECONCILIATION_ACCOUNTS.filter(isRequiredBaselineAccount);

  if (!notionSecret) {
    return {
      asOf: asOf.toISOString(),
      setup: { hasOpeningBalances: false, missingOpeningAccounts: requiredBaselineAccounts.map((account) => account.name) },
      expected: { totalCashAndBankThb: 0, accounts: [] },
      actual: { comparableTotalThb: null, snapshots: [], missingAccounts: requiredBaselineAccounts.map((account) => account.name) },
      difference: { totalThb: null, explainedThb: 0, unexplainedThb: null, status: 'setup_required' as const },
      recent: { unreconciledLedgerItems: [] },
      links: { balanceSnapshots: `https://www.notion.so/${BALANCE_SNAPSHOTS_DATABASE_ID.replace(/-/g, '')}` },
      error: 'NOTION_API_KEY is not configured.'
    };
  }

  try {
    const snapshots = await loadSnapshots(notionSecret);
    const acceptedBaselines = latestByAccount(
      snapshots.filter((snapshot) => snapshot.role === 'Accepted Baseline' && snapshot.status === 'Accepted')
    );
    const missingOpeningAccounts = requiredBaselineAccounts
      .filter((account) => !acceptedBaselines.has(account.key))
      .map((account) => account.name);
    const hasOpeningBalances = missingOpeningAccounts.length === 0;
    const earliestBaseline = Array.from(acceptedBaselines.values()).sort((a, b) => a.observedAt.localeCompare(b.observedAt))[0]?.observedAt;

    if (!earliestBaseline) {
      return {
        asOf: asOf.toISOString(),
        setup: { hasOpeningBalances: false, missingOpeningAccounts },
        expected: { totalCashAndBankThb: 0, accounts: [] },
        actual: {
          comparableTotalThb: null,
          snapshots: snapshots
            .filter((snapshot) => isDashboardReviewAccount(snapshot.accountKey))
            .map((snapshot) => ({
            accountKey: snapshot.accountKey,
            accountName: snapshot.accountName,
            balanceThb: snapshot.balanceThb,
            observedAt: snapshot.observedAt,
            ageHours: Math.max(0, Math.round((asOf.getTime() - new Date(snapshot.observedAt).getTime()) / 3600000)),
            source: snapshot.source ?? 'Manual',
            stale: true,
            url: snapshot.url
          })),
          missingAccounts: requiredBaselineAccounts.map((account) => account.name)
        },
        difference: { totalThb: null, explainedThb: 0, unexplainedThb: null, status: 'setup_required' as const },
        recent: { unreconciledLedgerItems: [] },
        links: { balanceSnapshots: `https://www.notion.so/${BALANCE_SNAPSHOTS_DATABASE_ID.replace(/-/g, '')}` },
        error: null
      };
    }

    const [ledgerMovements, receiptMovements] = await Promise.all([
      loadLedgerMovements(notionSecret, earliestBaseline, asOf),
      loadReceiptMovements(earliestBaseline, asOf)
    ]);
    const allMovements = movementsAfterBaseline([...ledgerMovements, ...receiptMovements], acceptedBaselines);
    const expectedAccounts = buildExpectedAccounts(acceptedBaselines, allMovements);

    const latestSnapshots = latestByAccount(
      snapshots.filter((snapshot) => snapshot.status !== 'Draft' && snapshot.status !== 'Superseded')
    );
    const actualSnapshots = Array.from(latestSnapshots.values())
      .sort((a, b) => (accountByKey.get(a.accountKey)?.displayOrder ?? 999) - (accountByKey.get(b.accountKey)?.displayOrder ?? 999))
      .map((snapshot) => {
        const account = accountByKey.get(snapshot.accountKey)!;
        const ageHours = Math.max(0, Math.round((asOf.getTime() - new Date(snapshot.observedAt).getTime()) / 3600000));
        return {
          accountKey: snapshot.accountKey,
          accountName: snapshot.accountName,
          balanceThb: roundThb(snapshot.balanceThb),
          observedAt: snapshot.observedAt,
          ageHours,
          source: snapshot.source ?? 'Manual',
          stale: ageHours > STALE_HOURS_BY_KIND[account.kind],
          url: snapshot.url
        };
      });

    const comparableExpectedAccounts = expectedAccounts.filter((account) => isCashOrBank(account.kind));
    const comparableActualSnapshots = actualSnapshots.filter((snapshot) =>
      isCashOrBank(accountByKey.get(snapshot.accountKey)?.kind ?? 'clearing')
    );
    const actualAccountKeys = new Set(comparableActualSnapshots.map((snapshot) => snapshot.accountKey));
    const missingActualAccounts = requiredBaselineAccounts
      .filter((account) => !actualAccountKeys.has(account.key))
      .map((account) => account.name);
    const comparableTotalThb = missingActualAccounts.length
      ? null
      : roundThb(comparableActualSnapshots.reduce((sum, snapshot) => sum + snapshot.balanceThb, 0));
    const expectedComparableTotal = sumComparableExpected(expectedAccounts);
    const differenceTotalThb = comparableTotalThb === null ? null : roundThb(comparableTotalThb - expectedComparableTotal);
    const hasStaleSnapshots = comparableActualSnapshots.some((snapshot) => snapshot.stale);
    const status = deriveReconciliationStatus({ hasOpeningBalances, hasStaleSnapshots, differenceTotalThb });

    const reviewAccounts = expectedAccounts.filter((account) => isDashboardReviewAccount(account.key));
    const reviewSnapshots = actualSnapshots.filter((snapshot) => isDashboardReviewAccount(snapshot.accountKey));

    return {
      asOf: asOf.toISOString(),
      setup: { hasOpeningBalances, missingOpeningAccounts },
      expected: {
        totalCashAndBankThb: expectedComparableTotal,
        accounts: reviewAccounts
      },
      actual: { comparableTotalThb, snapshots: reviewSnapshots, missingAccounts: missingActualAccounts },
      difference: {
        totalThb: differenceTotalThb,
        explainedThb: 0,
        unexplainedThb: differenceTotalThb,
        status
      },
      recent: {
        unreconciledLedgerItems: ledgerMovements
          .filter((movement) => !movement.description.toLowerCase().includes('reconciled'))
          .slice(-5)
          .reverse()
          .map((movement) => ({
            title: movement.description,
            date: movement.occurredAt,
            amountThb: roundThb(movement.amountThb),
            url: movement.url ?? ''
          }))
      },
      links: { balanceSnapshots: `https://www.notion.so/${BALANCE_SNAPSHOTS_DATABASE_ID.replace(/-/g, '')}` },
      error: null
    };
  } catch (error) {
    console.error('[balance-reconciliation] failed to load summary:', error);
    return {
      asOf: asOf.toISOString(),
      setup: { hasOpeningBalances: false, missingOpeningAccounts: requiredBaselineAccounts.map((account) => account.name) },
      expected: { totalCashAndBankThb: 0, accounts: [] },
      actual: { comparableTotalThb: null, snapshots: [], missingAccounts: [] },
      difference: { totalThb: null, explainedThb: 0, unexplainedThb: null, status: 'setup_required' as const },
      recent: { unreconciledLedgerItems: [] },
      links: { balanceSnapshots: `https://www.notion.so/${BALANCE_SNAPSHOTS_DATABASE_ID.replace(/-/g, '')}` },
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
