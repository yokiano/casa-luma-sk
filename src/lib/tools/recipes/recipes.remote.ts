import { query } from '$app/server';
import * as v from 'valibot';
import { getRecipeDetailData, getRecipeMenuIndexData, getRecipeSummariesData } from './recipes.server';

const RecipeIdSchema = v.object({
	recipeId: v.pipe(v.string(), v.trim(), v.minLength(1))
});

export const getRecipeSummaries = query(async () => {
	return getRecipeSummariesData();
});

export const getRecipeMenuIndex = query(async () => {
	return getRecipeMenuIndexData();
});

export const getRecipeDetail = query(RecipeIdSchema, async ({ recipeId }) => {
	return getRecipeDetailData(recipeId);
});
