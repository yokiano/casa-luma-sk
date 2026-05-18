import { describe, expect, it } from 'vitest';
import {
	buildRecipeTranslationPrompt,
	normalizeReplicateOutput,
	RECIPE_TRANSLATION_SYSTEM_PROMPT,
	richTextChunks
} from './recipes.translation';

const ingredientLines = [
	{
		id: 'line-1',
		name: 'Ingredient line',
		ingredient: {
			id: 'ingredient-1',
			name: 'Coconut milk',
			thaiName: 'กะทิ',
			department: []
		}
	}
];

describe('recipe translation helpers', () => {
	it('builds a strict structure-preserving system prompt', () => {
		expect.assertions(3);
		expect(RECIPE_TRANSLATION_SYSTEM_PROMPT).toContain('Preserve the exact structure');
		expect(RECIPE_TRANSLATION_SYSTEM_PROMPT).toContain('Do not add, remove, reorder');
		expect(RECIPE_TRANSLATION_SYSTEM_PROMPT).toContain('Return plain text only');
	});

	it('includes recipe context and glossary in the translation prompt', () => {
		expect.assertions(4);
		const prompt = buildRecipeTranslationPrompt({
			direction: 'english-to-thai',
			text: '1. Warm coconut milk.',
			recipeName: 'Coconut Soup',
			thaiRecipeName: 'ต้มกะทิ',
			ingredientLines,
			menuItems: [{ id: 'menu-1', name: 'Coconut Soup', thaiName: 'ต้มกะทิ', dietaryOptions: [], allergens: [] }]
		});

		expect(prompt).toContain('English to Thai');
		expect(prompt).toContain('Coconut Soup / ต้มกะทิ');
		expect(prompt).toContain('Coconut milk = กะทิ');
		expect(prompt).toContain('1. Warm coconut milk.');
	});

	it('chunks rich text below Notion text limits while preserving content', () => {
		expect.assertions(3);
		const text = `${'a'.repeat(1200)}\n${'b'.repeat(1200)}\n${'c'.repeat(1200)}`;
		const chunks = richTextChunks(text, 1900);

		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks.every((chunk) => chunk.length <= 1900)).toBe(true);
		expect(chunks.join('')).toBe(text);
	});

	it('normalizes common Replicate output shapes', () => {
		expect.assertions(3);
		expect(normalizeReplicateOutput(' translated ')).toBe('translated');
		expect(normalizeReplicateOutput(['trans', 'lated'])).toBe('translated');
		expect(normalizeReplicateOutput({ text: ' translated ' })).toBe('translated');
	});
});
