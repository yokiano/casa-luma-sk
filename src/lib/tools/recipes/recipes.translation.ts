import type { IngredientLine, MenuItemContext } from './recipes.types';

export type TranslationDirection = 'english-to-thai' | 'thai-to-english';
export type InstructionLanguage = 'english' | 'thai';

const directionLabels: Record<TranslationDirection, { source: string; target: string }> = {
	'english-to-thai': { source: 'English', target: 'Thai' },
	'thai-to-english': { source: 'Thai', target: 'English' }
};

export const RECIPE_TRANSLATION_SYSTEM_PROMPT = `You are translating Casa Luma kitchen recipe instructions between English and Thai.
Translate only the provided recipe-instruction text. Do not add commentary.
Preserve the exact structure: same headings, numbering, bullet points, blank lines, punctuation style where possible, quantities, temperatures, timers, and line breaks.
Do not add, remove, reorder, summarize, or invent steps.
Use established kitchen/cooking terminology and the provided Casa Luma names/glossary when relevant.
If a dish name, brand, ingredient, or kitchen term has no natural Thai equivalent, keep concise inline English where it makes sense.
Return plain text only.`;

export function buildRecipeTranslationPrompt(opts: {
	direction: TranslationDirection;
	text: string;
	recipeName: string;
	thaiRecipeName?: string;
	ingredientLines?: IngredientLine[];
	menuItems?: MenuItemContext[];
}) {
	const labels = directionLabels[opts.direction];
	const glossary = buildRecipeGlossary(opts.ingredientLines ?? [], opts.menuItems ?? []);
	const names = [opts.recipeName, opts.thaiRecipeName].filter(Boolean).join(' / ');

	return [
		`Translate this recipe instruction text from ${labels.source} to ${labels.target}.`,
		`Recipe: ${names}`,
		glossary ? `Casa Luma glossary/names to respect:\n${glossary}` : undefined,
		'Rules: preserve structure exactly; translate text only; keep measurements, ingredient amounts, temperatures, and timing unchanged; output only the translated instructions.',
		'Instruction text:',
		opts.text
	]
		.filter(Boolean)
		.join('\n\n');
}

export function buildRecipeGlossary(ingredientLines: IngredientLine[], menuItems: MenuItemContext[]) {
	const entries = new Set<string>();
	for (const line of ingredientLines) {
		const english = line.ingredient?.name ?? line.name;
		const thai = line.ingredient?.thaiName;
		if (english && thai) entries.add(`- ${english} = ${thai}`);
		else if (english) entries.add(`- ${english}`);
	}
	for (const item of menuItems) {
		if (item.name && item.thaiName) entries.add(`- ${item.name} = ${item.thaiName}`);
	}
	return Array.from(entries).join('\n');
}

export function richTextChunks(text: string, chunkSize = 1900) {
	if (!text) return [];
	const chunks: string[] = [];
	let remaining = text;

	while (remaining.length > chunkSize) {
		const breakAt = Math.max(
			remaining.lastIndexOf('\n', chunkSize),
			remaining.lastIndexOf('. ', chunkSize),
			remaining.lastIndexOf(' ', chunkSize)
		);
		const index = breakAt > chunkSize * 0.5 ? breakAt + (remaining[breakAt] === '\n' ? 1 : 0) : chunkSize;
		chunks.push(remaining.slice(0, index));
		remaining = remaining.slice(index);
	}

	chunks.push(remaining);
	return chunks;
}

export function normalizeReplicateOutput(output: unknown) {
	if (typeof output === 'string') return output.trim();
	if (Array.isArray(output)) return output.map((part) => (typeof part === 'string' ? part : '')).join('').trim();
	if (output && typeof output === 'object' && 'text' in output && typeof output.text === 'string') return output.text.trim();
	return '';
}
