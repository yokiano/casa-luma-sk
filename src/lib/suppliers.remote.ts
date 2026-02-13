import { query, command } from '$app/server';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { SuppliersDatabase } from '$lib/notion-sdk/dbs/suppliers/db';
import { SuppliersResponseDTO } from '$lib/notion-sdk/dbs/suppliers/response.dto';
import { SuppliersPatchDTO } from '$lib/notion-sdk/dbs/suppliers/patch.dto';

const SuppliersQuerySchema = v.object({
  search: v.optional(v.string())
});

type SupplierItem = {
  id: string;
  name: string;
};

async function fetchSuppliers(search?: string): Promise<SupplierItem[]> {
  const db = new SuppliersDatabase({ notionSecret: NOTION_API_KEY });
  const allResults: any[] = [];
  let startCursor: string | undefined = undefined;

  while (true) {
    const response = (await db.query({
      filter: search ? {
        name: { contains: search }
      } : undefined,
      sorts: [{ property: 'name', direction: 'ascending' }],
      page_size: 100,
      start_cursor: startCursor
    })) as any;

    allResults.push(...(response.results ?? []));
    if (!response.has_more || !response.next_cursor) break;
    startCursor = response.next_cursor;
  }

  return allResults.map(page => {
    const dto = new SuppliersResponseDTO(page);
    return {
      id: page.id,
      name: dto.properties.name?.text || 'Unnamed Supplier'
    };
  });
}

export const getSuppliers = query(SuppliersQuerySchema, async ({ search }) => {
  return fetchSuppliers(search?.trim());
});

export const createSupplier = command(
  v.object({
    name: v.string()
  }),
  async ({ name }) => {
    const db = new SuppliersDatabase({ notionSecret: NOTION_API_KEY });
    const response = await db.createPage(
      new SuppliersPatchDTO({
        properties: {
          name: name
        }
      })
    );
    return { id: response.id, name };
  }
);
