<script lang="ts">
  import { Banknote, ExternalLink, Scale } from 'lucide-svelte';

  type Variant = 'overview' | 'detail';

  let { data, loading = false, error = null, variant = 'overview' }: { data?: any; loading?: boolean; error?: string | null; variant?: Variant } = $props();

  const money = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0
  });

  const formatMoney = (value: number | null | undefined) => (value === null ? '—' : money.format(value ?? 0));
  const formatDateTime = (value: string | undefined) =>
    value
      ? new Intl.DateTimeFormat('en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Bangkok'
        }).format(new Date(value))
      : '—';

  const ageLabel = (hours: number | undefined) => {
    if (hours === undefined) return 'unknown age';
    if (hours < 24) return `${hours}h old`;
    return `${Math.round(hours / 24)}d old`;
  };

  const reconciliationStatusClass = (status: string | undefined) => {
    if (status === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    if (status === 'attention' || status === 'setup_required') return 'border-red-200 bg-red-50 text-red-900';
    return 'border-amber-200 bg-amber-50 text-amber-900';
  };

  const openLinkClass =
    'inline-flex items-center gap-1.5 rounded-full border border-[#dfd2c5] bg-white px-3 py-1.5 text-xs font-bold text-[#7a6550] transition hover:border-[#7a6550] hover:text-[#2c2925]';

  const actualFor = (accountKey: string) => data?.actual?.snapshots?.find((snapshot: any) => snapshot.accountKey === accountKey);
</script>

<section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm" id="balance-reconciliation">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="flex gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]">
        <Scale size={20} />
      </span>
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">{variant === 'overview' ? '2. Balance' : 'Finance control'}</p>
        <h2 class="mt-1 text-2xl font-bold tracking-tight">Balance reconciliation</h2>
        <p class="mt-1 text-sm text-[#7a6550]">
          {variant === 'overview'
            ? 'Expected KBank + safe cash vs latest snapshots. Loyverse moves cash to the safe and scan/card to KBank automatically — no ledger row for daily register→safe.'
            : 'Full breakdown: baselines, Loyverse receipts, Company Ledger movements, and what to enter in Notion.'}
        </p>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      {#if variant === 'overview'}
        <a class={openLinkClass} href="/mgmt-dashboard/reconciliation">Details</a>
      {/if}
      {#if data?.links?.balanceSnapshots}
        <a class={openLinkClass} href={data.links.balanceSnapshots} target="_blank" rel="noreferrer">
          Open snapshots <ExternalLink size={13} />
        </a>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Balance reconciliation could not be loaded: {error}
    </div>
  {:else if loading}
    <div class="mt-5 grid gap-4 lg:grid-cols-3">
      {#each Array(3) as _, i (i)}
        <div class="h-36 animate-pulse rounded-2xl bg-[#fffaf4]"></div>
      {/each}
    </div>
  {:else}
    {#if data?.error}
      <div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Balance reconciliation warning: {data.error}
      </div>
    {/if}

    {#if !data?.setup?.hasOpeningBalances}
      <div class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p class="font-bold">Setup required — expected balances are not reliable yet.</p>
        <p class="mt-2">
          Add one <strong>Accepted Baseline</strong> snapshot per missing account in Notion Balance Snapshots
          ({data?.setup?.missingOpeningAccounts?.join(', ') || 'opening balances'}). Each needs
          <strong>Snapshot Role = Accepted Baseline</strong> and <strong>Status = Accepted</strong>.
        </p>
        <p class="mt-2">
          KBank baseline exists (฿600k). Still needed: <strong>Safe / Cash on hand</strong> — count everything in the
          safe (daily bags + backup/change bag) at the baseline date.
        </p>
      </div>
    {/if}

    {#if variant === 'overview'}
      <details class="mt-5 rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
        <summary class="cursor-pointer text-sm font-bold text-[#2c2925]">What to record where (daily rhythm)</summary>
        <div class="mt-3 space-y-3 text-sm text-[#7a6550]">
          <p>
            <strong class="text-[#2c2925]">No ledger row for register→safe.</strong> End-of-day cash goes into the safe
            bag automatically via Loyverse cash sales. Only record ledger rows for expenses and weekly safe→bank deposits.
          </p>
          <ul class="list-disc space-y-1 pl-5">
            <li><strong>Company Ledger (daily):</strong> Register Expense for cash, Scan Expense for scan/QR vendor payments, backup-cash expenses.</li>
            <li><strong>Company Ledger (weekly):</strong> safe→bank deposit with “cash deposit” or “safe deposit” in description.</li>
            <li><strong>Balance Snapshots (Observed):</strong> KBiz balance and safe cash count after close — for comparison only.</li>
            <li><strong>Balance Snapshots (Accepted Baseline):</strong> reviewed cutover anchors only — not every daily count.</li>
          </ul>
          <p class="text-xs text-[#7a6550]/80">
            Scan/card sales settle to KBank same day via Loyverse — they increase expected KBank directly, not a pending clearing bucket.
          </p>
        </div>
      </details>
    {/if}

    <div class="mt-5 grid gap-4 lg:grid-cols-3">
      <article class="rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
        <p class="flex items-center gap-2 text-sm font-bold text-[#2c2925]"><Banknote size={16} /> Expected bank + safe</p>
        <p class="mt-3 text-3xl font-bold tracking-tight tabular-nums">{formatMoney(data?.expected?.totalCashAndBankThb)}</p>
        <p class="mt-2 text-xs text-[#7a6550]/75">Accepted baseline + Loyverse receipts + Company Ledger.</p>
      </article>

      <article class="rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
        <p class="text-sm font-bold text-[#2c2925]">Latest observed</p>
        <p class="mt-3 text-3xl font-bold tracking-tight tabular-nums">{formatMoney(data?.actual?.comparableTotalThb)}</p>
        <p class="mt-2 text-xs text-[#7a6550]/75">
          {data?.actual?.missingAccounts?.length ? `Missing ${data.actual.missingAccounts.join(', ')}` : 'Comparable snapshots available'}.
        </p>
      </article>

      <article class={`rounded-2xl border p-4 ${reconciliationStatusClass(data?.difference?.status)}`}>
        <p class="text-sm font-bold">Difference: actual − expected</p>
        <p class="mt-3 text-3xl font-bold tracking-tight tabular-nums">{formatMoney(data?.difference?.totalThb)}</p>
        <p class="mt-2 text-xs capitalize opacity-80">{data?.difference?.status?.replace('_', ' ') ?? 'unknown'}</p>
      </article>
    </div>

    <div class="mt-5 rounded-2xl border border-[#eadfd3] p-4">
      <h3 class="text-sm font-bold text-[#2c2925]">KBank &amp; safe</h3>
      <div class="mt-3 overflow-x-auto">
        <table class="w-full min-w-[680px] text-left text-sm">
          <thead class="text-xs uppercase tracking-[0.14em] text-[#7a6550]/65">
            <tr>
              <th class="py-2 pr-3">Account</th>
              {#if variant === 'detail'}
                <th class="px-3 py-2 text-right">Baseline</th>
                <th class="px-3 py-2 text-right">Movement</th>
              {/if}
              <th class="px-3 py-2 text-right">Expected</th>
              <th class="px-3 py-2 text-right">Latest snapshot</th>
              <th class="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eadfd3]">
            {#each data?.expected?.accounts ?? [] as account (account.key)}
              {@const snapshot = actualFor(account.key)}
              <tr>
                <td class="py-3 pr-3">
                  <p class="font-semibold text-[#2c2925]">{account.name}</p>
                  <p class="text-xs text-[#7a6550]/70 capitalize">{account.kind}</p>
                </td>
                {#if variant === 'detail'}
                  <td class="px-3 py-3 text-right tabular-nums">{formatMoney(account.openingBalanceThb)}</td>
                  <td class="px-3 py-3 text-right tabular-nums">{formatMoney(account.movementTotalThb)}</td>
                {/if}
                <td class="px-3 py-3 text-right font-bold tabular-nums">{formatMoney(account.expectedThb)}</td>
                <td class="px-3 py-3 text-right tabular-nums">{formatMoney(snapshot?.balanceThb ?? null)}</td>
                <td class="px-3 py-3 text-xs text-[#7a6550]">
                  {#if snapshot}
                    <span class={snapshot.stale ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>{snapshot.stale ? 'stale' : 'fresh'}</span>
                    <span class="block">{formatDateTime(snapshot.observedAt)} · {ageLabel(snapshot.ageHours)}</span>
                    {#if variant === 'detail' && snapshot.url}
                      <a href={snapshot.url} target="_blank" rel="noreferrer" class="mt-1 inline-flex items-center gap-1 font-bold text-[#7a6550] hover:text-[#2c2925]">
                        Open in Notion <ExternalLink size={11} />
                      </a>
                    {/if}
                  {:else}
                    <span class="font-bold text-red-700">missing snapshot</span>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr><td class="py-3 text-[#7a6550]" colspan={variant === 'detail' ? 6 : 4}>No accepted baseline snapshots yet.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    {#if variant === 'detail'}
      <div class="mt-5 grid gap-4 lg:grid-cols-2">
        <div class="rounded-2xl border border-[#eadfd3] p-4">
          <h3 class="text-sm font-bold text-[#2c2925]">Settlement model</h3>
          <p class="mt-2 text-sm text-[#7a6550]">
            Loyverse scan/QR and card payments increase expected KBank on the sale date because KBank receives them the
            same business day. Card processing fees (if bank deposit is net of fees) should be recorded as KBank expenses
            in Company Ledger.
          </p>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl bg-[#fffaf4] p-3">
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-[#7a6550]/65">Scan / QR expected in KBank</p>
              <p class="mt-2 text-xs text-[#7a6550]/75">Included in KBank expected balance above, not a separate pending bucket.</p>
            </div>
            <div class="rounded-xl bg-[#fffaf4] p-3">
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-[#7a6550]/65">Credit card expected in KBank</p>
              <p class="mt-2 text-xs text-[#7a6550]/75">Same-day settlement. Record card fees as expenses if KBiz shows net deposits.</p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-[#eadfd3] p-4">
          <h3 class="text-sm font-bold text-[#2c2925]">Recent ledger movements</h3>
          <div class="mt-3 space-y-2">
            {#each data?.recent?.unreconciledLedgerItems ?? [] as item (item.url || item.date + item.title)}
              <a href={item.url} target="_blank" rel="noreferrer" class="flex justify-between gap-3 rounded-xl bg-[#fffaf4] p-3 text-sm transition hover:bg-[#efe6dc]">
                <span>
                  <span class="font-semibold text-[#2c2925]">{item.title}</span>
                  <span class="mt-1 block text-xs text-[#7a6550]/75">{formatDateTime(item.date)}</span>
                </span>
                <span class="font-bold tabular-nums">{formatMoney(item.amountThb)}</span>
              </a>
            {:else}
              <p class="text-sm text-[#7a6550]">No recent ledger movements after the accepted baselines.</p>
            {/each}
          </div>
        </div>
      </div>

      <details class="mt-5 rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
        <summary class="cursor-pointer text-sm font-bold text-[#2c2925]">How this reconciliation works</summary>
        <div class="mt-3 space-y-4 text-sm text-[#7a6550]">
          <section>
            <h4 class="font-bold text-[#2c2925]">Real-world flow → code behavior</h4>
            <ol class="mt-2 list-decimal space-y-2 pl-5">
              <li><strong>Loyverse sales daily</strong> — receipt payments after baseline date move expected balances automatically.</li>
              <li><strong>Scan/card → KBank same day</strong> — non-cash Loyverse payments increase expected KBank (not a clearing bucket).</li>
              <li><strong>Cash → safe daily</strong> — cash sales increase Safe / Cash on hand. Register→safe bag needs no ledger row.</li>
              <li><strong>Cash expenses from today’s bag</strong> — Type = Register Expense, Payment Method = Cash, positive amount.</li>
              <li><strong>Weekly safe→bank deposit</strong> — one ledger row with “cash deposit” or “safe deposit” in text; moves safe down, KBank up.</li>
              <li><strong>Scan/QR vendor expenses</strong> — Type = Scan Expense, Payment Method = Scan or Wire Transfer, Bank Account = KBank.</li>
              <li><strong>Backup cash in safe</strong> — Register Expense when used; safe expected balance drops.</li>
            </ol>
          </section>

          <section>
            <h4 class="font-bold text-[#2c2925]">Company Ledger conventions</h4>
            <ul class="mt-2 list-disc space-y-1 pl-5">
              <li>Always enter <strong>positive</strong> amounts in Amount (THB).</li>
              <li><strong>Type = Register Expense</strong> for cash expenses at close shift; <strong>Type = Scan Expense</strong> for scan/QR vendor payments; <strong>Type = Refund</strong> for manual customer refunds (POS refunds come from Loyverse).</li>
              <li><strong>Vendor money back</strong> — income type (not Revenue category, e.g. Miscellaneous).</li>
              <li>Do <strong>not</strong> create daily safe-deposit ledger rows — only weekly safe→bank transfers.</li>
              <li>Safe deposit text keywords: “cash deposit” or “safe deposit” in description, notes, or reference.</li>
            </ul>
          </section>

          <section>
            <h4 class="font-bold text-[#2c2925]">Balance Snapshots — what goes where</h4>
            <ul class="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Accepted Baseline + Accepted</strong> — starting anchor per account (KBank + Safe required). Clears setup_required.</li>
              <li><strong>Observed</strong> — KBiz balance and physical safe count after close. Used for “Latest observed” comparison.</li>
              <li>Do not put snapshot balances into Company Ledger.</li>
            </ul>
          </section>

          <section>
            <h4 class="font-bold text-[#2c2925]">Weekly operating rhythm</h4>
            <ul class="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Daily close:</strong> enter cash + scan expenses in Company Ledger; add Observed snapshots for KBank and safe if checking difference.</li>
              <li><strong>Weekly:</strong> deposit safe cash to KBank (leave backup/change in safe); record one safe-deposit ledger row; refresh Observed snapshots.</li>
              <li><strong>When difference &gt; ฿20:</strong> look for missing expenses, card fees, or stale/missing snapshots before changing baselines.</li>
            </ul>
          </section>
        </div>
      </details>
    {/if}
  {/if}
</section>
