# Memberships tool UI + server remote APIs context

## Scope read
- `src/routes/tools/memberships/+page.svelte`
- `src/routes/tools/memberships/+page.server.ts`
- `src/routes/tools/memberships/MembershipDialog.svelte`
- `src/routes/tools/memberships/MembershipForm.svelte`
- `src/routes/tools/memberships/FamilySearchSelect.svelte`
- `src/lib/server/memberships.ts`
- `src/lib/memberships.remote.ts`
- `src/lib/notion-sdk/dbs/memberships/{constants,types,response.dto,patch.dto,db}.ts`
- Flexi/receipt context: `src/lib/receipts/open-play-items.ts`, `src/lib/server/db/flexi-pass-queries.ts`, `src/lib/receipts/validation/rules/flexi-pass-entry.ts`, `src/lib/receipts/automations/membership-{items,creation}.ts`, `src/lib/server/membership-automation.ts`, `src/lib/server/membership-validation.ts`.

## Current memberships UI behavior

### Page load/list/search/sort
- `+page.server.ts` calls `getMembershipsData({})` and returns `initialMemberships`, `nextCursor`, `hasMore`.
- `+page.svelte` keeps a local `memberships` list from page data and supports:
  - Client-side sort by creation date, end date, family name; default `createdTime desc` (`+page.svelte:42-64`).
  - Debounced server search after 300ms (`+page.svelte:105-128`). Placeholder says search by family name, customer code, or phone (`+page.svelte:307-317`).
  - Pagination/load more via `getMemberships({ cursor, search })` (`+page.svelte:135-151`, `546-556`).
- Collapsed row displays family name, optional customer code, membership type, kid count, start/end chips, status chip, receipt link, and actions menu (`+page.svelte:371-464`).
- Expanded row lazy-loads family customer code/phone if missing, then shows type/kids/status chips, start/end/created dates, receipt link, notes (`+page.svelte:222-260`, `467-539`).
- `hasFamilyDetails` currently treats details as loaded when either `customerCode !== null` OR `mainPhone !== null` (`+page.svelte:222-225`). Since server placeholders set both to `null`, this normally triggers lazy loading; a real family with both fields null would be treated as not-loaded forever.

### Flexi helper currently shown on memberships page
- There is a “Validity calculation helper” card near the top (`+page.svelte:275-305`).
- It computes two dates from today: `today + 30 days` and `today + 60 days` (`+page.svelte:80-87`). Buttons recalculate and copy the ISO date to clipboard/toast (`+page.svelte:89-103`).
- This helper is only date arithmetic. It is not backed by flexi pass balance data, receipts, Notion membership records, or a remote API.

### Create/edit dialog behavior
- The `New Membership` trigger opens a dialog whose create mode does **not** show a form. It says memberships are created automatically after an eligible receipt is closed and tells staff to close the receipt then refresh (`MembershipDialog.svelte:92-98`, `205-214`, `255-273`).
- Edit mode shows `MembershipForm` and saves through `updateMembership` (`MembershipDialog.svelte:163-173`, `224-254`).
- The code still contains create-submit logic for `createMembership` (`MembershipDialog.svelte:174-183`), but create mode currently never renders the form or submit button, so manual create is effectively disabled in the UI.
- Edit form fields: family selector, membership type select, number of kids, start date, end date with edit/reset override, notes (`MembershipForm.svelte:56-154`).
- Membership type options come from generated Notion constants and are only `Weekly` and `Monthly` (`constants.ts:1-5`, `MembershipForm.svelte:63-73`).
- Important mismatch/bug to verify before modifying: `MembershipDialog.svelte` calls `calculateEndDate(startDate, membershipType)` at line 127, but no such function exists in `src/routes/tools/memberships/*.svelte` (grep only found that call). This may break edit dialog compilation/runtime unless hidden by current build state.
- Date duration mismatch: dialog auto-calculates Weekly as `start + 7 days`, Monthly as `setMonth(+1)` (`MembershipDialog.svelte:65-79`). Automation creates memberships with inclusive end date `durationDays - 1`; weekly = start + 6 days, monthly item duration = 30 days so end = start + 29 days (`membership-creation.ts:87-90`, `membership-items.ts:12-24`). If editing an automated membership, the UI may mark the existing end date as overridden.

