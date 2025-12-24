import { command } from '$app/server';
import * as v from 'valibot';

import { REPLICATE_MODELS } from '$lib/constants';
import { generateImage } from '$lib/server/replicate';

const GenerateGraphicsImageSchema = v.object({
	prompt: v.pipe(v.string(), v.trim(), v.minLength(8, 'Prompt must be at least 8 characters')),
	model: v.optional(v.string()),
	aspectRatio: v.optional(v.pipe(v.string(), v.trim())),
	negativePrompt: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(400))),
	guidanceScale: v.optional(v.number('Guidance scale must be a number')),
	seed: v.optional(v.number())
});

export const generateGraphicsImage = command(GenerateGraphicsImageSchema, async (input) => {
	const result = await generateImage({
		prompt: input.prompt,
		model: input.model || REPLICATE_MODELS.IMAGEN_4_FAST,
		aspectRatio: input.aspectRatio,
		negativePrompt: input.negativePrompt,
		guidanceScale: input.guidanceScale,
		seed: input.seed
	});

	return {
		imageUrl: result.imageUrl,
		predictionId: result.predictionId,
		attempts: result.attempts,
		output: result.output
	};
});



