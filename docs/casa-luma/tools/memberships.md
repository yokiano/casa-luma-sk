# Memberships tool

Route: `/tools/memberships`

Source files:

- `src/routes/tools/memberships/+page.svelte`
- `src/routes/tools/memberships/+page.server.ts`
- `src/lib/server/memberships.ts`
- `src/lib/memberships.remote.ts`

## Purpose

The Memberships tool is the staff-facing view for membership-style access records linked to Casa Luma Families.

It now renders both:

- Notion `🎫 Memberships` records for weekly/monthly memberships.
- Notion `🎟️ Flexi Passes` records for flexi cards/passes.

## Membership records

Weekly/monthly membership records are editable from this tool:

- Create a new membership manually.
- Search by family/name/contact signals.
- Expand a row to lazy-load more family details.
- Edit or archive a membership record.
- Open the linked receipt URL when present.

Membership list data comes from `MembershipsDatabase` through `getMembershipsData()`.

## Flexi pass records

Flexi pass records are shown alongside memberships as read-only list items:

- Type badge: `Flexi Pass`.
- Validity: `Valid From` / `Valid Until` mapped to start/end dates.
- Counters: cards, entries granted, entries used, entries left.
- Status: `Automation Status` from the Flexi Passes database.
- Receipt link: `Source Receipt URL`.

Flexi pass list data comes from `FlexiPassesDatabase` through `getMembershipsData()` and is merged with membership records by creation time.

Flexi pass records are read-only in this tool because their lifecycle is driven by receipt automation and the dedicated Notion `🎟️ Flexi Passes` database.

## Search and pagination

Search runs through the remote `getMemberships` query and applies to both Notion databases:

- Memberships: name, notes, related family matches.
- Flexi Passes: name, notes, Loyverse customer ID, source receipt number, related family matches.

Pagination tracks separate Notion cursors for memberships and flexi passes in one encoded cursor so one exhausted database does not cause duplicate rows from the other.

## Flexi validity helper

The page includes a small helper for staff to calculate and copy 30-day and 60-day flexi end dates. It does not write to Notion.
