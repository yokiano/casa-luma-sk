import { NOTION_API_KEY } from '$env/static/private';
import { RecipesDatabase, RecipesResponseDTO, type RecipesQueryResponse } from '$lib/notion-sdk/dbs/recipes';
import { RecipeLinesDatabase, RecipeLinesResponseDTO, type RecipeLinesQueryResponse } from '$lib/notion-sdk/dbs/recipe-lines';
import { IngredientsDatabase, IngredientsResponseDTO } from '$lib/notion-sdk/dbs/ingredients';
import { MenuItemsDatabase, MenuItemsResponseDTO, type MenuItemsQueryResponse } from '$lib/notion-sdk/dbs/menu-items';
import type { BlockObjectResponseWithChildren } from '$lib/notion-sdk/core/src/generic-db';
import type {
	IngredientLine,
	InstructionBlock,
	MenuCategoryGroup,
	MenuGrandCategoryGroup,
	MenuItemContext,
	MenuItemGroup,
	MenuItemSummary,
	RecipeDetail,
	RecipeMenuIndex,
	RecipeSummary
} from './recipes.types';

const textFromRichText = (items?: Array<{ plain_text?: string }>) =>
	items?.map((item) => item.plain_text ?? '').join('').trim() || undefined;

const formulaValue = (formula: any): string | number | boolean | undefined => {
	if (!formula) return undefined;
	if (formula.type === 'string') return formula.string ?? undefined;
	if (formula.type === 'number') return formula.number ?? undefined;
	if (formula.type === 'boolean') return formula.boolean ?? undefined;
	if (formula.type === 'date') return formula.date?.start ?? undefined;
	return undefined;
};

const rollupNumber = (rollup: any): number | undefined => {
	if (!rollup) return undefined;
	if (rollup.type === 'number') return rollup.number ?? undefined;
	if (rollup.type === 'array') {
		const numbers = rollup.array
			?.map((item: any) => formulaValue(item.formula) ?? item.number)
			.filter((value: unknown): value is number => typeof value === 'number');
		return numbers?.reduce((sum: number, value: number) => sum + value, 0);
	}
	return undefined;
};

const lineCostNumber = (line: RecipeLinesResponseDTO): number => {
	const value = formulaValue(line.properties.lineCost);
	return typeof value === 'number' ? value : 0;
};

const sumLineCosts = (lines: RecipeLinesResponseDTO[]): number | undefined => {
	if (!lines.length) return undefined;
	return lines.reduce((sum, line) => sum + lineCostNumber(line), 0);
};

let cogsMismatchWarnings = 0;

const chooseCogs = (recipe: RecipesResponseDTO, calculatedCogs?: number): number | undefined => {
	const notionCogs = rollupNumber(recipe.properties.cogs);
	if (calculatedCogs !== undefined) {
		if (notionCogs !== undefined && Math.abs(notionCogs - calculatedCogs) > 0.001 && cogsMismatchWarnings < 10) {
			cogsMismatchWarnings += 1;
			console.warn('recipes: Notion COGS rollup mismatch; using Recipe Lines total', {
				recipeId: recipe.id,
				recipeName: recipe.properties.name.text,
				notionCogs,
				calculatedCogs
			});
		}
		return calculatedCogs;
	}
	return notionCogs;
};

const fileUrl = (file: any): string | undefined => {
	if (!file) return undefined;
	if (file.type === 'external') return file.external?.url;
	if (file.type === 'file') return file.file?.url;
	return undefined;
};

const imageFromFiles = (files?: { urls: Array<string | undefined> }) => files?.urls.find(Boolean);

const blockToInstruction = (block: BlockObjectResponseWithChildren): InstructionBlock | null => {
	const data = (block as any)[(block as any).type] ?? {};
	const text = textFromRichText(data.rich_text ?? data.caption);
	const imageUrl = (block as any).type === 'image' ? fileUrl(data) : undefined;
	const children = block.children?.map(blockToInstruction).filter(Boolean) as InstructionBlock[] | undefined;

	if (!text && !imageUrl && (!children || children.length === 0)) return null;

	return {
		id: block.id,
		type: (block as any).type,
		text,
		level: (block as any).type === 'heading_1' ? 1 : (block as any).type === 'heading_2' ? 2 : (block as any).type === 'heading_3' ? 3 : undefined,
		checked: typeof data.checked === 'boolean' ? data.checked : undefined,
		imageUrl,
		children
	};
};

const fetchAllRecipeDtos = async (db: RecipesDatabase): Promise<RecipesResponseDTO[]> => {
	const results: RecipesQueryResponse['results'] = [];
	let cursor: string | undefined;

	do {
		const response = await db.query({
			page_size: 100,
			start_cursor: cursor,
			sorts: [{ property: 'name', direction: 'ascending' }]
		});
		results.push(...response.results);
		cursor = response.next_cursor ?? undefined;
	} while (cursor);

	return results.map((recipe) => new RecipesResponseDTO(recipe));
};

