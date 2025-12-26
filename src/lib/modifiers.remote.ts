import { query } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { PosModifiersDatabase, PosModifiersResponseDTO } from '$lib/notion-sdk/dbs/pos-modifiers';
import type { MenuModifier, MenuModifierOption } from '$lib/types/menu';

const parseOptions = (jsonString?: string): MenuModifierOption[] => {
	if (!jsonString) return [];
	try {
		const parsed = JSON.parse(jsonString);
		if (Array.isArray(parsed)) {
			return parsed.map((o: any) => ({
				name: o.name || '',
				price: Number(o.price) || 0
			}));
		}
		return [];
	} catch (e) {
		console.error('Failed to parse options JSON:', e);
		return [];
	}
};

export const getActiveModifiers = query(async (): Promise<Map<string, MenuModifier>> => {
	const notionDb = new PosModifiersDatabase({ notionSecret: NOTION_API_KEY });
	
	const result = await notionDb.query({
		filter: {
			active: { equals: true }
		}
	});

	const modifiers = new Map<string, MenuModifier>();

	for (const page of result.results) {
		const dto = new PosModifiersResponseDTO(page);
		const name = dto.properties.name.text || 'Untitled';
		const options = parseOptions(dto.properties.optionsJson.text);

		modifiers.set(page.id, {
			id: page.id,
			name,
			options
		});
	}

	return modifiers;
});

