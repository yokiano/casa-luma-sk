# Management dashboard

Route: `src/routes/mgmt-dashboard/+layout.svelte` with the overview page at `src/routes/mgmt-dashboard/+page.svelte`.

## Purpose

The management dashboard is an internal, meeting-friendly dashboard. The overview page is ordered like the daily meeting agenda so a new session can quickly understand what needs to be discussed.

## Daily meeting agenda

1. **Expenses / ledger records**
   - Source: Notion `Company Ledger` database.
   - Shows all ledger records from the last two Bangkok calendar days: yesterday through today.
   - The Notion `Date` filter uses Bangkok calendar-day UTC bounds, so late-night UTC timestamps still appear under the correct local day.
   - Dates are formatted for quick reading in the meeting.
   - Each row links to the Notion page, and the section includes an external link to open the ledger database in Notion.

2. **Balance reconciliation**
   - Overview: minimal panel on the daily meeting page after Company Ledger.
   - Detail page: `src/routes/mgmt-dashboard/reconciliation/+page.svelte`, linked from the sidebar and the overview “Details” button.
   - Server read model: `getBalanceReconciliationDashboard()` in `src/lib/mgmt-dashboard.remote.ts`, backed by `src/lib/server/balance-reconciliation.ts`.
   - Operating model and manual setup steps: `docs/casa-luma/tools/mgmt-dashboard/balance-reconciliation.md`.
   - MVP input: Notion `Balance Snapshots` database under Finance.

3. **Events**
   - Placeholder only for now.
   - Intended for today/tomorrow events, workshops, birthday parties, special guests, or operational reminders once the UI/database is ready.

4. **HR**
   - Source: Notion `Salary Adjustments` database.
   - Shows upcoming salary adjustments in the next 30 days.
   - Also shows upcoming employee birthdays from the Notion `Employees` database.
   - Salary adjustments link to their Notion pages and include a link to open the salary adjustments database.

5. **Tasks**
   - Uses this published Notion database view for embedding and linking: `https://efficacious-drizzle-ad4.notion.site/ebd//0df7129c34034bf0937088586b557c2a?v=36bfc77db4f38069bac4000c8a72a853`.
   - The page attempts to embed the view in an iframe and also provides an external link.
   - Notion may block embedding private pages; if the iframe is blank, open the external Notion view.

## Supporting snapshot

Below the agenda, the overview keeps the existing receipt operations snapshot:

- Today’s net total, sales, receipt count, refunds.
- Gross profit by department from Neon receipt data.
- Department/category mapping comes from Notion when configured, otherwise fallback config is used.

## Server data

The server-side remote functions live in `src/lib/mgmt-dashboard.remote.ts`:

- `getDailyMeetingDashboard()` loads the daily meeting agenda data from Notion.
- `getBalanceReconciliationDashboard()` loads expected vs observed bank/safe balances from Notion snapshots, Company Ledger, and Loyverse receipt payments.
- `getTodayDashboardOverview()` loads the receipt operations snapshot from Neon/Loyverse/Notion mapping.

The Notion data requires `NOTION_API_KEY`. If it is missing or Notion fails, the daily meeting and reconciliation sections render empty states with a warning instead of breaking the whole dashboard.

## Health checks

The health page at `src/routes/mgmt-dashboard/health/+page.svelte` includes a flexi/membership creation-flow card backed by `getMembershipCreationHealth()` in `src/lib/mgmt-dashboard.remote.ts`.

- Sources: Notion `Memberships` and `🎟️  Flexi Passes` databases, both queried by newest `created_time` through concrete generated SDK imports.
- Pass/green: at least one Memberships record or one Flexi Passes record was created in the last 7 days.
- Warning: neither database has a record created in that window; the card copy tells management the automation/business flow may need checking.