const fetchAllRecipeLineDtos = async (db: RecipeLinesDatabase): Promise<RecipeLinesResponseDTO[]> => {
	const results: RecipeLinesQueryResponse['results'] = [];
	let cursor: string | undefined;

	do {
		const response = await db.query({ page_size: 100, start_cursor: cursor });
		results.push(...response.results);
		cursor = response.next_cursor ?? undefined;
	} while (cursor);

	return results.map((line) => new RecipeLinesResponseDTO(line));
};

const fetchAllMenuItemDtos = async (db: MenuItemsDatabase): Promise<MenuItemsResponseDTO[]> => {
	const results: MenuItemsQueryResponse['results'] = [];
	let cursor: string | undefined;

	do {
		const response = await db.query({
			page_size: 100,
			start_cursor: cursor,
			sorts: [
				{ property: 'grandCategory', direction: 'ascending' },
				{ property: 'category', direction: 'ascending' },
				{ property: 'order', direction: 'ascending' },
				{ property: 'name', direction: 'ascending' }
			]
		});
		results.push(...response.results);
		cursor = response.next_cursor ?? undefined;
	} while (cursor);

	return results.map((item) => new MenuItemsResponseDTO(item));
};

const toSummary = (recipe: RecipesResponseDTO, calculatedCogs?: number): RecipeSummary => ({
	id: recipe.id,
	name: recipe.properties.name.text ?? 'Untitled recipe',
	thaiName: recipe.properties.thaiName.text,
	imageUrl: imageFromFiles(recipe.properties.image),
	cogs: chooseCogs(recipe, calculatedCogs),
	menuItemIds: recipe.properties.menuItemIds,
	lastEditedTime: recipe.lastEditedTime
});

const toMenuItemContext = (menuItem: MenuItemsResponseDTO): MenuItemContext => ({
	id: menuItem.id,
	name: menuItem.properties.name.text ?? 'Untitled menu item',
	thaiName: menuItem.properties.thaiName.text,
	description: menuItem.properties.description.text,
	thaiDescription: menuItem.properties.thaiDescription.text,
	price: menuItem.properties.price,
	category: menuItem.properties.category?.name,
	grandCategory: menuItem.properties.grandCategory?.name,
	status: menuItem.properties.status?.name,
	order: menuItem.properties.order,
	dietaryOptions: menuItem.properties.dietaryOptions.values,
	allergens: menuItem.properties.allergens.values,
	imageUrl: imageFromFiles(menuItem.properties.image)
});

const sortMenuItems = <T extends MenuItemContext>(items: T[]): T[] =>
	[...items].sort((a, b) => {
		const grand = (a.grandCategory ?? '').localeCompare(b.grandCategory ?? '');
		if (grand) return grand;
		const category = (a.category ?? '').localeCompare(b.category ?? '');
		if (category) return category;
		const order = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
		if (order) return order;
		return a.name.localeCompare(b.name);
	});

const groupMenuItems = (items: MenuItemContext[]): MenuItemGroup[] => {
	const groups = new Map<string, MenuItemContext[]>();
	for (const item of sortMenuItems(items)) {
		const category = item.category ?? item.grandCategory ?? 'Uncategorized';
		groups.set(category, [...(groups.get(category) ?? []), item]);
	}
	return Array.from(groups, ([category, groupedItems]) => ({ category, items: groupedItems }));
};

const groupMenuIndex = (items: MenuItemSummary[]): MenuGrandCategoryGroup[] => {
	const grandGroups = new Map<string, Map<string, MenuItemSummary[]>>();
	for (const item of sortMenuItems(items)) {
		const grandCategory = item.grandCategory ?? 'Other';
		const category = item.category ?? 'Uncategorized';
		if (!grandGroups.has(grandCategory)) grandGroups.set(grandCategory, new Map());
		const categoryGroups = grandGroups.get(grandCategory)!;
		categoryGroups.set(category, [...(categoryGroups.get(category) ?? []), item]);
	}

	return Array.from(grandGroups, ([grandCategory, categoryGroups]) => {
		const categories: MenuCategoryGroup[] = Array.from(categoryGroups, ([category, groupedItems]) => ({
			category,
			items: groupedItems,
			recipeCount: groupedItems.filter((item) => item.primaryRecipeId).length
		}));
		const totalItems = categories.reduce((sum, group) => sum + group.items.length, 0);
		const recipeCount = categories.reduce((sum, group) => sum + group.recipeCount, 0);
		return { grandCategory, categories, totalItems, recipeCount };
	});
};

const getRecipeSummariesFromDtos = (recipes: RecipesResponseDTO[], allRecipeLines: RecipeLinesResponseDTO[]): RecipeSummary[] => {
	const lineCostsById = new Map(allRecipeLines.map((line) => [line.id, lineCostNumber(line)]));
	return recipes.map((recipe) =>
		toSummary(
			recipe,
			recipe.properties.recipeLinesIds.length
				? recipe.properties.recipeLinesIds.reduce((sum, id) => sum + (lineCostsById.get(id) ?? 0), 0)
				: undefined
		)
	);
};

