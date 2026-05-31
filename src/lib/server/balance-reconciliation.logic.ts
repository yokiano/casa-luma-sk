export const RECONCILIATION_ACCOUNTS = [
  { key: 'kbank', name: 'KBank', notionName: 'KBank', aliases: [] as string[], kind: 'bank' as const, displayOrder: 10 },
  { key: 'scb', name: 'SCB', notionName: 'SCB', aliases: [] as string[], kind: 'bank' as const, displayOrder: 20 },
  {
    key: 'safe_cash',
    name: 'Safe / Cash on hand',
    notionName: 'Safe / Cash on hand',
    aliases: ['Cash Register'],
    kind: 'cash' as const,
    displayOrder: 30
  },
  {
    key: 'scan_qr_clearing',
    name: 'Scan/QR Clearing',
    notionName: 'Scan/QR Clearing',
    aliases: [] as string[],
    kind: 'clearing' as const,
    displayOrder: 50
  },
  {
    key: 'credit_card_clearing',
    name: 'Credit Card Clearing',
    notionName: 'Credit Card Clearing',
    aliases: [] as string[],
    kind: 'clearing' as const,
    displayOrder: 60
  }
] as const;

export type ReconciliationAccount = (typeof RECONCILIATION_ACCOUNTS)[number];
export type AccountKey = ReconciliationAccount['key'];
export type AccountKind = ReconciliationAccount['kind'];

export type LedgerRecordInput = {
  id: string;
  amountThb: number;
  type?: string | null;
  status?: string | null;
  category?: string | null;
  bankAccount?: string | null;
  paymentMethod?: string | null;
  description?: string | null;
  notes?: string | null;
  referenceNumber?: string | null;
  date: string;
  url?: string;
};

export type Movement = {
  occurredAt: string;
  accountKey: AccountKey;
  amountThb: number;
  source: 'company_ledger' | 'loyverse_receipt';
  sourceId: string;
  description: string;
  url?: string;
};

export type BaselineSnapshot = {
  accountKey: AccountKey;
  observedAt: string;
  balanceThb: number;
};

export type ExpectedAccount = {
  key: AccountKey;
  name: string;
  kind: AccountKind;
  expectedThb: number;
  openingBalanceThb: number;
  movementTotalThb: number;
};

export const STALE_HOURS_BY_KIND = {
  bank: 7 * 24,
  cash: 36,
  clearing: 7 * 24
} as const;

export const DIFFERENCE_OK_TOLERANCE_THB = 20;

const accountByName = new Map<string, ReconciliationAccount>(
  RECONCILIATION_ACCOUNTS.flatMap((account) =>
    [account.notionName, ...account.aliases].map((name) => [name.toLowerCase(), account] as const)
  )
);

export const accountByKey = new Map<AccountKey, ReconciliationAccount>(
  RECONCILIATION_ACCOUNTS.map((account) => [account.key, account])
);

export const normalize = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

export const roundThb = (value: number) => Math.round(value * 100) / 100;

export const isCashOrBank = (kind: AccountKind) => kind === 'bank' || kind === 'cash';

export const isRequiredBaselineAccount = (account: ReconciliationAccount) =>
  account.key === 'kbank' || account.key === 'safe_cash';

/** Accounts shown in the dashboard review table — KBank + safe only. */
export const isDashboardReviewAccount = (key: AccountKey) => key === 'kbank' || key === 'safe_cash';

export const accountKeyFromNotionName = (value: string | null | undefined): AccountKey | null => {
  if (!value) return null;
  return accountByName.get(value.trim().toLowerCase())?.key ?? null;
};

export const accountKeyFromLedger = (bankAccount?: string | null, paymentMethod?: string | null): AccountKey => {
  const explicit = accountKeyFromNotionName(bankAccount);
  if (explicit) return explicit;

  const method = normalize(paymentMethod);
  if (method.includes('cash')) return 'safe_cash';

  // Casa Luma's scan/QR and card payments settle through KBank, so ledger rows paid by
  // scan/card should reduce KBank unless a specific account is selected explicitly.
  return 'kbank';
};

export const bankAccountKeyFromLedger = (bankAccount?: string | null): AccountKey => {
  const explicit = accountKeyFromNotionName(bankAccount);
  if (explicit && accountByKey.get(explicit)?.kind === 'bank') return explicit;
  return 'kbank';
};

/** Casa Luma scan/card payments settle to KBank the same business day — not a pending clearing bucket. */
export const accountKeyFromPayment = (type?: string | null, name?: string | null): AccountKey => {
  const combined = `${type ?? ''} ${name ?? ''}`.toLowerCase();
  if (combined.includes('cash')) return 'safe_cash';
  return 'kbank';
};

export const isSafeDepositText = (searchableText: string) =>
  searchableText.includes('cash deposit') ||
  searchableText.includes('safe deposit') ||
  searchableText.includes('bank deposit');

export const isBankDepositTransferType = (typeKey: string) => typeKey === 'bank deposit income';

export const isLedgerExpenseType = (typeKey: string) =>
  typeKey === 'expense' || typeKey === 'register expense' || typeKey === 'scan expense';

