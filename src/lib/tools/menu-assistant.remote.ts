import { command } from '$app/server';
import * as v from 'valibot';

import { generateImagen4Fast } from '$lib/server/replicate';
import { updateMenuItemVisuals } from '$lib/server/notion/menu';

const GenerateInputSchema = v.object({
	prompt: v.pipe(v.string(), v.trim(), v.minLength(8, 'Prompt must be at least 8 characters')),
	aspectRatio: v.optional(v.pipe(v.string(), v.trim())),
	negativePrompt: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(400))),
	guidanceScale: v.optional(v.number('Guidance scale must be a number')),
	seed: v.optional(v.number())
});

export const generateMenuImage = command(GenerateInputSchema, async (input) => {
	const result = await generateImagen4Fast({
		prompt: input.prompt,
		aspectRatio: input.aspectRatio,
		negativePrompt: input.negativePrompt,
		guidanceScale: input.guidanceScale,
		seed: input.seed
	});

	return {
		imageUrl: result.imageUrl,
		predictionId: result.predictionId,
		attempts: result.attempts
	};
});

const UpdateImageSchema = v.object({
	id: v.pipe(v.string(), v.trim(), v.minLength(1, 'Menu item id is required')),
	imageUrl: v.pipe(v.string(), v.trim(), v.url('Provide a valid image URL')),
	gallery: v.optional(v.array(v.pipe(v.string(), v.trim(), v.url('Gallery entry must be a URL'))))
});

export const updateMenuItemImage = command(UpdateImageSchema, async ({ id, imageUrl, gallery }) => {
	await updateMenuItemVisuals({
		id,
		imageUrl,
		gallery
	});

	return { success: true } as const;
});


