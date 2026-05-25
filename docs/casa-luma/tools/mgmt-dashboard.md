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

2. **Events**
   - Placeholder only for now.
   - Intended for today/tomorrow events, workshops, birthday parties, special guests, or operational reminders once the UI/database is ready.

3. **HR**
   - Source: Notion `Salary Adjustments` database.
   - Shows upcoming salary adjustments in the next 30 days.
   - Also shows upcoming employee birthdays from the Notion `Employees` database.
   - Salary adjustments link to their Notion pages and include a link to open the salary adjustments database.

4. **Tasks**
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
- `getTodayDashboardOverview()` loads the receipt operations snapshot from Neon/Loyverse/Notion mapping.

The Notion data requires `NOTION_API_KEY`. If it is missing or Notion fails, the daily meeting section renders empty states with a warning instead of breaking the whole dashboard.