export const getRecipeSummariesData = async (): Promise<RecipeSummary[]> => {
	const recipesDb = new RecipesDatabase({ notionSecret: NOTION_API_KEY });
	const recipeLinesDb = new RecipeLinesDatabase({ notionSecret: NOTION_API_KEY });
	const [recipes, allRecipeLines] = await Promise.all([
		fetchAllRecipeDtos(recipesDb),
		fetchAllRecipeLineDtos(recipeLinesDb)
	]);

	return getRecipeSummariesFromDtos(recipes, allRecipeLines);
};

export const getRecipeMenuIndexData = async (): Promise<RecipeMenuIndex> => {
	const recipesDb = new RecipesDatabase({ notionSecret: NOTION_API_KEY });
	const recipeLinesDb = new RecipeLinesDatabase({ notionSecret: NOTION_API_KEY });
	const menuItemsDb = new MenuItemsDatabase({ notionSecret: NOTION_API_KEY });
	const [recipeDtos, allRecipeLines, menuItemDtos] = await Promise.all([
		fetchAllRecipeDtos(recipesDb),
		fetchAllRecipeLineDtos(recipeLinesDb),
		fetchAllMenuItemDtos(menuItemsDb)
	]);
	const recipes = getRecipeSummariesFromDtos(recipeDtos, allRecipeLines);
	const recipesByMenuItemId = new Map<string, RecipeSummary[]>();

	for (const recipe of recipes) {
		for (const menuItemId of recipe.menuItemIds) {
			recipesByMenuItemId.set(menuItemId, [...(recipesByMenuItemId.get(menuItemId) ?? []), recipe]);
		}
	}

	const menuItems: MenuItemSummary[] = menuItemDtos.map((dto) => {
		const linkedRecipes = recipesByMenuItemId.get(dto.id) ?? [];
		const primaryRecipe = linkedRecipes[0];
		return {
			...toMenuItemContext(dto),
			recipeIds: linkedRecipes.map((recipe) => recipe.id),
			recipeNames: linkedRecipes.map((recipe) => recipe.name),
			primaryRecipeId: primaryRecipe?.id,
			recipeCogs: primaryRecipe?.cogs
		};
	});

	return {
		recipes,
		menuGroups: groupMenuIndex(menuItems)
	};
};

export const getRecipeDetailData = async (recipeId: string): Promise<RecipeDetail | null> => {
	const recipesDb = new RecipesDatabase({ notionSecret: NOTION_API_KEY });
	const recipeLinesDb = new RecipeLinesDatabase({ notionSecret: NOTION_API_KEY });
	const ingredientsDb = new IngredientsDatabase({ notionSecret: NOTION_API_KEY });
	const menuItemsDb = new MenuItemsDatabase({ notionSecret: NOTION_API_KEY });

	const selectedDto = new RecipesResponseDTO(await recipesDb.getPage(recipeId));
	const lineDtos = await Promise.all(
		selectedDto.properties.recipeLinesIds.map(async (id) => new RecipeLinesResponseDTO(await recipeLinesDb.getPage(id)))
	);
	const selectedSummary = toSummary(selectedDto, sumLineCosts(lineDtos));

	const ingredientIds = Array.from(new Set(lineDtos.flatMap((line) => line.properties.ingredientIds)));
	const ingredientEntries = await Promise.all(
		ingredientIds.map(async (id) => [id, new IngredientsResponseDTO(await ingredientsDb.getPage(id))] as const)
	);
	const ingredientsById = new Map(ingredientEntries);

	const menuItems: MenuItemContext[] = await Promise.all(
		selectedDto.properties.menuItemIds.map(async (id) => toMenuItemContext(new MenuItemsResponseDTO(await menuItemsDb.getPage(id))))
	);

	const ingredientLines: IngredientLine[] = lineDtos.map((line) => {
		const ingredient = line.properties.ingredientIds[0]
			? ingredientsById.get(line.properties.ingredientIds[0])
			: undefined;
		return {
			id: line.id,
			name: line.properties.name.text ?? ingredient?.properties.name.text ?? 'Ingredient line',
			amount: line.properties.amount,
			unit: formulaValue(line.properties.unit) as string | undefined,
			lineCost: formulaValue(line.properties.lineCost) as number | undefined,
			ingredient: ingredient
				? {
						id: ingredient.id,
						name: ingredient.properties.name.text ?? 'Unnamed ingredient',
						thaiName: ingredient.properties.thaiName.text,
						unit: ingredient.properties.unit?.name,
						cost: ingredient.properties.cost,
						department: ingredient.properties.department.values,
						imageUrl: imageFromFiles(ingredient.properties.image)
					}
				: undefined
		};
	});

	const blocks = await recipesDb.getPageBlocks(selectedDto.id);

	return {
		...selectedSummary,
		instructionsText: selectedDto.properties.instructions.text,
		instructionBlocks: blocks.map(blockToInstruction).filter(Boolean) as InstructionBlock[],
		ingredientLines,
		menuItems,
		menuItemGroups: groupMenuItems(menuItems)
	};
};
