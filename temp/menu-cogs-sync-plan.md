# Menu item COGS sync plan

Date: 2026-05-23

## Goal

Sync recipe COGS from Notion `Recipes` / `Recipe Lines` into Loyverse item variant cost fields as part of the existing Notion → Loyverse menu item sync.

## Verified current model

### Notion / recipes

- `docs/casa-luma/tools/recipes.md` already documents that the Recipes tool has recipe COGS and that the UI prefers a derived COGS from `Recipe Lines` because the Notion API can return a stale/zero `Recipes.COGS` rollup.
- `Recipes` database DTO: `src/lib/notion-sdk/dbs/recipes/response.dto.ts`
  - `COGS` is a Notion rollup.
  - `Menu Item` is a relation; exposed as `recipe.properties.menuItemIds`.
  - `Recipe Lines` is a relation; exposed as `recipe.properties.recipeLinesIds`.
- `Recipe Lines` DTO: `src/lib/notion-sdk/dbs/recipe-lines/response.dto.ts`
  - `Line Cost` is a formula; exposed as `line.properties.lineCost`.
- `src/lib/tools/recipes/recipes.server.ts` contains the important COGS logic:
  - `rollupNumber()` can read `Recipes.COGS` when available.
  - `sumLineCosts()` sums related `Recipe Lines.Line Cost` values.
  - `chooseCogs()` prefers calculated line sum over the Notion rollup when line data is available.
  - `getRecipeDetailData()` fetches recipe lines and computes accurate COGS.
  - `getRecipeMenuIndexData()` currently maps recipe summaries without fetching recipe lines, so index `recipeCogs` may still rely on the rollup rather than the accurate derived sum.

### Notion / menu items

- `Menu Items` DTO: `src/lib/notion-sdk/dbs/menu-items/response.dto.ts`
  - Has a `COGS` number property exposed as `menuItem.properties.cogs`.
  - Current menu sync does **not** use this field.
  - Current recipe linkage is not on Menu Items directly; recipe linkage comes from `Recipes.Menu Item` relation.

### Loyverse / sync

- Existing menu sync implementation: `src/lib/menu-sync.remote.ts`.
- Existing UI: `src/routes/tools/pos-sync/tabs/MenuSyncTab.svelte` and state in `src/routes/tools/pos-sync/pos-sync.svelte.ts`.
- Current sync compares and syncs:
  - name
  - price/default_price
  - description
  - category
  - modifiers
  - variants/options
- Current payload variants already support Loyverse `cost` and `purchase_cost` in TypeScript (`src/lib/server/loyverse.ts`), but menu sync does not populate them.
- Current update path preserves `variant_id` for simple items and matches/preserves `variant_id` for variant items. This is important for analytics continuity.
- Existing dangerous path: if Loyverse rejects option structure changes with `You cannot add or delete options`, the sync deletes and recreates the item, then updates Notion with a new Loyverse ID. COGS-only changes should not trigger that path if variant IDs/options are preserved.

## Loyverse behavior relevant to analytics / IDs

From Loyverse API docs:

- `POST /items` creates or updates a single item.
- Including the item `id` in the POST request updates the existing item instead of creating a new one.
- Item variants contain `variant_id`, `cost`, and `purchase_cost` fields.
- `POST /variants` also supports create/update; including `variant_id` updates an existing variant.
- Receipt line items store `item_id`, `variant_id`, `cost`, and `cost_total` snapshots.

Practical implication:

- Updating `cost` / `purchase_cost` on an existing item/variant, while sending the same item `id` and preserving the same `variant_id`, should not create a new item and should not change the Loyverse item ID.
- It should produce an `items.update` event and alter item/variant metadata going forward.
- Past receipts already contain line-level `cost` / `cost_total` snapshots, so historical receipts should not be re-keyed as a new item just because the current item cost changed.
- The only known current sync path that would create a new Loyverse ID is the existing delete/recreate fallback for option-structure changes, not a cost-only update.

## Proposed implementation

### 1) Extract shared recipe COGS helpers

Create a small server-only helper, e.g. `src/lib/tools/recipes/recipe-cogs.server.ts` or `src/lib/menu-cogs.server.ts`, so menu sync can reuse the same accurate COGS rules without importing UI/detail code.

Suggested functions:

- `formulaValue(formula): string | number | boolean | undefined`
- `rollupNumber(rollup): number | undefined`
- `lineCostNumber(lineDto): number`
- `sumLineCosts(lineDtos): number | undefined`
- `chooseRecipeCogs(recipeDto, calculatedCogs?): number | undefined`
- `buildMenuItemRecipeCogsMap(recipesDb, recipeLinesDb): Promise<Map<string, RecipeCogsInfo>>`

