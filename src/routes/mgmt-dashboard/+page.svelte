<script lang="ts">
  import { getDailyMeetingDashboard, getTodayDashboardOverview } from '$lib/mgmt-dashboard.remote';
  import { CalendarDays, ExternalLink, Gift, ListChecks, NotebookText, ReceiptText, Users } from 'lucide-svelte';

  const meeting = getDailyMeetingDashboard();
  const overview = getTodayDashboardOverview();

  const money = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0
  });

  const formatMoney = (value: number | undefined) => money.format(value ?? 0);

  const departmentLabel = (department: string) =>
    department === 'unknown'
      ? 'Unknown'
      : department
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');

  const openLinkClass =
    'inline-flex items-center gap-1.5 rounded-full border border-[#dfd2c5] bg-white px-3 py-1.5 text-xs font-bold text-[#7a6550] transition hover:border-[#7a6550] hover:text-[#2c2925]';
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
    <div class="space-y-4">
      {#each Array(4) as _}
        <div class="h-44 animate-pulse rounded-3xl bg-white/70 shadow-sm"></div>
      {/each}
    </div>
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
          </div>
        </div>
        <a class={openLinkClass} href={daily?.links.companyLedger} target="_blank" rel="noreferrer">
          Open ledger <ExternalLink size={13} />
        </a>
      </div>

      <div class="mt-5 space-y-3">
        {#each daily?.expenses ?? [] as expense}
          <a href={expense.url} target="_blank" rel="noreferrer" class="block rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4 transition hover:border-[#7a6550]/50">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="font-semibold text-[#2c2925]">{expense.title}</p>
                <p class="mt-1 text-xs text-[#7a6550]/75">
                  {expense.date} · {expense.type ?? 'Ledger'} · {expense.department ?? 'No department'} · {expense.category ?? 'No category'}
                </p>
              </div>
              <div class="text-left sm:text-right">
                <p class="font-bold tabular-nums">{formatMoney(expense.amountThb)}</p>
                <p class="mt-1 text-xs text-[#7a6550]/75">{expense.status ?? 'No status'}</p>
              </div>
            </div>
          </a>
        {:else}
          <p class="rounded-2xl border border-dashed border-[#dfd2c5] p-4 text-sm text-[#7a6550]">
            No Company Ledger records found for the last two days.
          </p>
        {/each}
      </div>
    </section>

    <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm" id="events">
      <div class="flex gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]">
          <CalendarDays size={20} />
        </span>
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">2. Events</p>
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
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">3. HR</p>
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
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">4. Tasks</p>
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

  <section class="space-y-6 pt-2" id="receipt-ops-snapshot">
    <div>
      <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Receipt ops snapshot</p>
      <h2 class="mt-2 text-2xl font-semibold tracking-tight text-[#2c2925]">Today’s receipt summary</h2>
      <p class="mt-2 max-w-2xl text-sm text-[#7a6550]">
        Existing operational snapshot based on receipts recorded today in Neon.
      </p>
    </div>

    {#if overview.error}
      <div class="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">Failed to load today’s overview.</div>
    {:else if overview.loading}
      <div class="grid gap-4 md:grid-cols-3">
        {#each Array(3) as _}
          <div class="h-36 animate-pulse rounded-3xl bg-white/70 shadow-sm"></div>
        {/each}
      </div>
    {:else}
      {@const data = overview.current}
      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
          <p class="text-sm font-semibold text-[#7a6550]">Net total today</p>
          <p class="mt-3 text-4xl font-bold tracking-tight">{formatMoney(data?.netTotal)}</p>
          <p class="mt-3 text-xs text-[#7a6550]/70">Sales minus refunds, using receipt total_money.</p>
        </article>

        <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
          <p class="text-sm font-semibold text-[#7a6550]">Sales today</p>
          <p class="mt-3 text-4xl font-bold tracking-tight">{formatMoney(data?.salesTotal)}</p>
          <p class="mt-3 text-xs text-[#7a6550]/70">{data?.saleCount ?? 0} sale receipts</p>
        </article>

        <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
          <p class="text-sm font-semibold text-[#7a6550]">Receipts today</p>
          <p class="mt-3 text-4xl font-bold tracking-tight">{data?.receiptCount ?? 0}</p>
          <p class="mt-3 text-xs text-[#7a6550]/70">Refunds: {data?.refundCount ?? 0} · {formatMoney(data?.refundTotal)}</p>
        </article>
      </div>

      <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-[#7a6550]">Gross profit by department</p>
            <h3 class="mt-1 text-2xl font-bold tracking-tight text-[#2c2925]">Today</h3>
          </div>
          <p class="text-xs text-[#7a6550]/70">
            Category mapping from {data?.departmentMappingSource === 'notion' ? 'Notion' : 'fallback config'}.
            Unmapped categories appear as Unknown.
          </p>
        </div>

        <div class="mt-5 overflow-x-auto rounded-2xl border border-[#eadfd3]">
          <table class="w-full min-w-[680px] text-left text-sm">
            <thead class="bg-[#fffaf4] text-xs uppercase tracking-[0.16em] text-[#7a6550]/70">
              <tr>
                <th class="px-4 py-3 font-bold">Department</th>
                <th class="px-4 py-3 text-right font-bold">Revenue</th>
                <th class="px-4 py-3 text-right font-bold">COGS</th>
                <th class="px-4 py-3 text-right font-bold">Gross profit</th>
                <th class="px-4 py-3 text-right font-bold">Lines</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eadfd3]">
              {#each data?.departments ?? [] as row}
                <tr class={row.department === 'unknown' && row.lineCount > 0 ? 'bg-amber-50/70' : ''}>
                  <td class="px-4 py-3 font-semibold text-[#2c2925]">
                    {departmentLabel(row.department)}
                    {#if row.department === 'unknown' && row.categories.length}
                      <p class="mt-1 text-xs font-normal text-amber-800">{row.categories.join(', ')}</p>
                    {/if}
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums">{formatMoney(row.revenue)}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{formatMoney(row.cogs)}</td>
                  <td class="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(row.grossProfit)}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{row.lineCount}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <p class="mt-4 text-xs text-[#7a6550]/70">
          COGS uses Loyverse line-item cost_total when available; until costs are filled in, gross profit will be close to revenue.
        </p>
      </section>
    {/if}
  </section>
</section>
