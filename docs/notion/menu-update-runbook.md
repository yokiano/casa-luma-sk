# Menu update runbook

Use this when a fresh Pi session needs to add or change Casa Luma menu records in Notion without a long handoff.

## Read first

1. `AGENTS.md` in the repo root.
2. `docs/notion/notion-menu-system-how-it-works.md`.
3. `docs/notion/working-with-notion-api.md`.
4. Generated schema constants when writing fields:
   - `src/lib/notion-sdk/dbs/menu-items/constants.ts`
   - `src/lib/notion-sdk/dbs/pos-modifiers/constants.ts`

## Safety rules

- Apply Notion changes directly through the Notion API, CLI, or MCP, not through the webapp UI.
- Before writing, query Notion for exact and near duplicates by item name and LoyverseID when relevant.
- Only create, update, or relate records explicitly requested or approved in the plan.
- Do not delete or archive unrelated rows.
- If the task touches Notion database schema, run `pnpm notion:generate` afterward. Ordinary row creates do not require regeneration.
- Never run `pnpm check`, `svelte check`, or `pnpm build` in this project.

## Open Play variant items

Open Play POS Items use `Description`, `Thai Description`, `Has variants`, `Variants JSON`, and three variant option-name properties. The Open Play sync reads all pages with pagination, validates JSON before any category/item mutation, matches Loyverse items ID-first, preserves variant IDs, writes new IDs back to Notion, and never deletes orphan candidates. For Flexi Entrance/Checkout semantics and the safe post-sync ID capture, see `docs/loyverse/flexi-checkin-checkout.md`.

## Typical flow for menu item creates

1. Parse the user request and source files or images.
2. Query current Notion Menu Items and POS Modifiers directly.
3. If Loyverse IDs or prices are mentioned, verify them through the Loyverse API when credentials are available.
4. Prepare a concise proposed write plan with:
   - item names
   - categories and grand categories
   - prices
   - descriptions
   - status
   - order
   - LoyverseID
   - modifier and add-on relations
   - variant behavior
5. Ask the user to verify the plan before writes.
6. After approval, create modifiers before menu items if new modifier relations are needed.
7. Create or update the approved Menu Items records only.
8. Re-query targeted records and verify field values and relations.
9. Save any useful disposable audit/apply output under `temp/`, not `docs/`.
10. Report the final Notion page IDs and verification timestamp.

## Useful field conventions

Menu Items fields commonly used:

- `Name`: title
- `Description`: rich text
- `Price`: number
- `Category`: select
- `Grand Category`: select, usually `Food`, `Drinks`, `Kids`, or `Desserts`
- `Status`: status, usually `Active`
- `Order`: number, optional
- `LoyverseID`: rich text
- `Modifiers`: relation to POS Modifiers
- `Has variants`: checkbox in the live Notion schema
- `Variants JSON`: rich text JSON when variants are used

POS Modifiers fields commonly used:

- `Name`: title
- `Active`: checkbox
- `Options JSON`: rich text JSON array, usually objects with `name`, `position`, and `price`
- `Position`: number, optional
- `LoyverseID`: rich text, usually blank until synced
- `Notes`: rich text

## Fresh session prompt template

```text
Please update the Casa Luma Notion menu for the following request: <paste request>. First read docs/notion/README.md, docs/notion/menu-update-runbook.md, docs/notion/notion-menu-system-how-it-works.md, and docs/notion/working-with-notion-api.md. Query Notion directly to audit current records and duplicates. Prepare a proposed write plan and ask me to verify before execution. After approval, apply only the approved records through the Notion API, then re-query and report page IDs and verification results. Do not run pnpm check, svelte check, or pnpm build.
```