### Family selector behavior
- `FamilySearchSelect.svelte` uses `searchFamilies({ search })` with 250ms debounce, displays family name, customer code, phone, and member names/types when present. It clears results on outside click.

## Current server/API/data model

### Remote APIs (`src/lib/memberships.remote.ts`)
SvelteKit server functions expose:
- `getMemberships` query: `{ cursor?, search?, pageSize? }`, pageSize 1-100 (`memberships.remote.ts:13-19`).
- `searchFamilies` query: `{ search }`, max 80 chars (`memberships.remote.ts:21-25`).
- `createMembership` command: `{ familyId, type, numberOfKids, startDate?, endDate?, notes? }` (`memberships.remote.ts:27-36`).
- `updateMembership` command: same plus `id` (`memberships.remote.ts:38-48`).
- `deleteMembership` command: archives by id (`memberships.remote.ts:50-54`).
- `getFamilyDetails` query: `{ familyId }` (`memberships.remote.ts:56-60`).

### Notion Memberships database shape
- Generated membership select values only allow `Type`: `Weekly`, `Monthly` (`constants.ts:1-5`).
- Known properties: `type` select, `hasSiblingDiscount` formula, `status` formula, `family` relation, `startDate` date, `endDate` date, `numberOfKids` number, `notes` rich_text, `name` title, `receipt` URL (`constants.ts:8-43`).
- There is no Notion property for flexi pass entries, cards purchased, entries used, remaining balance, validity days, or customer/Loyverse ID on Membership itself.
- `status` is a formula, not directly writable. App overlays `Refund` when notes include `MEMBERSHIP_REFUND_NOTE_PREFIX` (`server/memberships.ts:44-50`).

### `src/lib/server/memberships.ts` behavior
- `MembershipItem` returned to UI has only membership fields plus a `FamilySummary` (`server/memberships.ts:16-28`).
- List queries intentionally avoid fetching full families to avoid N+1; if a membership has a family relation, it builds a placeholder family from the membership title format `FamilyName - Type - X kids`, with customerCode/mainPhone null (`server/memberships.ts:52-83`, `100-111`).
- `getMembershipsData` queries Notion, default page size 50, sorts by Notion created time descending (`server/memberships.ts:114-152`).
- Search path:
  - Finds matching families with `queryFamilyMatches(search)`, caps to 10 family IDs because Notion OR filter limit concern (`server/memberships.ts:127-131`).
  - Builds OR filter for name/notes contains search variations plus `family contains id` (`server/memberships.ts:132-142`).
  - Because customer code/phone are family properties, search by those depends on `queryFamilyMatches`, not membership rows.
- Create/update fetch full family, generate membership name as `${familyName} - ${type} - ${numberOfKids} kid(s)`, then patch Notion fields (`server/memberships.ts:157-229`).
- Delete archives the Notion page (`server/memberships.ts:232-235`).
- `getFamilyDetailsData` returns `fetchFamilyById(familyId)` for lazy UI details (`server/memberships.ts:238-241`).

## Existing flexi pass data/model elsewhere

### Item constants and receipt validation
- Flexi items are receipt/Loyverse concepts, not Membership Notion records:
  - Single entrance usage item: `FLEXI_SINGLE_ENTRANCE_ITEM_ID` (`open-play-items.ts:5`).
  - Purchase/card items: resident + regular IDs (`open-play-items.ts:6-9`).
  - Each card/pass has `FLEXI_PASS_ENTRIES_PER_CARD = 11` (`open-play-items.ts:10`).
- Public pricing copy says Flexi Play Pass = “11 hours of play | Valid for 60 days” (`src/lib/constants.ts:245-249`). Current balance query does not enforce 60-day expiry.
- Flexi receipt validation checks if a receipt contains Flexi Single Entrance usage, requires customer, queries balance, and warns when `remainingBeforeCurrentReceipt < currentReceiptEntries` (`flexi-pass-entry.ts:45-84`). Details include cards purchased, entries purchased/used, remaining before/after current receipt, first/last purchase dates (`flexi-pass-entry.ts:91-107`).

