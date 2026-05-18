import { command, query } from '$app/server';
import * as v from 'valibot';
import {
	getRecipeDetailData,
	getRecipeMenuIndexData,
	getRecipeSummariesData,
	translateRecipeInstructionsData,
	updateRecipeInstructionsData
} from './recipes.server';

const RecipeIdSchema = v.object({
	recipeId: v.pipe(v.string(), v.trim(), v.minLength(1))
});

const TranslateInstructionsSchema = v.object({
	recipeId: v.pipe(v.string(), v.trim(), v.minLength(1)),
	direction: v.picklist(['english-to-thai', 'thai-to-english']),
	text: v.pipe(v.string(), v.minLength(1), v.maxLength(20000))
});

const UpdateInstructionsSchema = v.object({
	recipeId: v.pipe(v.string(), v.trim(), v.minLength(1)),
	language: v.picklist(['english', 'thai']),
	text: v.pipe(v.string(), v.maxLength(20000))
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

export const translateRecipeInstructions = command(TranslateInstructionsSchema, async ({ recipeId, direction, text }) => {
	return translateRecipeInstructionsData(recipeId, direction, text);
});

export const updateRecipeInstructions = command(UpdateInstructionsSchema, async ({ recipeId, language, text }) => {
	return updateRecipeInstructionsData(recipeId, language, text);
});
