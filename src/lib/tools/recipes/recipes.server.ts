import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { RecipesDatabase, RecipesPatchDTO, RecipesResponseDTO, type RecipesQueryResponse } from '$lib/notion-sdk/dbs/recipes';
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
import {
	buildRecipeTranslationPrompt,
	normalizeReplicateOutput,
	RECIPE_TRANSLATION_SYSTEM_PROMPT,
	richTextChunks,
	type InstructionLanguage,
	type TranslationDirection
} from './recipes.translation';

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
const notionIdKey = (id: string) => id.replaceAll('-', '').toLowerCase();

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
			filter: { status: { equals: 'Active' } },
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

const toSummary = (recipe: RecipesResponseDTO, calculatedCogs?: number, hasInstructionsOverride?: boolean): RecipeSummary => {
	const hasIngredientLines = recipe.properties.recipeLinesIds.length > 0;
	const hasInstructions = hasInstructionsOverride ?? Boolean(recipe.properties.instructions.text?.trim());
	return {
		id: recipe.id,
		name: recipe.properties.name.text ?? 'Untitled recipe',
		thaiName: recipe.properties.thaiName.text,
		imageUrl: imageFromFiles(recipe.properties.image),
		cogs: chooseCogs(recipe, calculatedCogs),
		menuItemIds: recipe.properties.menuItemIds,
		hasIngredientLines,
		hasInstructions,
		isComplete: hasIngredientLines && hasInstructions,
		lastEditedTime: recipe.lastEditedTime
	};
};

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
			recipeCount: groupedItems.filter((item) => item.recipeStatus === 'complete').length
		}));
		const totalItems = categories.reduce((sum, group) => sum + group.items.length, 0);
		const recipeCount = categories.reduce((sum, group) => sum + group.recipeCount, 0);
		return { grandCategory, categories, totalItems, recipeCount };
	});
};

const getInstructionCompleteness = async (recipesDb: RecipesDatabase, recipes: RecipesResponseDTO[]): Promise<Map<string, boolean>> => {
	const entries = await Promise.all(
		recipes.map(async (recipe) => {
			if (recipe.properties.instructions.text?.trim()) return [recipe.id, true] as const;
			const blocks = await recipesDb.getPageBlocks(recipe.id);
			return [recipe.id, blocks.map(blockToInstruction).some(Boolean)] as const;
		})
	);
	return new Map(entries);
};

