import { NOTION_API_KEY } from '$env/static/private';
import { SuppliersDatabase } from '$lib/notion-sdk/dbs/suppliers/db';
import { SuppliersPatchDTO } from '$lib/notion-sdk/dbs/suppliers/patch.dto';
import { SuppliersResponseDTO } from '$lib/notion-sdk/dbs/suppliers/response.dto';

export type SupplierItem = {
	id: string;
	name: string;
};

export async function getSuppliersData(search?: string): Promise<SupplierItem[]> {
	const db = new SuppliersDatabase({ notionSecret: NOTION_API_KEY });
	const allResults: any[] = [];
	let startCursor: string | undefined = undefined;

	while (true) {
		const response = (await db.query({
			filter: search
				? {
						name: { contains: search }
					}
				: undefined,
			sorts: [{ property: 'name', direction: 'ascending' }],
			page_size: 100,
			start_cursor: startCursor
		})) as any;

		allResults.push(...(response.results ?? []));
		if (!response.has_more || !response.next_cursor) break;
		startCursor = response.next_cursor;
	}

	return allResults.map((page) => {
		const dto = new SuppliersResponseDTO(page);
		return {
			id: page.id,
			name: dto.properties.name?.text || 'Unnamed Supplier'
		};
	});
}

export async function createSupplierData(name: string): Promise<SupplierItem> {
	const db = new SuppliersDatabase({ notionSecret: NOTION_API_KEY });
	const response = await db.createPage(
		new SuppliersPatchDTO({
			properties: {
				name
			}
		})
	);

	return { id: response.id, name };
}