`RecipeCogsInfo` should include enough UI/debug metadata:

```ts
type RecipeCogsInfo = {
  menuItemId: string;
  recipeId: string;
  recipeName: string;
  cogs: number;
  source: 'recipe-lines' | 'recipe-rollup';
  recipeLineCount: number;
  isComplete: boolean;
  warning?: string;
};
```

Important: prefer line-summed COGS when recipe lines exist. Fall back to rollup only when recipe lines cannot be fetched or are empty.

### 2) Resolve multiple recipes per menu item deterministically

Current recipe UI chooses a primary recipe as:

1. first complete linked recipe, else
2. first linked recipe.

For sync, use a stricter version and surface ambiguity:

- If exactly one linked recipe has usable COGS: sync that.
- If multiple linked recipes have usable COGS:
  - choose the first complete recipe consistently with recipe UI, **but** add a sync warning/diff like `Multiple linked recipes have COGS; using "X"`.
- If no linked recipe has usable COGS:
  - leave cost unchanged unless we explicitly decide to clear costs.

Open product decision: should missing recipe COGS mean “do not touch Loyverse cost” or “set cost to 0”? Safer default: do not touch.

### 3) Integrate into `getMenuSyncStatus`

In `src/lib/menu-sync.remote.ts`:

- Import `RecipesDatabase`, `RecipeLinesDatabase`, and COGS helper.
- In `getMenuSyncStatus`, fetch recipe COGS map in parallel with Notion menu items/modifiers and Loyverse data.
- Extend `MenuItemSyncState` with optional fields:

```ts
recipeCogs?: number;
recipeCogsSource?: 'recipe-lines' | 'recipe-rollup';
recipeName?: string;
loyverseCost?: number;
```

- Extend `compareItems(...)` to receive the COGS info.
- For simple items, compare expected COGS with `loyverseItem.variants[0]?.cost` (and/or `purchase_cost`).
- For variant items, because current Notion variants JSON has prices but no per-variant COGS, apply the same recipe COGS to each Loyverse variant unless/until a per-variant recipe model exists. Add an explicit note in the UI/plan because this is a business assumption.

Open product decision: for variants, do we want the parent recipe COGS copied to every variant, or should variants wait until Notion has per-variant recipe links? Safer for accuracy: only sync COGS to simple items first unless user confirms variant behavior.

### 4) Integrate into `syncMenuItems`

In the sync loop:

- Resolve `recipeCogsInfo` by `nItem.id`.
- When constructing each variant payload:
  - include `cost: roundedCogs` when usable.
  - include `purchase_cost: roundedCogs` if Loyverse reports need both fields; otherwise at minimum populate `cost` because receipt line items and variant docs expose `cost` as the variant cost.
  - preserve `variant_id` exactly as current code does.
- Do not clear existing cost when COGS is missing unless explicitly enabled.
- Add cost mismatch to `diffs` so existing items without costs become `MODIFIED` and can be synced.

Rounding: Loyverse accepts numbers; use a small helper such as `roundMoney(value) => Math.round(value * 100) / 100`.

### 5) UI changes

In `MenuSyncTab.svelte`:

- Add cost info under Details:
  - `Recipe COGS: ฿x.xx from Recipe Name`
  - `Loyverse cost: ฿y.yy` when available
- Diffs already render as list items, so cost mismatch will naturally show.
- Optional: add a checkbox later for `Sync recipe COGS` default-on or default-off. For first implementation I recommend default-on in code only after a dry-run/status review confirms expected diffs.

### 6) Docs updates

- Update `docs/casa-luma/tools/recipes.md` to explicitly say recipe COGS is calculated in Notion through Recipe Lines and used as the source for POS COGS sync.
- Update `docs/notion/notion-menu-system-how-it-works.md` because it currently describes menu items/variants/modifiers/discounts but does not mention recipe COGS or the POS cost sync.
- Add a short section to this doc explaining that Menu Items are still the sellable catalog, while Recipes are the cost-of-goods source linked back to Menu Items.

## Suggested rollout / safety checks

1. Implement helpers and status-only cost diffs first.
2. Open `/tools/pos-sync`, refresh Menu Items, inspect how many items become `MODIFIED` due only to missing cost.
3. Sync one low-risk simple item and verify in Loyverse Back Office that item ID and variant ID remain unchanged and cost is updated.
4. Then sync all simple items.
5. Decide variant behavior before syncing COGS for variant items.

## Testing notes

Project instruction says **do not run** `pnpm check`, `svelte check`, or `pnpm build`.

Safer validation options:

- Run targeted unit/helper tests if existing test runner supports it.
- Add small pure helper tests around COGS map selection and variant cost payload construction.
- Manually inspect menu sync status in the dev server logs/UI.