const getRecipeSummariesFromDtos = (
	recipes: RecipesResponseDTO[],
	allRecipeLines: RecipeLinesResponseDTO[],
	instructionsByRecipeId = new Map<string, boolean>()
): RecipeSummary[] => {
	const lineCostsById = new Map(allRecipeLines.map((line) => [line.id, lineCostNumber(line)]));
	return recipes.map((recipe) =>
		toSummary(
			recipe,
			recipe.properties.recipeLinesIds.length
				? recipe.properties.recipeLinesIds.reduce((sum, id) => sum + (lineCostsById.get(id) ?? 0), 0)
				: undefined,
			instructionsByRecipeId.get(recipe.id)
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

	const instructionsByRecipeId = await getInstructionCompleteness(recipesDb, recipes);
	return getRecipeSummariesFromDtos(recipes, allRecipeLines, instructionsByRecipeId);
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
	const instructionsByRecipeId = await getInstructionCompleteness(recipesDb, recipeDtos);
	const recipes = getRecipeSummariesFromDtos(recipeDtos, allRecipeLines, instructionsByRecipeId);
	const recipesByMenuItemId = new Map<string, RecipeSummary[]>();

	for (const recipe of recipes) {
		for (const menuItemId of recipe.menuItemIds) {
			const key = notionIdKey(menuItemId);
			recipesByMenuItemId.set(key, [...(recipesByMenuItemId.get(key) ?? []), recipe]);
		}
	}

	const menuItems: MenuItemSummary[] = menuItemDtos.map((dto) => {
		const linkedRecipes = recipesByMenuItemId.get(notionIdKey(dto.id)) ?? [];
		const primaryRecipe = linkedRecipes.find((recipe) => recipe.isComplete) ?? linkedRecipes[0];
		return {
			...toMenuItemContext(dto),
			recipeIds: linkedRecipes.map((recipe) => recipe.id),
			recipeNames: linkedRecipes.map((recipe) => recipe.name),
			primaryRecipeId: primaryRecipe?.id,
			recipeCogs: primaryRecipe?.cogs,
			recipeStatus: linkedRecipes.some((recipe) => recipe.isComplete)
				? 'complete'
				: linkedRecipes.length
					? 'incomplete'
					: 'missing'
		};
	});

	return {
		recipes,
		menuGroups: groupMenuIndex(menuItems)
	};
};

const NOTION_API_KEY = env.NOTION_API_KEY ?? '';
const REPLICATE_MODEL = env.REPLICATE_TRANSLATION_MODEL || 'meta/meta-llama-3-8b-instruct';
const REPLICATE_API_URL = 'https://api.replicate.com/v1';

const createRichText = (text: string) => richTextChunks(text).map((content) => ({ type: 'text' as const, text: { content } }));

const getReplicatePredictionOutput = async (prediction: any) => {
	let current = prediction;
	for (let i = 0; i < 20; i += 1) {
		if (current.status === 'succeeded') return normalizeReplicateOutput(current.output);
		if (current.status === 'failed' || current.status === 'canceled' || current.status === 'aborted') {
			throw error(502, { message: current.error || 'Replicate translation failed' });
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const response = await fetch(`${REPLICATE_API_URL}/predictions/${current.id}`, {
			headers: { Authorization: `Bearer ${env.REPLICATE_API_KEY}` }
		});
		if (!response.ok) throw error(502, { message: 'Could not poll Replicate translation' });
		current = await response.json();
	}
	throw error(504, { message: 'Replicate translation timed out' });
};

const runReplicateTranslation = async (prompt: string) => {
	if (!env.REPLICATE_API_KEY) throw error(500, { message: 'REPLICATE_API_KEY is not configured' });
	const response = await fetch(`${REPLICATE_API_URL}/models/${REPLICATE_MODEL}/predictions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.REPLICATE_API_KEY}`,
			'Content-Type': 'application/json',
			Prefer: 'wait=60'
		},
		body: JSON.stringify({
			input: {
				prompt,
				system_prompt: RECIPE_TRANSLATION_SYSTEM_PROMPT,
				temperature: 0.1,
				max_new_tokens: 4096,
				prompt_template:
					'<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n'
			}
		})
	});
	if (!response.ok) {
		const message = await response.text().catch(() => '');
		console.error('recipes: Replicate translation request failed', { status: response.status, model: REPLICATE_MODEL, message });
		throw error(502, {
			message: `Could not start Replicate translation with ${REPLICATE_MODEL}. ${message || `HTTP ${response.status}`}`
		});
	}
	const prediction = await response.json();
	const translatedText = await getReplicatePredictionOutput(prediction);
	if (!translatedText) throw error(502, { message: 'Replicate returned an empty translation' });
	return translatedText;
};

export const translateRecipeInstructionsData = async (recipeId: string, direction: TranslationDirection, sourceTextOverride?: string) => {
	const detail = await getRecipeDetailData(recipeId);
	if (!detail) throw error(404, { message: 'Recipe not found' });

	const sourceText = sourceTextOverride ?? (direction === 'english-to-thai' ? detail.instructionsText : detail.thaiInstructionsText);
	if (!sourceText?.trim()) {
		throw error(400, { message: direction === 'english-to-thai' ? 'No English instructions to translate' : 'No Thai instructions to translate' });
	}

	const translatedText = await runReplicateTranslation(
		buildRecipeTranslationPrompt({
			direction,
			text: sourceText,
			recipeName: detail.name,
			thaiRecipeName: detail.thaiName,
			ingredientLines: detail.ingredientLines,
			menuItems: detail.menuItems
		})
	);

	return { recipeId, direction, translatedText };
};

export const updateRecipeInstructionsData = async (recipeId: string, language: InstructionLanguage, text: string) => {
	const db = new RecipesDatabase({ notionSecret: NOTION_API_KEY });
	await db.updatePage(
		recipeId,
		new RecipesPatchDTO({
			properties: language === 'english' ? { instructions: createRichText(text) } : { thaiInstructions: createRichText(text) }
		})
	);
	return { success: true, recipeId, language };
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

	const menuItems: MenuItemContext[] = (
		await Promise.all(
			selectedDto.properties.menuItemIds.map(async (id) => toMenuItemContext(new MenuItemsResponseDTO(await menuItemsDb.getPage(id))))
		)
	).filter((item) => item.status === 'Active');

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
	const instructionBlocks = blocks.map(blockToInstruction).filter(Boolean) as InstructionBlock[];
	const hasInstructions = Boolean(selectedDto.properties.instructions.text?.trim()) || instructionBlocks.length > 0;
	const hasIngredientLines = ingredientLines.length > 0;

	return {
		...selectedSummary,
		hasIngredientLines,
		hasInstructions,
		isComplete: hasIngredientLines && hasInstructions,
		instructionsText: selectedDto.properties.instructions.text,
		thaiInstructionsText: selectedDto.properties.thaiInstructions.text,
		instructionBlocks,
		ingredientLines,
		menuItems,
		menuItemGroups: groupMenuItems(menuItems)
	};
};
