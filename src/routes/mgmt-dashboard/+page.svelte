<script lang="ts">
  import BalanceReconciliationPanel from '$lib/components/mgmt-dashboard/BalanceReconciliationPanel.svelte';
  import { approveLedgerExpense, getBalanceReconciliationDashboard, getDailyMeetingDashboard } from '$lib/mgmt-dashboard.remote';
  import { AlertTriangle, CalendarDays, CheckCircle2, ExternalLink, Gift, ListChecks, NotebookText, ReceiptText, Users } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  const meeting = getDailyMeetingDashboard();
  const reconciliation = getBalanceReconciliationDashboard();

  const money = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0
  });

  const formatMoney = (value: number | null | undefined) => (value === null ? '—' : money.format(value ?? 0));
  const errorMessage = (error: unknown) => (error instanceof Error ? error.message : error ? String(error) : null);


  let approvingExpenseIds = $state(new Set<string>());
  let locallyApprovedExpenseIds = $state(new Set<string>());

  const openLinkClass =
    'inline-flex items-center gap-1.5 rounded-full border border-[#dfd2c5] bg-white px-3 py-1.5 text-xs font-bold text-[#7a6550] transition hover:border-[#7a6550] hover:text-[#2c2925]';

  const isExpenseApproved = (expense: { id: string; owner: string | null }) =>
    Boolean(expense.owner) || locallyApprovedExpenseIds.has(expense.id);

  const expenseApprovedBy = (expense: { id: string; owner: string | null }) =>
    expense.owner ?? (locallyApprovedExpenseIds.has(expense.id) ? 'Yarden' : null);

  async function approveExpense(expense: { id: string; title: string }) {
    approvingExpenseIds = new Set(approvingExpenseIds).add(expense.id);

    try {
      const result = await approveLedgerExpense({ expenseId: expense.id });
      locallyApprovedExpenseIds = new Set(locallyApprovedExpenseIds).add(expense.id);
      toast.success('Expense approved', { description: `${expense.title} approved by ${result.approvedBy}.` });
    } catch (error) {
      toast.error('Failed to approve expense', { description: error instanceof Error ? error.message : String(error) });
    } finally {
      const next = new Set(approvingExpenseIds);
      next.delete(expense.id);
      approvingExpenseIds = next;
    }
  }
</script>

