# Casa Luma Recipes tool

Route: `/tools/recipes`

This staff tool presents the Notion `Recipes` database as a kitchen recipe book.

## Data sources

- `Recipes`: recipe name, Thai name, image, COGS rollup, recipe-line relations, menu-item relations, rich-text instructions, and Notion page body blocks.
- `Recipe Lines`: amount, unit formula, line cost formula, ingredient relation. The tool derives displayed COGS by summing Recipe Line `Line Cost` formulas because the Notion API can return a stale/zero `Recipes.COGS` rollup even when line formulas are calculated.
- `Ingredients`: English name, Thai name, unit, cost, department, image.
- `Menu Items`: menu context such as price, English/Thai name, description, category, status, dietary options, allergens, and image.

## Loading strategy

The route `+page.server.ts` intentionally returns immediately so Notion latency does not block the page mount. Recipe data loads after mount through SvelteKit remote functions:

- `getRecipeMenuIndex()` loads Menu Items and Recipes in parallel. Menu Items drive the navigation tree, while Recipes are used to mark which menu items already have linked recipe records and to show the recipe COGS badge.
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

- Sticky searchable menu browser with a separate “menu map”: Grand Category tiles, Category chips, and an item list. This avoids deep expand/collapse navigation while still showing recipe coverage counts.
- Header with recipe image, English/Thai title, derived COGS, menu price, and Notion link.
- Safety/context strip for allergens and dietary options from linked menu items.
- Compact ingredient table with exact amount, unit, ingredient name, Thai name, department, line cost, and ingredient thumbnails when available.
- Instruction section combining the Recipe `Instructions` property and actual Notion page body blocks.
- Linked menu item context grouped by category with only relevant operational fields.
- Missing-recipe state for menu items that exist in the Menu Items database but are not linked from any Recipe yet.
- Standalone recipe image card with a warm placeholder when Notion has no image.

## Implementation files

- `src/routes/tools/+layout.svelte` — staff tools navigation entry.
- `src/routes/tools/recipes/+page.server.ts` — immediate non-blocking route data.
- `src/lib/tools/recipes/recipes.server.ts` — Notion loading/expansion and block normalization.
- `src/lib/tools/recipes/recipes.remote.ts` — remote functions used by the UI.
- `src/routes/tools/recipes/+page.svelte` — searchable list and compact recipe detail UI.
- `src/routes/tools/recipes/InstructionBlock.svelte` — Notion block renderer for recipe instructions.
