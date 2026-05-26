import { RecipesDatabase } from '$lib/notion-sdk/dbs/recipes/db';
import { RecipesResponseDTO } from '$lib/notion-sdk/dbs/recipes/response.dto';
import type { RecipesQueryResponse } from '$lib/notion-sdk/dbs/recipes/types';
import { RecipeLinesDatabase } from '$lib/notion-sdk/dbs/recipe-lines/db';
import { RecipeLinesResponseDTO } from '$lib/notion-sdk/dbs/recipe-lines/response.dto';
import type { RecipeLinesQueryResponse } from '$lib/notion-sdk/dbs/recipe-lines/types';

export type RecipeCogsSource = 'recipe-lines' | 'recipe-rollup';

export interface RecipeCogsInfo {
	menuItemId: string;
	recipeId: string;
	recipeName: string;
	cogs: number;
	source: RecipeCogsSource;
	recipeLineCount: number;
	isComplete: boolean;
	warning?: string;
}

export const notionIdKey = (id: string) => id.replaceAll('-', '').toLowerCase();

export const formulaValue = (formula: any): string | number | boolean | undefined => {
	if (!formula) return undefined;
	if (formula.type === 'string') return formula.string ?? undefined;
	if (formula.type === 'number') return formula.number ?? undefined;
	if (formula.type === 'boolean') return formula.boolean ?? undefined;
	if (formula.type === 'date') return formula.date?.start ?? undefined;
	return undefined;
};

export const rollupNumber = (rollup: any): number | undefined => {
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

export const lineCostNumber = (line: RecipeLinesResponseDTO): number => {
	const value = formulaValue(line.properties.lineCost);
	return typeof value === 'number' ? value : 0;
};

export const sumLineCosts = (lines: RecipeLinesResponseDTO[]): number | undefined => {
	if (!lines.length) return undefined;
	return lines.reduce((sum, line) => sum + lineCostNumber(line), 0);
};

export const chooseRecipeCogs = (recipe: RecipesResponseDTO, calculatedCogs?: number): number | undefined => {
	if (calculatedCogs !== undefined) return calculatedCogs;
	return rollupNumber(recipe.properties.cogs);
};

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const isUsableCogs = (value: number | undefined): value is number =>
	typeof value === 'number' && Number.isFinite(value) && value > 0;

const hasInstructions = (recipe: RecipesResponseDTO) =>
	Boolean(recipe.properties.instructions.text?.trim() || recipe.properties.thaiInstructions.text?.trim());

const toRecipeCogsInfo = (recipe: RecipesResponseDTO, recipeLinesById: Map<string, RecipeLinesResponseDTO>): Omit<RecipeCogsInfo, 'menuItemId'> | undefined => {
	const lines = recipe.properties.recipeLinesIds
		.map((id) => recipeLinesById.get(notionIdKey(id)))
		.filter((line): line is RecipeLinesResponseDTO => Boolean(line));
	const calculatedCogs = sumLineCosts(lines);
	const rollupCogs = rollupNumber(recipe.properties.cogs);
	const cogs = chooseRecipeCogs(recipe, calculatedCogs);
	const source: RecipeCogsSource | undefined = calculatedCogs !== undefined ? 'recipe-lines' : rollupCogs !== undefined ? 'recipe-rollup' : undefined;

	if (!isUsableCogs(cogs) || !source) return undefined;

	return {
		recipeId: recipe.id,
		recipeName: recipe.properties.name.text ?? 'Untitled recipe',
		cogs: roundMoney(cogs),
		source,
		recipeLineCount: lines.length,
		isComplete: recipe.properties.recipeLinesIds.length > 0 && hasInstructions(recipe)
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
		const response = await db.query({
			page_size: 100,
			start_cursor: cursor
		});
		results.push(...response.results);
		cursor = response.next_cursor ?? undefined;
	} while (cursor);

	return results.map((line) => new RecipeLinesResponseDTO(line));
};

export const buildMenuItemRecipeCogsMap = async (
	recipesDb: RecipesDatabase,
	recipeLinesDb: RecipeLinesDatabase
): Promise<Map<string, RecipeCogsInfo>> => {
	const [recipes, recipeLines] = await Promise.all([fetchAllRecipeDtos(recipesDb), fetchAllRecipeLineDtos(recipeLinesDb)]);
	const recipeLinesById = new Map(recipeLines.map((line) => [notionIdKey(line.id), line]));
	const recipesByMenuItemId = new Map<string, Array<Omit<RecipeCogsInfo, 'menuItemId'>>>();

	for (const recipe of recipes) {
		const cogsInfo = toRecipeCogsInfo(recipe, recipeLinesById);
		if (!cogsInfo) continue;

		for (const menuItemId of recipe.properties.menuItemIds) {
			const key = notionIdKey(menuItemId);
			recipesByMenuItemId.set(key, [...(recipesByMenuItemId.get(key) ?? []), cogsInfo]);
		}
	}

	const cogsByMenuItemId = new Map<string, RecipeCogsInfo>();
	for (const [menuItemId, linkedRecipes] of recipesByMenuItemId) {
		const chosen = linkedRecipes.find((recipe) => recipe.isComplete) ?? linkedRecipes[0];
		const warning =
			linkedRecipes.length > 1
				? `Multiple linked recipes have COGS; using "${chosen.recipeName}" (${linkedRecipes.length} recipes found)`
				: undefined;
		cogsByMenuItemId.set(menuItemId, { ...chosen, menuItemId, warning });
	}

	return cogsByMenuItemId;
};