### Balance query in Neon/Drizzle
- `queryFlexiPassBalanceForCustomer` returns:
  - `cardsPurchased`, `entriesPurchased`, `entriesUsedIncludingCurrent`, `currentReceiptEntries`, `remainingBeforeCurrentReceipt`, `remainingAfterCurrentReceipt`, `firstPurchaseAt`, `lastPurchaseAt` (`flexi-pass-queries.ts:10-20`).
- It queries local receipt tables joined with line items for the same `customerId`, optional `merchantId`, non-refund receipts, date <= cutoff, and flexi card or single-entrance item IDs (`flexi-pass-queries.ts:31-67`).
- Cards purchased increment by line quantity for card item IDs; used entries increment by line quantity for single entrance (`flexi-pass-queries.ts:69-83`).
- It compensates if current receipt usage was not found in rows, then calculates entries purchased and remaining before/after current receipt (`flexi-pass-queries.ts:86-107`).
- There is no per-card ledger allocation, expiry handling, or list of receipt-level purchases/usages in the current returned type.

### Membership automation is separate from flexi
- Membership purchase items are only weekly/monthly, hardcoded item IDs and durations 7/30 days (`membership-items.ts:1-24`).
- Membership automation groups matching purchase items by item/type/duration and treats quantity as `numberOfKids` (`membership-creation.ts:100-117`).
- Membership end date is inclusive `start + durationDays - 1` (`membership-creation.ts:87-90`).
- It creates Notion Membership records with notes/provenance and optional receipt URL (`membership-creation.ts:119-140`, `309-346`; `server/membership-automation.ts:159-176`).
- Flexi purchases are not represented in this automation or in Notion Memberships today.

## How to display flexi passes/entries clearly

Recommended UI copy/layout if adding flexi visibility to memberships tool:
- Treat `Weekly/Monthly memberships` and `Flexi passes` as separate benefit types. Do not label flexi as a Notion `Membership` unless a deliberate schema change adds it there; current Notion type enum cannot represent it.
- Use entry-based language, not date-only language:
  - Summary chip/card: `Flexi: 8 / 11 entries remaining` or `8 remaining · 3 used of 11`.
  - If multiple cards: `22 purchased · 14 used · 8 remaining` plus `2 cards purchased`.
  - For current receipt review context: distinguish `Remaining before this receipt` vs `After this receipt`; those fields already exist in validation details.
- If showing expiry, label the current limitation/assumption. The product copy says valid 60 days, but current balance query does not expire entries. Avoid showing `valid until` from balance API unless implementing expiry/allocation. The current helper’s `60 days from today` date is just a manual calculator.
- For staff clarity, show both purchase and usage anchors:
  - `First purchase`, `Last purchase` from existing balance type.
  - Consider adding expandable “receipt history” later if staff need to audit discrepancies; current balance API lacks receipt rows.
- Status states to make obvious:
  - No customer attached: cannot calculate, match receipt warning copy.
  - No flexi purchase history: `0 cards / 0 entries purchased`.
  - Insufficient/negative balance: emphasize warning, e.g. red/amber chip `-1 after latest receipt`.
  - Unknown/unsupported expiry: small help text if expiry is not implemented.

## API/data model options for flexi in memberships tool

### Option A: Read-only flexi balance remote API (lowest schema risk)
Add a new server query that wraps `queryFlexiPassBalanceForCustomer` and returns a `FlexiPassBalance` by customer/family. Needed bridge: Family has Loyverse customer id in the family server/Notion data, but current `MembershipItem.family` sent to the UI does **not** include it. The next agent should inspect `src/lib/tools/families/families.server.ts` and family SDK constants before choosing exact fields.

Possible API shapes:
- `getFlexiPassBalance({ customerId, merchantId?, at? })` if UI can obtain Loyverse customer ID.
- `getFamilyFlexiPassBalance({ familyId, merchantId?, at? })` if server should fetch the family and use its Loyverse ID.

Pros: uses existing validated balance logic; no Notion schema change; quick way to display clear balances.
Cons: no expiry, no history rows, and depends on Neon receipt ingestion completeness.

### Option B: Extend balance query for expiry/history
Enhance/augment `queryFlexiPassBalanceForCustomer` to return purchase/usage receipt rows and apply 60-day validity. This is better if the UI must answer “which pass/entries are still valid?” rather than only “net remaining”.