<section class="space-y-6">
  <div>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Daily meeting</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Management dashboard overview</h1>
    <p class="mt-2 max-w-3xl text-sm text-[#7a6550]">
      A meeting-friendly agenda for recent expenses, events, HR, and tasks. Notion remains the source of truth;
      this page gives quick context and external links for deeper review.
    </p>
  </div>

  {#if meeting.error}
    <div class="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      Daily meeting Notion data could not be loaded: {meeting.error}
    </div>
  {/if}

  {#if meeting.loading}
    <div class="h-44 animate-pulse rounded-3xl bg-white/70 shadow-sm"></div>
  {:else}
    {@const daily = meeting.current}

    {#if daily?.error}
      <div class="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Daily meeting Notion data could not be loaded: {daily.error}
      </div>
    {/if}

    <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm" id="expenses">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]">
            <ReceiptText size={20} />
          </span>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">1. Expenses</p>
            <h2 class="mt-1 text-2xl font-bold tracking-tight">Company Ledger</h2>
            <p class="mt-1 text-sm text-[#7a6550]">Ledger records dated {daily?.yesterday} through {daily?.today}.</p>
            <p class="mt-1 text-xs text-[#7a6550]/70">
              Note: approvals are temporarily recorded as Yarden. Once auth is implemented, this should use the logged-in user.
            </p>
          </div>
        </div>
        <a class={openLinkClass} href={daily?.links.companyLedger} target="_blank" rel="noreferrer">
          Open ledger <ExternalLink size={13} />
        </a>
      </div>

      <div class="mt-5 space-y-3">
        {#each daily?.expenses ?? [] as expense}
          <article class="rounded-2xl border p-4 transition {expense.missingFields.length ? 'border-red-300 bg-red-50/80' : 'border-[#eadfd3] bg-[#fffaf4]'}">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <a href={expense.url} target="_blank" rel="noreferrer" class="font-semibold text-[#2c2925] transition hover:text-[#7a6550] hover:underline">
                  {expense.title}
                </a>
                <p class="mt-1 text-xs text-[#7a6550]/75">
                  {expense.date} · {expense.type ?? 'Ledger'} · {expense.department ?? 'No department'} · {expense.category ?? 'No category'}
                </p>
                {#if expense.missingFields.length}
                  <p class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                    <AlertTriangle size={13} /> Missing: {expense.missingFields.join(', ')}
                  </p>
                {/if}
              </div>
              <div class="text-left sm:text-right">
                <p class="font-bold tabular-nums">{formatMoney(expense.amountThb)}</p>
                <p class="mt-1 text-xs text-[#7a6550]/75">{expense.status ?? 'No status'}</p>
                <p class="mt-1 text-xs font-semibold {isExpenseApproved(expense) ? 'text-emerald-700' : 'text-[#7a6550]/75'}">
                  {#if isExpenseApproved(expense)}
                    Approved by {expenseApprovedBy(expense)}
                  {:else}
                    Not approved
                  {/if}
                </p>
                <div class="mt-3 flex justify-start gap-2 sm:justify-end">
                  <a class="inline-flex items-center gap-1.5 rounded-full border border-[#dfd2c5] bg-white px-3 py-1.5 text-xs font-bold text-[#7a6550] transition hover:border-[#7a6550] hover:text-[#2c2925]" href={expense.url} target="_blank" rel="noreferrer">
                    Open <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 {isExpenseApproved(expense) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#7a6550] bg-[#7a6550] text-white hover:bg-[#2c2925]'}"
                    disabled={isExpenseApproved(expense) || approvingExpenseIds.has(expense.id)}
                    onclick={() => approveExpense(expense)}
                    title="Temporarily approves as Yarden until authentication is implemented."
                  >
                    <CheckCircle2 size={13} />
                    {#if approvingExpenseIds.has(expense.id)}
                      Approving…
                    {:else if isExpenseApproved(expense)}
                      Approved
                    {:else}
                      Approve
                    {/if}
                  </button>
                </div>
              </div>
            </div>
          </article>
        {:else}
          <p class="rounded-2xl border border-dashed border-[#dfd2c5] p-4 text-sm text-[#7a6550]">
            No Company Ledger records found for the last two days.
          </p>
        {/each}
      </div>
    </section>
  {/if}

  <BalanceReconciliationPanel data={reconciliation.current} loading={reconciliation.loading} error={errorMessage(reconciliation.error)} />

  {#if meeting.loading}
    <div class="space-y-4">
      {#each Array(3) as _}
        <div class="h-44 animate-pulse rounded-3xl bg-white/70 shadow-sm"></div>
      {/each}
    </div>
  {:else}
    {@const daily = meeting.current}

    <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm" id="events">
      <div class="flex gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]">
          <CalendarDays size={20} />
        </span>
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">3. Events</p>
          <h2 class="mt-1 text-2xl font-bold tracking-tight">Coming soon</h2>
          <p class="mt-1 text-sm text-[#7a6550]">
            Placeholder for the future events UI/database. Use this slot in the meeting to mention today/tomorrow workshops,
            special guests, birthday parties, or operational reminders.
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm" id="hr">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]">
            <Users size={20} />
          </span>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">4. HR</p>
            <h2 class="mt-1 text-2xl font-bold tracking-tight">Salary adjustments & people reminders</h2>
            <p class="mt-1 text-sm text-[#7a6550]">Upcoming salary adjustments and birthdays from Notion.</p>
          </div>
        </div>
        <a class={openLinkClass} href={daily?.links.salaryAdjustments} target="_blank" rel="noreferrer">
          Open salary adjustments <ExternalLink size={13} />
        </a>
      </div>

      <div class="mt-5 grid gap-4 lg:grid-cols-2">
        <div class="rounded-2xl border border-[#eadfd3] p-4">
          <h3 class="flex items-center gap-2 text-sm font-bold text-[#2c2925]"><NotebookText size={16} /> Adjustments</h3>
          <div class="mt-3 space-y-3">
            {#each daily?.salaryAdjustments ?? [] as adjustment}
              <a href={adjustment.url} target="_blank" rel="noreferrer" class="block rounded-2xl bg-[#fffaf4] p-3 transition hover:bg-[#efe6dc]">
                <div class="flex justify-between gap-3">
                  <div>
                    <p class="font-semibold">{adjustment.title}</p>
                    <p class="mt-1 text-xs text-[#7a6550]/75">
                      {adjustment.date} · {adjustment.type ?? 'Adjustment'} · {adjustment.employees.join(', ') || 'No employee'}
                    </p>
                  </div>
                  <p class="shrink-0 font-bold tabular-nums">{formatMoney(adjustment.amountThb)}</p>
                </div>
              </a>
            {:else}
              <p class="text-sm text-[#7a6550]">No upcoming salary adjustments in the next 30 days.</p>
            {/each}
          </div>
        </div>

        <div class="rounded-2xl border border-[#eadfd3] p-4">
          <h3 class="flex items-center gap-2 text-sm font-bold text-[#2c2925]"><Gift size={16} /> Upcoming birthdays</h3>
          <div class="mt-3 space-y-3">
            {#each daily?.birthdays ?? [] as birthday}
              <a href={birthday.url} target="_blank" rel="noreferrer" class="block rounded-2xl bg-[#fffaf4] p-3 transition hover:bg-[#efe6dc]">
                <p class="font-semibold">{birthday.name}</p>
                <p class="mt-1 text-xs text-[#7a6550]/75">{birthday.date} · {birthday.department ?? 'No department'}</p>
              </a>
            {:else}
              <p class="text-sm text-[#7a6550]">No birthdays found in the next 30 days.</p>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm" id="tasks">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]">
            <ListChecks size={20} />
          </span>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">5. Tasks</p>
            <h2 class="mt-1 text-2xl font-bold tracking-tight">Tasks Notion view</h2>
            <p class="mt-1 text-sm text-[#7a6550]">
              Embedded when Notion allows it; use the external link if the frame is blocked by Notion/browser settings.
            </p>
          </div>
        </div>
        <a class={openLinkClass} href={daily?.links.tasks} target="_blank" rel="noreferrer">
          Open tasks view <ExternalLink size={13} />
        </a>
      </div>

      <div class="mt-5 overflow-hidden rounded-2xl border border-[#eadfd3] bg-[#fbf8f4]">
        <iframe
          title="Notion tasks view"
          src={daily?.links.tasks}
          class="h-[600px] w-full bg-white"
          width="100%"
          height="600"
          frameborder="0"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
      <p class="mt-3 text-xs text-[#7a6550]/70">
        Notion often blocks embedding private pages. If this area is blank, open the task view in Notion.
      </p>
    </section>
  {/if}

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm" id="analytics-link">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Analytics moved</p>
        <h2 class="mt-2 text-2xl font-semibold tracking-tight text-[#2c2925]">Receipt and revenue analytics</h2>
        <p class="mt-2 max-w-2xl text-sm text-[#7a6550]">
          Period trends, open-play mix, revenue split, profitability, and legacy receipt analytics now live in the dedicated analytics section.
        </p>
      </div>
      <a class={openLinkClass} href="/mgmt-dashboard/analytics">Open analytics <ExternalLink size={13} /></a>
    </div>
  </section>
</section>
