import { query } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { PosModifiersDatabase, PosModifiersResponseDTO } from '$lib/notion-sdk/dbs/pos-modifiers';
import type { MenuModifier, MenuModifierOption } from '$lib/types/menu';

const parseOptions = (jsonString?: string): MenuModifierOption[] => {
	if (!jsonString) return [];
	try {
		const parsed = JSON.parse(jsonString);
		if (Array.isArray(parsed)) {
			return parsed
				.map((o: any) => ({
					name: o?.name || '',
					thaiName: o?.name_th || undefined,
					position: typeof o?.position === 'number' ? o.position : Number(o?.position) || 0,
					price: Number(o?.price) || 0
				}))
				.filter((o: MenuModifierOption) => !!o.name)
				.sort((a, b) => {
					if ((a.position ?? 0) !== (b.position ?? 0)) return (a.position ?? 0) - (b.position ?? 0);
					return a.name.localeCompare(b.name);
				});
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
		const position = typeof dto.properties.position === 'number' ? dto.properties.position : undefined;

		modifiers.set(page.id, {
			id: page.id,
			name,
			position,
			options
		});
	}

	return modifiers;
});