/** Legacy generic Income rows only — not Bank/Scan/Credit Card Income types. */
export const isLedgerIncomeType = (typeKey: string) => typeKey === 'income';

export const isPosSettlementIncomeType = (typeKey: string) =>
  typeKey === 'scan income' || typeKey === 'credit card income';

export const ledgerMovementsFromRecord = (record: LedgerRecordInput): Movement[] => {
  const amount = record.amountThb ?? 0;
  const type = record.type ?? '';
  const status = record.status ?? '';
  const category = record.category ?? '';
  const date = record.date;

  if (!date || !amount || normalize(status) === 'pending') return [];

  const typeKey = normalize(type);
  const categoryKey = normalize(category);
  const description = record.description?.trim() || type || 'Company Ledger record';
  const searchableText = normalize(
    [description, record.notes, record.referenceNumber, type, category].filter(Boolean).join(' ')
  );

  if (isBankDepositTransferType(typeKey) || isSafeDepositText(searchableText)) {
    const bankAccountKey = bankAccountKeyFromLedger(record.bankAccount);
    const transferAmount = Math.abs(amount);

    return [
      {
        occurredAt: date,
        accountKey: bankAccountKey,
        amountThb: transferAmount,
        source: 'company_ledger',
        sourceId: `${record.id}:bank-side`,
        description: `${description} · bank side`,
        url: record.url
      },
      {
        occurredAt: date,
        accountKey: 'safe_cash',
        amountThb: -transferAmount,
        source: 'company_ledger',
        sourceId: `${record.id}:safe-side`,
        description: `${description} · safe side`,
        url: record.url
      }
    ];
  }

  if (isPosSettlementIncomeType(typeKey)) return [];
  if (isLedgerIncomeType(typeKey) && categoryKey === 'revenue') return [];

  let signedAmount = 0;
  if (isLedgerExpenseType(typeKey) || typeKey === 'owner draw' || typeKey === 'dividend' || typeKey === 'refund') {
    signedAmount = -Math.abs(amount);
  } else if (isLedgerIncomeType(typeKey) || typeKey === 'owner contribution') {
    signedAmount = Math.abs(amount);
  }

  if (!signedAmount) return [];

  return [
    {
      occurredAt: date,
      accountKey: accountKeyFromLedger(record.bankAccount, record.paymentMethod),
      amountThb: signedAmount,
      source: 'company_ledger',
      sourceId: record.id,
      description,
      url: record.url
    }
  ];
};

export const latestByAccount = <T extends { accountKey: AccountKey; observedAt: string }>(rows: T[]) => {
  const latest = new Map<AccountKey, T>();
  for (const row of rows) {
    const current = latest.get(row.accountKey);
    if (!current || row.observedAt > current.observedAt) latest.set(row.accountKey, row);
  }
  return latest;
};

export const movementsAfterBaseline = (
  movements: Movement[],
  baselines: Map<AccountKey, BaselineSnapshot>
) => {
  const fallbackCutoff = Array.from(baselines.values()).sort((a, b) => a.observedAt.localeCompare(b.observedAt))[0]
    ?.observedAt;

  return movements.filter((movement) => {
    const cutoff = baselines.get(movement.accountKey)?.observedAt ?? fallbackCutoff;
    return cutoff && movement.occurredAt > cutoff;
  });
};

export const buildExpectedAccounts = (
  baselines: Map<AccountKey, BaselineSnapshot>,
  movements: Movement[]
): ExpectedAccount[] =>
  RECONCILIATION_ACCOUNTS.map((account) => {
    const baseline = baselines.get(account.key);
    const openingBalanceThb = baseline?.balanceThb ?? 0;
    const movementTotalThb = movements
      .filter((movement) => movement.accountKey === account.key)
      .reduce((sum, movement) => sum + movement.amountThb, 0);

    return {
      key: account.key,
      name: account.name,
      kind: account.kind,
      expectedThb: roundThb(openingBalanceThb + movementTotalThb),
      openingBalanceThb: roundThb(openingBalanceThb),
      movementTotalThb: roundThb(movementTotalThb)
    };
  });

export type ReconciliationStatus = 'ok' | 'stale' | 'attention' | 'setup_required';

export const deriveReconciliationStatus = ({
  hasOpeningBalances,
  hasStaleSnapshots,
  differenceTotalThb
}: {
  hasOpeningBalances: boolean;
  hasStaleSnapshots: boolean;
  differenceTotalThb: number | null;
}): ReconciliationStatus => {
  if (!hasOpeningBalances) return 'setup_required';
  if (hasStaleSnapshots) return 'stale';
  if (differenceTotalThb !== null && Math.abs(differenceTotalThb) > DIFFERENCE_OK_TOLERANCE_THB) return 'attention';
  return 'ok';
};

export const sumComparableExpected = (accounts: ExpectedAccount[]) =>
  roundThb(accounts.filter((account) => isCashOrBank(account.kind)).reduce((sum, account) => sum + account.expectedThb, 0));
