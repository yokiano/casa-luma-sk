# Casa Luma Recipes tool

Route: `/tools/recipes`

This staff tool presents the Notion `Recipes` database as a kitchen recipe book. Recipes also provide the cost-of-goods source used by the `/tools/pos-sync` Menu Items sync.

## Data sources

- `Recipes`: recipe name, Thai name, image, COGS rollup, recipe-line relations, menu-item relations, rich-text instructions, and Notion page body blocks.
- `Recipe Lines`: amount, unit formula, line cost formula, ingredient relation. The tool derives displayed and synced COGS by summing Recipe Line `Line Cost` formulas because the Notion API can return a stale/zero `Recipes.COGS` rollup even when line formulas are calculated.
- `Ingredients`: English name, Thai name, unit, cost, department, image.
- `Menu Items`: menu context such as price, English/Thai name, description, category, status, dietary options, allergens, and image. Recipes link back to Menu Items through `Recipes.Menu Item`, making Recipes the POS COGS source while Menu Items remain the sellable catalog.

## Loading strategy

The route `+page.server.ts` intentionally returns immediately so Notion latency does not block the page mount. Recipe data loads after mount through SvelteKit remote functions:

- `getRecipeMenuIndex()` loads active Menu Items and Recipes in parallel. Active Menu Items drive the navigation tree, while Recipes are used to mark recipe coverage. A recipe only counts as complete when it has both recipe line items and instructions; linked records missing either are shown as incomplete/needs work.
- `getRecipeSummaries()` remains available for recipe-only summary consumers.
- `getRecipeDetail({ recipeId })` expands one selected recipe at a time.

On menu item selection, the client reuses the linked `primaryRecipeId` from the index rather than refetching the menu/recipe mapping. Detail loading expands:

1. Recipe Lines in the relation order from the selected Recipe.
2. Unique Ingredients referenced by those lines.
3. Linked Menu Items, grouped by category for display.
4. The selected Recipe page body blocks for instruction content and embedded images.

This avoids loading every ingredient/menu item for every recipe up front, keeps route navigation responsive, and still shows a complete recipe card when needed.

## Presentation model

The recipe card is designed for kitchen readability:

- Sticky searchable menu browser with a collapsible “menu map”: Grand Category tiles, Category chips, and an item list. This keeps navigation available while allowing more horizontal space for instructions.
- Header with recipe image, English/Thai title, derived COGS, menu price, allergen/dietary badges, and the linked menu item context box.
- Sub-header ingredient pane with exact amount, unit, ingredient name, Thai name, department, line cost, and ingredient thumbnails when available.
- Main instruction pane with side-by-side English `Instructions` and `Thai Instructions` fields, plus page body blocks.
- Missing/incomplete recipe states for active menu items that are not linked from any Recipe yet, or whose linked recipe is missing ingredient lines or instructions.
- Server-side Thai/English translation actions powered by Replicate, with double-arrow draft buttons and explicit per-language “Apply to Notion” buttons so only the selected recipe record is updated.
- Standalone recipe image card with a warm placeholder when Notion has no image.

## Implementation files

- `src/routes/tools/+layout.svelte` — staff tools navigation entry.
- `src/routes/tools/recipes/+page.server.ts` — immediate non-blocking route data.
- `src/lib/tools/recipes/recipes.server.ts` — Notion loading/expansion and block normalization.
- `src/lib/tools/recipes/recipe-cogs.server.ts` — shared recipe-line COGS calculation and Menu Item recipe COGS mapping for POS sync.
- `src/lib/tools/recipes/recipes.remote.ts` — remote functions used by the UI.
- `src/lib/tools/recipes/recipes.translation.ts` — Replicate prompt, glossary, output-normalization, and Notion rich-text chunk helpers.
- `src/routes/tools/recipes/+page.svelte` — searchable list and compact recipe detail UI.
- `src/routes/tools/recipes/InstructionBlock.svelte` — Notion block renderer for recipe instructions.
