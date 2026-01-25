import { query } from '$app/server';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { notionDatabaseQueryURL } from '$lib/notion-sdk/core/src/notion-urls';

const SUPPLIERS_DB_ID = '839a6083-9aaa-4cf7-add0-a8397534726a';

const SuppliersQuerySchema = v.object({
  search: v.optional(v.string())
});

type SupplierItem = {
  id: string;
  name: string;
};

function getTitleFromPage(page: Record<string, any>) {
  const props = page?.properties ?? {};
  for (const prop of Object.values(props) as Array<any>) {
    if (prop?.type === 'title') {
      return (prop.title ?? []).map((t: any) => t.plain_text).join('').trim();
    }
  }
  return '';
}

async function fetchSuppliers(search?: string): Promise<SupplierItem[]> {
  const headers = {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };

  const results: SupplierItem[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(notionDatabaseQueryURL(SUPPLIERS_DB_ID), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
        filter: search
          ? {
              property: 'Name',
              rich_text: { contains: search }
            }
          : undefined
      })
    });

    if (!res.ok) {
      console.error(await res.json());
      throw new Error(`suppliers: failed to query database ${SUPPLIERS_DB_ID}`);
    }

    const data = (await res.json()) as { results: Array<Record<string, any>>; has_more: boolean; next_cursor: string | null };
    for (const page of data.results) {
      const name = getTitleFromPage(page);
      if (!name) continue;
      results.push({ id: page.id, name });
    }
    hasMore = data.has_more;
    cursor = data.next_cursor ?? undefined;
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export const getSuppliers = query(SuppliersQuerySchema, async ({ search }) => {
  return fetchSuppliers(search?.trim());
});