Implementation implications:
- Need per-purchase allocation FIFO or equivalent: each card purchase grants 11 entries, expires 60 days after purchase date.
- Need define boundary semantics: `valid through purchaseDate + 59?` vs `+60?` Current membership automation uses inclusive `durationDays - 1`; flexi helper uses `today + 60`, so this must be decided.
- Need tests around expiry, multiple cards, partial use, refunds/corrections.

### Option C: Model flexi as Notion Membership rows (schema/product decision)
Would require changing Notion Membership Type options/properties (e.g. add `Flexi`, `entriesPurchased`, `entriesUsed`, `remainingEntries`, `loyverseCustomerId` or relation/provenance). If changing Notion database properties used by `src/lib/notion-sdk/**`, project instructions require `pnpm notion:generate` afterward. This is higher risk and may conflict with the existing receipt-derived balance source.

Pros: one UI list could show all entitlements uniformly.
Cons: generated SDK/schema work; duplicate/derived state risk; current automation and validation logic are receipt-driven, not Notion-driven.

### Option D: Keep date helper only, improve copy
If the immediate task is just clearer staff guidance, rename the current helper to make it explicit: `Manual date helper` / `Not saved anywhere` / `Use for Flexi validity note`. This avoids implying that flexi passes are tracked on the memberships page.

## UX notes/risks
- Current page title/subtitle says “Manage active memberships...track durations,” but list shows all queried memberships sorted by created time unless user sorts; there is no active-only filter. Consider filters: Active, Expiring soon, Refunded, Flexi (if added).
- If adding flexi balances to rows, avoid loading a balance for every membership row on initial page load unless batched; current list already avoids N+1 family fetches. Prefer lazy-load on expand or a batch API keyed by family/customer IDs.
- Consider moving the flexi helper into a clearer “Flexi pass tools” section/tab if adding real balances; otherwise date helper and balance cards may be confused.
- The list display pattern uses rounded cards, chips, subtle amber warning chips, and expandable details. Reuse those patterns for flexi: e.g. a compact chip in collapsed row and detailed ledger on expand.
- Remote validation uses Valibot schemas with trimmed strings and max lengths; keep that style for any new remote query.
- Avoid importing generated Notion SDK database barrels from server/runtime code; existing code imports concrete `/db`, `/patch.dto`, `/response.dto`, `/constants`, matching repo instructions.
- Do not run `pnpm check`, `svelte check`, or `pnpm build` in this repo per `AGENTS.md`.

## High-value line references
- Current flexi date helper: `+page.svelte:80-103`, rendered `+page.svelte:275-305`.
- Membership row chips/details: `+page.svelte:377-410`, `+page.svelte:467-539`.
- Search/sort/load more: `+page.svelte:42-64`, `+page.svelte:105-151`, `+page.svelte:307-354`.
- Lazy family details: `+page.svelte:168-195`, `+page.svelte:222-260`.
- Create disabled/message: `MembershipDialog.svelte:92-98`, `MembershipDialog.svelte:255-273`.
- Edit form fields: `MembershipForm.svelte:56-154`.
- Remote schemas: `memberships.remote.ts:13-60`.
- Server mapping/list/search/create/update/delete: `server/memberships.ts:16-28`, `44-57`, `59-152`, `157-241`.
- Membership Notion props/type enum: `notion-sdk/dbs/memberships/constants.ts:1-43`.
- Flexi constants: `receipts/open-play-items.ts:1-10`.
- Flexi balance query: `server/db/flexi-pass-queries.ts:10-20`, `31-107`.
- Flexi validation warning details: `receipts/validation/rules/flexi-pass-entry.ts:45-107`.
- Membership automation durations/end dates: `receipts/automations/membership-items.ts:12-24`, `receipts/automations/membership-creation.ts:87-90`, `282-346`.

## Questions/assumptions to resolve before implementation
- Should flexi pass balances honor the advertised 60-day validity? Current query does not.
- Should flexi appear under memberships as an entitlement card, or as a separate tab/tool section? Current Notion Membership schema cannot represent flexi without a schema change.
- What should the authoritative source be for flexi balance: receipt history in Neon (current validation source), Notion Memberships, or a new Notion/ledger model?
- What date boundary should “60 days valid” use? Current membership automation uses inclusive end date; current flexi helper uses `today + 60`.
